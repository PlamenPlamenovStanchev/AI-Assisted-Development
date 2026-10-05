import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { shiftDate, weekFor, dateInTimezone } from './calendar.mjs';

export class InputError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}
const assert = (condition, message, status) => { if (!condition) throw new InputError(message, status); };
function text(value, max, required = false) {
  assert(typeof value === 'string', 'Please enter text.');
  value = value.trim();
  assert(value.length <= max && (!required || value.length > 0), `Please enter ${required ? '1–' : 'up to '}${max} characters.`);
  return value;
}
function date(value) {
  if (!value) return null;
  assert(typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value, 'Please choose a valid date.');
  return value;
}
const colors = ['sage', 'violet', 'peach', 'blue'];

// This synchronous connection only runs inside a dedicated worker in the app.
export function createStore(filename) {
  if (filename !== ':memory:') mkdirSync(dirname(filename), { recursive: true });
  const db = new DatabaseSync(filename);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS projects (id TEXT PRIMARY KEY, name TEXT NOT NULL, color TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS goals (id TEXT PRIMARY KEY, title TEXT NOT NULL, notes TEXT NOT NULL DEFAULT '', target_date TEXT, created_at TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 1);
    CREATE TABLE IF NOT EXISTS tasks (id TEXT PRIMARY KEY, title TEXT NOT NULL, notes TEXT NOT NULL DEFAULT '', due_date TEXT, priority TEXT NOT NULL CHECK(priority IN ('low','medium','high')), project_id TEXT REFERENCES projects(id) ON DELETE SET NULL, goal_id TEXT REFERENCES goals(id) ON DELETE SET NULL, completed INTEGER NOT NULL DEFAULT 0 CHECK(completed IN (0,1)), completed_at TEXT, created_at TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 1);
    CREATE INDEX IF NOT EXISTS tasks_due ON tasks(completed, due_date);
    CREATE INDEX IF NOT EXISTS tasks_project ON tasks(project_id, completed);
    CREATE INDEX IF NOT EXISTS tasks_goal ON tasks(goal_id, completed);
    CREATE INDEX IF NOT EXISTS tasks_completed_at ON tasks(completed, completed_at);
    PRAGMA user_version=1;`);
  function transaction(fn) {
    db.exec('BEGIN IMMEDIATE');
    try { const result = fn(); db.exec('COMMIT'); return result; }
    catch (error) { db.exec('ROLLBACK'); throw error; }
  }
  function reference(table, id) {
    if (id === null || id === undefined || id === '') return null;
    assert(typeof id === 'string' && db.prepare(`SELECT id FROM ${table} WHERE id=?`).get(id), `This ${table === 'goals' ? 'goal' : 'project'} no longer exists.`);
    return id;
  }
  function taskData(input) {
    assert(['low', 'medium', 'high'].includes(input.priority || 'low'), 'Choose a valid priority.');
    return { title: text(input.title, 200, true), notes: text(input.notes ?? '', 5000), due_date: date(input.due_date), priority: input.priority || 'low', project_id: reference('projects', input.project_id), goal_id: reference('goals', input.goal_id) };
  }
  function createTask(input) {
    const t = taskData(input); const id = randomUUID();
    const completed = input.completed ?? 0;
    assert(completed === 0 || completed === 1, 'Invalid completion status.');
    const now = new Date().toISOString();
    db.prepare('INSERT INTO tasks(id,title,notes,due_date,priority,project_id,goal_id,created_at,completed,completed_at) VALUES (?,?,?,?,?,?,?,?,?,?)').run(id, t.title, t.notes, t.due_date, t.priority, t.project_id, t.goal_id, now, completed, completed ? now : null);
    return db.prepare('SELECT * FROM tasks WHERE id=?').get(id);
  }
  function listTasks(q) {
    const where = []; const args = [];
    const today = date(q.today) || new Date().toISOString().slice(0, 10);
    const status = q.view === 'completed' ? 'completed' : q.status || (q.view === 'all' ? 'all' : 'active');
    assert(['all', 'active', 'completed'].includes(status), 'Choose a valid status filter.');
    assert(!q.due || ['today', 'week', 'overdue'].includes(q.due), 'Choose a valid due date filter.');
    assert(!q.priority || ['low', 'medium', 'high'].includes(q.priority), 'Choose a valid priority filter.');
    if (status !== 'all') { where.push('t.completed=?'); args.push(status === 'completed' ? 1 : 0); }
    if (q.view === 'today') { where.push('t.due_date=?'); args.push(today); }
    if (q.view === 'upcoming') { where.push('t.due_date>?'); args.push(today); }
    if (q.view === 'inbox') where.push('t.project_id IS NULL');
    if (q.due === 'today') { where.push('t.due_date=?'); args.push(today); }
    if (q.due === 'week') { const week = weekFor(today); where.push('t.due_date BETWEEN ? AND ?'); args.push(week.start, week.end); }
    if (q.due === 'overdue') { where.push('t.due_date<? AND t.completed=0'); args.push(today); }
    for (const key of ['project_id', 'goal_id', 'priority']) if (q[key]) { where.push(`t.${key}=?`); args.push(q[key]); }
    if (q.search) { where.push("(t.title LIKE ? ESCAPE '!' OR t.notes LIKE ? ESCAPE '!')"); const s = `%${text(q.search, 200).replace(/[!%_]/g, '!$&')}%`; args.push(s, s); }
    const filter = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const total = db.prepare(`SELECT COUNT(*) AS n FROM tasks t ${filter}`).get(...args).n;
    const offset = Math.max(0, Math.min(Math.floor(Number(q.offset) || 0), 10000000));
    const limit = 40;
    const order = q.sort === 'priority' ? "CASE t.priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END, t.due_date IS NULL, t.due_date" : q.sort === 'newest' ? 't.created_at DESC' : 't.due_date IS NULL, t.due_date, t.created_at';
    const tasks = db.prepare(`SELECT t.*, p.name AS project_name, p.color AS project_color, g.title AS goal_title FROM tasks t LEFT JOIN projects p ON p.id=t.project_id LEFT JOIN goals g ON g.id=t.goal_id ${filter} ORDER BY ${order}, t.id LIMIT ? OFFSET ?`).all(...args, limit, offset);
    return { tasks, total, offset, limit };
  }
  function dashboard(q) {
    const today = date(q.today) || new Date().toISOString().slice(0, 10);
    const stats = db.prepare(`SELECT COUNT(*) AS total, COALESCE(SUM(completed=0),0) AS active, COALESCE(SUM(completed=0 AND due_date=?),0) AS today, COALESCE(SUM(completed=0 AND due_date<?),0) AS overdue, COALESCE(SUM(completed=0 AND due_date>?),0) AS upcoming, COALESCE(SUM(completed=0 AND project_id IS NULL),0) AS inbox, COALESCE(SUM(completed=1),0) AS completed, COALESCE(SUM(completed=1 AND due_date=?),0) AS today_done FROM tasks`).get(today, today, today, today);
    const projects = db.prepare('SELECT p.*, COUNT(t.id) AS total, COALESCE(SUM(t.completed=1),0) AS done FROM projects p LEFT JOIN tasks t ON t.project_id=p.id GROUP BY p.id ORDER BY p.created_at, p.id').all().map(p => ({ ...p, completion_rate: p.total ? Math.round(p.done / p.total * 100) : 0 }));
    const goals = db.prepare('SELECT g.*, COUNT(t.id) AS total, COALESCE(SUM(t.completed=1),0) AS done FROM goals g LEFT JOIN tasks t ON t.goal_id=g.id GROUP BY g.id ORDER BY g.target_date IS NULL, g.target_date, g.created_at').all();
    let formatter;
    try { formatter = new Intl.DateTimeFormat('en-US', { timeZone: q.timezone || 'UTC', year: 'numeric', month: '2-digit', day: '2-digit' }); }
    catch { throw new InputError('Choose a valid timezone.'); }
    const week = weekFor(today);
    const daily = Array.from({ length: 7 }, (_, i) => ({ date: shiftDate(week.start, i), completed: 0 }));
    // Two UTC padding days cover every timezone offset, including DST changes.
    const completions = db.prepare('SELECT completed_at FROM tasks WHERE completed=1 AND completed_at>=? AND completed_at<?').all(`${shiftDate(week.start, -2)}T00:00:00.000Z`, `${shiftDate(week.end, 2)}T00:00:00.000Z`);
    for (const t of completions) { const day = dateInTimezone(t.completed_at, formatter); const bucket = daily.find(d => d.date === day); if (bucket) bucket.completed++; }
    const productivity = { today: daily.find(d => d.date === today).completed, week: daily.reduce((n, d) => n + d.completed, 0), daily, week_start: week.start, week_end: week.end, timezone: formatter.resolvedOptions().timeZone };
    const upcoming_deadlines = db.prepare('SELECT id,title,due_date,priority FROM tasks WHERE completed=0 AND due_date>? ORDER BY due_date, id LIMIT 5').all(today);
    return { stats, projects, goals, productivity, upcoming_deadlines };
  }
  function createProject(input) {
    const name = text(input.name, 60, true); const color = input.color || 'sage';
    assert(colors.includes(color), 'Choose a valid color.');
    const id = randomUUID(); db.prepare('INSERT INTO projects VALUES (?,?,?,?)').run(id, name, color, new Date().toISOString());
    return { id, name, color };
  }
  function createGoal(input) {
    const id = randomUUID();
    db.prepare('INSERT INTO goals(id,title,notes,target_date,created_at) VALUES (?,?,?,?,?)').run(id, text(input.title, 200, true), text(input.notes ?? '', 5000), date(input.target_date), new Date().toISOString());
    return { id };
  }
  function dispatch(action, payload = {}) {
    const { id, body = {}, query = {} } = payload;
    switch (action) {
      case 'dashboard': return dashboard(query);
      case 'tasks.list': return listTasks(query);
      case 'tasks.get': { const t = db.prepare('SELECT * FROM tasks WHERE id=?').get(id); assert(t, 'Task not found.', 404); return t; }
      case 'tasks.create': return createTask(body);
      case 'tasks.update': return transaction(() => {
        const previous = db.prepare('SELECT * FROM tasks WHERE id=?').get(id);
        assert(previous, 'Task not found.', 404);
        assert(body.revision === previous.revision, 'This task changed in another tab. Reopen it to get the latest version.', 409);
        const t = taskData({ ...previous, ...body });
        const completed = body.completed === undefined ? previous.completed : body.completed;
        assert(completed === 0 || completed === 1, 'Invalid completion status.');
        const completedAt = completed ? (previous.completed_at || new Date().toISOString()) : null;
        db.prepare('UPDATE tasks SET title=?,notes=?,due_date=?,priority=?,project_id=?,goal_id=?,completed=?,completed_at=?,revision=revision+1 WHERE id=?').run(t.title, t.notes, t.due_date, t.priority, t.project_id, t.goal_id, completed, completedAt, id);
        return db.prepare('SELECT * FROM tasks WHERE id=?').get(id);
      });
      case 'tasks.delete': { const result = db.prepare('DELETE FROM tasks WHERE id=? AND revision=?').run(id, body.revision ?? -1); assert(result.changes, 'This task changed or was removed. Reopen it and try again.', 409); return { ok: true }; }
      case 'projects.create': return createProject(body);
      case 'projects.update': { const color = body.color || 'sage'; assert(colors.includes(color), 'Choose a valid color.'); const r = db.prepare('UPDATE projects SET name=?,color=? WHERE id=?').run(text(body.name, 60, true), color, id); assert(r.changes, 'Project not found.', 404); return { ok: true }; }
      case 'projects.delete': { const r = db.prepare('DELETE FROM projects WHERE id=?').run(id); assert(r.changes, 'Project not found.', 404); return { ok: true }; }
      case 'goals.create': return createGoal(body);
      case 'goals.update': { const r = db.prepare('UPDATE goals SET title=?,notes=?,target_date=?,revision=revision+1 WHERE id=? AND revision=?').run(text(body.title, 200, true), text(body.notes ?? '', 5000), date(body.target_date), id, body.revision ?? -1); assert(r.changes, 'This goal changed. Reopen it and try again.', 409); return { ok: true }; }
      case 'goals.delete': { const r = db.prepare('DELETE FROM goals WHERE id=? AND revision=?').run(id, body.revision ?? -1); assert(r.changes, 'This goal changed. Reopen it and try again.', 409); return { ok: true }; }
      case 'export': return transaction(() => ({ version: 1, exported_at: new Date().toISOString(), projects: db.prepare('SELECT * FROM projects').all(), goals: db.prepare('SELECT * FROM goals').all(), tasks: db.prepare('SELECT * FROM tasks').all() }));
      case 'demo': return transaction(() => {
        assert(db.prepare('SELECT (SELECT COUNT(*) FROM tasks)+(SELECT COUNT(*) FROM projects)+(SELECT COUNT(*) FROM goals) AS n').get().n === 0, 'Sample data can only be added to an empty workspace.', 409);
        const today = date(body.today) || new Date().toISOString().slice(0, 10);
        const future = new Date(`${today}T12:00:00Z`); future.setUTCDate(future.getUTCDate() + 5);
        const tomorrow = new Date(`${today}T12:00:00Z`); tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
        const work = createProject({ name: 'Website refresh', color: 'sage' });
        const personal = createProject({ name: 'Personal', color: 'violet' });
        const learning = createProject({ name: 'Learning & growth', color: 'peach' });
        const goal = createGoal({ title: 'Make space for a new skill', notes: 'Small steps, every week. Build a learning habit that lasts.', target_date: future.toISOString().slice(0, 10) });
        for (const t of [
          { title: 'Sketch ideas for the homepage', project_id: work.id, priority: 'high', notes: 'Start with the story. What should someone understand in the first five seconds?' },
          { title: 'Read a chapter of my current book', project_id: personal.id, priority: 'low' },
          { title: 'Spend 30 minutes learning something new', project_id: learning.id, goal_id: goal.id, priority: 'medium' },
          { title: 'Plan a little time outside', project_id: personal.id, priority: 'low' },
          { title: 'Write down this week’s priorities', priority: 'medium' }
        ]) createTask({ ...t, due_date: today });
        const done = createTask({ title: 'Clear my desk, clear my mind', due_date: today, project_id: personal.id });
        db.prepare('UPDATE tasks SET completed=1,completed_at=? WHERE id=?').run(new Date().toISOString(), done.id);
        createTask({ title: 'Collect visual inspiration', project_id: work.id, due_date: tomorrow.toISOString().slice(0, 10), priority: 'medium' });
        createTask({ title: 'Put my new skill into practice', project_id: learning.id, goal_id: goal.id, due_date: future.toISOString().slice(0, 10) });
        return { ok: true };
      });
      default: throw new InputError('Not found.', 404);
    }
  }
  return { dispatch, close: () => db.close(), db };
}
