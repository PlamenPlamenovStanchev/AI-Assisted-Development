import { readFileSync, writeFileSync } from 'node:fs';
const file = 'public/app.js';
let source = readFileSync(file, 'utf8');
function replace(from, to) {
  if (!source.includes(from)) throw new Error(`Missing source fragment: ${from.slice(0, 80)}`);
  source = source.replace(from, to);
}
replace("import { icon } from './icons.js';", "import { icon } from './icons.js';\nimport { dashboardOverview, deadlinesCard } from './dashboard.js';");
replace("view: 'today', project:", "view: 'dashboard', status: '', due: '', project:");
replace('href="#today" aria-label="todAI home"', 'href="#dashboard" aria-label="todAI home"');
replace("const items = [['inbox'", "const items = [['dashboard', 'layers', 'Dashboard', null], ['inbox'");
replace("['all', 'layers', 'All tasks', stats.active]", "['all', 'layers', 'All tasks', stats.total]");
replace("return { today: 'Today'", "return { dashboard: 'Dashboard', today: 'Today'");
replace("({ today: \"A fresh start.", "({ dashboard: 'Your day, your progress, and a little room to plan ahead.', today: \"A fresh start.");
replace("function renderOverview() {\n  const { stats }", "function renderOverview() {\n  if (state.view === 'dashboard' && !state.search) { $('#overview').innerHTML = dashboardOverview(state.dashboard, escape, prettyDate); return; }\n  const { stats }");
replace("state.view === 'completed' ? 'Your accomplishments' : 'Your tasks'", "state.view === 'completed' ? 'Your accomplishments' : state.view === 'dashboard' && !state.search ? 'Today’s tasks' : 'Your tasks'");
replace("${state.priority ? 'selected' : ''}", "${state.priority || state.status || state.due ? 'selected' : ''}");
replace("<div class=\"filter-bar\"><label for=\"priority-filter\">Priority</label>", `<div class="filter-bar"><div><label for="status-filter">Status</label><select id="status-filter" \${state.view === 'completed' && !state.search ? 'disabled' : ''}>\${[['all', 'All statuses'], ['active', 'Active'], ['completed', 'Completed']].map(([value, label]) => \`<option value="\${value}" \${effectiveStatus() === value ? 'selected' : ''}>\${label}</option>\`).join('')}</select></div><div><label for="priority-filter">Priority</label>`);
replace('<button class="text-button" data-action="reset-filter">Reset</button></div>', `</div><div><label for="due-filter">Due date</label><select id="due-filter">\${[['', 'Any date'], ['today', 'Today'], ['week', 'This week'], ['overdue', 'Overdue']].map(([value, label]) => \`<option value="\${value}" \${state.due === value ? 'selected' : ''}>\${label}</option>\`).join('')}</select></div><button class="text-button" data-action="reset-filter">Reset</button><p class="filter-hint">Filters narrow the current view. Use All tasks to filter across dates.</p></div>`);
replace('function renderToolbar() {', `function effectiveStatus() {
  if (state.view === 'completed' && !state.search) return 'completed';
  return state.status || (state.search || state.view === 'all' ? 'all' : 'active');
}
function resetFilters() { state.status = ''; state.priority = ''; state.due = ''; state.offset = 0; }
function renderToolbar() {`);
source = source.replaceAll('state.search || state.priority ?', 'state.search || state.priority || state.status || state.due ?');
replace('Try a different search or priority filter.', 'Try a different search, status, priority, or date filter.');
replace("${t.notes ? `<span class=\"notes-label\">Notes</span>` : ''}", "${t.notes ? `<span class=\"notes-label\">Description</span>` : ''}${t.completed ? `<span class=\"completed-label\">${icon('check', 12)} Completed</span>` : ''}");
replace("$('#right-rail').innerHTML = `<section", "$('#right-rail').innerHTML = `${state.view === 'dashboard' && !state.search ? deadlinesCard(state.dashboard.upcoming_deadlines, escape, prettyDate) : ''}<section");
replace("view: state.search ? 'all' : state.view,", "view: state.search ? 'all' : state.view === 'dashboard' ? 'today' : state.view,");
replace("if (state.search) { query.set('search', state.search); query.set('status', 'all'); }", "if (state.search) query.set('search', state.search);\n  query.set('status', effectiveStatus());\n  if (state.due) query.set('due', state.due);");
replace('api(`dashboard?today=${localDate()}`', 'api(`dashboard?today=${localDate()}&timezone=${encodeURIComponent(Intl.DateTimeFormat().resolvedOptions().timeZone)}`');
replace("  state.view = view; state.project", "  clearTimeout(searchTimeout); resetFilters();\n  state.view = view; state.project");
replace("['today', 'inbox', 'upcoming', 'all', 'goals', 'completed', 'project', 'goal'].includes(view) ? view : 'today'", "['dashboard', 'today', 'inbox', 'upcoming', 'all', 'goals', 'completed', 'project', 'goal'].includes(view) ? view : 'dashboard'");
replace("due_date: state.view === 'today' ? localDate() : ''", "due_date: ['today', 'dashboard'].includes(state.view) ? localDate() : ''");
replace('<label for="task-notes">Notes ', '<label for="task-notes">Description ');
replace('<label for="task-project">Project</label>', '<label for="task-project">Project / category</label>');
replace('<div class="form-grid"><div><label for="task-date">', '<div class="form-grid"><div><label for="task-status">Status</label><select id="task-status" name="completed"><option value="0" ${!t.completed ? \'selected\' : \'\'}>Active</option><option value="1" ${t.completed ? \'selected\' : \'\'}>Completed</option></select></div><div><label for="task-date">');
replace("navigate('today'); return;", "navigate('dashboard'); return;");
replace("  if (d.view) {", `  if (d.editProject) { projectDialog(d.editProject); return; }
  if (d.summary) {
    navigate(d.summary === 'overdue' ? 'all' : d.summary);
    if (d.summary === 'overdue') { state.status = 'active'; state.due = 'overdue'; state.filterOpen = true; refresh(); }
    return;
  }
  if (d.view) {`);
replace("case 'clear-filters': state.search = ''; $('#search-input').value = ''; state.priority = ''; state.offset = 0; refresh(); break;", "case 'clear-filters': clearTimeout(searchTimeout); state.search = ''; $('#search-input').value = ''; resetFilters(); refresh(); break;");
replace("case 'reset-filter': state.priority = ''; state.offset = 0; refresh(); break;", "case 'reset-filter': resetFilters(); refresh(); break;");
replace("  const resource = form.id === 'delete-form'", "  if (form.id === 'task-form') body.completed = Number(body.completed);\n  const resource = form.id === 'delete-form'");
replace("document.addEventListener('change', event => { if (event.target.id === 'sort') { state.sort = event.target.value; state.offset = 0; refresh(); } if (event.target.id === 'priority-filter') { state.priority = event.target.value; state.offset = 0; refresh(); } });", `document.addEventListener('change', event => {
  const key = { sort: 'sort', 'priority-filter': 'priority', 'status-filter': 'status', 'due-filter': 'due' }[event.target.id];
  if (key) { state[key] = event.target.value; state.offset = 0; refresh(); }
});`);
replace("() => { routeHash(); state.offset = 0; state.search = '';", "() => { clearTimeout(searchTimeout); resetFilters(); routeHash(); state.search = '';");
writeFileSync(file, source);
