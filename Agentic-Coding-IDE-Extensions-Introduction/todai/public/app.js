import { icon } from './icons.js';
import { dashboardOverview, deadlinesCard } from './dashboard.js';

const $ = (selector, root = document) => root.querySelector(selector);
const escape = (value = '') => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const localDate = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const prettyDate = (value, options = { month: 'short', day: 'numeric' }) => value ? new Date(`${value}T12:00:00`).toLocaleDateString(undefined, options) : '';
const state = { view: 'dashboard', status: '', due: '', project: null, goal: null, search: '', priority: '', sort: 'date', offset: 0, dashboard: { stats: {}, projects: [], goals: [] }, tasks: [], total: 0, request: 0, timerEnd: null, timerRemaining: 25 * 60, filterOpen: false };
let lastFocus;
async function api(path, method = 'GET', body, signal) {
  const response = await fetch(`/api/${path}`, { method, headers: method !== 'GET' ? { 'Content-Type': 'application/json' } : {}, body: body === undefined ? undefined : JSON.stringify(body), signal, cache: 'no-store' });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Could not connect. Please try again.');
  return data;
}
function toast(message, error = false) {
  const box = $('#toast'); box.textContent = message; box.classList.toggle('error', error); box.hidden = false;
  clearTimeout(toast.timeout); toast.timeout = setTimeout(() => { box.hidden = true; }, error ? 7000 : 3500);
}

$('#todai').innerHTML = `
  <a class="skip-link" href="#main">Skip to tasks</a>
  <button id="scrim" class="scrim" aria-label="Close navigation" hidden></button>
  <aside class="sidebar" id="sidebar" aria-label="Sidebar">
    <a class="brand" href="#dashboard" aria-label="todAI home"><span class="brand-mark">${icon('check', 21)}</span>tod<span class="brand-ai">AI</span><span class="brand-dot">.</span></a>
    <button class="workspace" data-action="settings"><span class="avatar">Y</span><span>Your workspace<small>A little more intentional</small></span>${icon('chevron', 15)}</button>
    <button class="search-trigger" data-action="search">${icon('search', 17)}<span>Find a task</span><kbd>/</kbd></button>
    <nav id="nav" aria-label="Main navigation"></nav>
    <div class="sidebar-section"><span>MY PROJECTS</span><button class="icon-button" data-action="new-project" aria-label="New project">${icon('plus', 17)}</button></div>
    <nav id="project-nav" aria-label="Projects"></nav>
    <button class="new-project" data-action="new-project">${icon('plus', 16)} New project</button>
    <div class="sidebar-bottom"><div class="quiet-note">${icon('leaf', 24)}<p>Small steps.<br/><strong>Meaningful progress.</strong></p></div><button class="nav-item" data-action="settings">${icon('settings', 19)}<span>Workspace settings</span></button><div class="local-status"><span></span> Your space, saved locally</div></div>
  </aside>
  <div class="app-body">
    <header class="topbar"><div class="flex items-center gap-3"><button class="icon-button mobile-menu" data-action="menu" aria-label="Open navigation">${icon('menu')}</button><span class="breadcrumb">My workspace <span>/</span> <strong id="breadcrumb">Today</strong></span></div><div class="flex items-center gap-4"><span id="header-date" class="header-date"></span><button class="avatar small" data-action="settings" aria-label="Workspace settings">Y</button></div></header>
    <main id="main" tabindex="-1"><div class="page-heading"><div><div class="eyebrow" id="eyebrow">MAKE ROOM FOR WHAT MATTERS</div><h1 id="title">Today<span class="heading-dot">.</span></h1><p id="subtitle">A fresh start. A little focus. You've got this.</p></div><button class="button primary" data-action="new-task">${icon('plus', 18)} Add task</button></div>
      <div id="search-area" class="search-area" hidden><label for="search-input" class="sr-only">Search all tasks</label>${icon('search')}<input id="search-input" placeholder="Search task titles and notes…" maxlength="200" autocomplete="off"/><button class="icon-button" data-action="clear-search" aria-label="Close search">${icon('close', 18)}</button></div>
      <div id="overview"></div>
      <div class="workspace-grid"><section class="task-panel" aria-label="Tasks"><div id="toolbar"></div><div id="task-list" aria-live="polite"><div class="loading-state">Getting your workspace ready…</div></div><div id="pagination"></div></section><aside class="right-rail" id="right-rail" aria-label="Daily focus and goals"></aside></div>
      <footer class="page-footer"><span>Make a little room for a little progress.</span><span>Made for your everyday <span class="footer-flower">✳</span></span></footer>
    </main>
  </div>
  <dialog id="editor" aria-labelledby="dialog-title"><div id="dialog-content"></div></dialog>
  <div id="toast" role="status" hidden></div>`;

function renderNav() {
  const { stats, projects } = state.dashboard;
  const items = [['dashboard', 'layers', 'Dashboard', null], ['inbox', 'inbox', 'Inbox', stats.inbox], ['today', 'sun', 'Today', stats.today], ['upcoming', 'calendar', 'Upcoming', stats.upcoming], ['all', 'layers', 'All tasks', stats.total], ['goals', 'target', 'My goals', null], ['completed', 'check', 'Completed', stats.completed]];
  $('#nav').innerHTML = items.map(([view, glyph, label, count]) => `<button class="nav-item ${state.view === view ? 'active' : ''}" data-view="${view}" ${state.view === view ? 'aria-current="page"' : ''}>${icon(glyph, 19)}<span>${label}</span>${count != null ? `<span class="nav-count">${count}</span>` : ''}</button>`).join('');
  $('#project-nav').innerHTML = projects.map(p => `<button class="nav-item ${state.project === p.id ? 'active' : ''}" data-project="${p.id}" ${state.project === p.id ? 'aria-current="page"' : ''}><span class="project-dot ${p.color}"></span><span class="truncate">${escape(p.name)}</span><span class="nav-count">${p.total - p.done}</span></button>`).join('');
  $('#header-date').textContent = new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}
function currentTitle() {
  if (state.search) return 'Search results';
  if (state.project) return state.dashboard.projects.find(p => p.id === state.project)?.name || 'Project';
  if (state.goal) return state.dashboard.goals.find(g => g.id === state.goal)?.title || 'Goal';
  return { dashboard: 'Dashboard', today: 'Today', inbox: 'Inbox', upcoming: 'Upcoming', all: 'All tasks', goals: 'My goals', completed: 'Completed' }[state.view] || 'Today';
}
function renderHeading() {
  const title = currentTitle(); $('#title').innerHTML = `${escape(title)}<span class="heading-dot">.</span>`; $('#breadcrumb').textContent = title;
  $('#eyebrow').textContent = state.view === 'goals' ? 'SMALL STEPS. BIGGER POSSIBILITIES.' : state.project ? 'A PLACE FOR EVERY PIECE' : 'MAKE ROOM FOR WHAT MATTERS';
  $('#subtitle').textContent = state.search ? `Finding a little clarity for “${state.search}”.` : ({ dashboard: 'Your day, your progress, and a little room to plan ahead.', today: "A fresh start. A little focus. You've got this.", inbox: 'Get it out of your head. Give it a home later.', upcoming: 'A little planning makes room for a calmer tomorrow.', all: 'Everything on your plate, with room to breathe.', goals: 'Keep the bigger picture close, one task at a time.', completed: 'Look at how far you’ve come.' }[state.view] || 'One small step brings you closer.');
}
function renderOverview() {
  if (state.view === 'dashboard' && !state.search) { $('#overview').innerHTML = dashboardOverview(state.dashboard, escape, prettyDate); return; }
  const { stats } = state.dashboard;
  const done = stats.today_done || 0; const planned = (stats.today || 0) + done;
  const progress = planned ? Math.round(done / planned * 100) : 0;
  $('#overview').innerHTML = state.view === 'today' && !state.search ? `<section class="day-overview"><div class="overview-intro"><span class="sun-badge">${icon('sun', 27)}</span><div><h2>A good day starts with a little clarity.</h2><p>${stats.today ? `You have <strong>${stats.today} ${stats.today === 1 ? 'task' : 'tasks'}</strong> to focus on. One at a time is enough.` : 'A little breathing room. Choose what matters to you today.'}</p></div></div><div class="day-progress"><div><strong>${done}<span> / ${planned}</span></strong><span>tasks complete</span></div><div class="progress-track"><span style="width:${progress}%"></span></div></div><div class="overview-art" aria-hidden="true"><span></span><span></span><span></span></div></section>` : '';
}
function effectiveStatus() {
  if (state.view === 'completed' && !state.search) return 'completed';
  return state.status || (state.search || state.view === 'all' ? 'all' : 'active');
}
function resetFilters() { state.status = ''; state.priority = ''; state.due = ''; state.offset = 0; }
function renderToolbar() {
  const isGoals = state.view === 'goals' && !state.search;
  $('#toolbar').innerHTML = `<div class="list-heading"><div class="flex items-center gap-3"><h2>${isGoals ? 'The bigger picture' : state.view === 'completed' ? 'Your accomplishments' : state.view === 'dashboard' && !state.search ? 'Today’s tasks' : 'Your tasks'}</h2><span class="count-pill">${isGoals ? state.dashboard.goals.length : state.total}</span></div><div class="flex items-center gap-2">${state.project || state.goal ? `<button class="icon-button" data-action="edit-context" aria-label="Edit ${state.project ? 'project' : 'goal'}">${icon('edit', 17)}</button>` : ''}${isGoals ? `<button class="text-button" data-action="new-goal">${icon('plus', 16)} New goal</button>` : `<button class="filter-button ${state.priority || state.status || state.due ? 'selected' : ''}" data-action="filters" aria-expanded="${state.filterOpen}">${icon('settings', 16)} Filter</button><label class="sr-only" for="sort">Sort tasks</label><select id="sort" class="sort-select"><option value="date" ${state.sort === 'date' ? 'selected' : ''}>By due date</option><option value="priority" ${state.sort === 'priority' ? 'selected' : ''}>By priority</option><option value="newest" ${state.sort === 'newest' ? 'selected' : ''}>Newest first</option></select>`}</div></div>${state.filterOpen && !isGoals ? `<div class="filter-bar"><div><label for="status-filter">Status</label><select id="status-filter" ${state.view === 'completed' && !state.search ? 'disabled' : ''}>${[['all', 'All statuses'], ['active', 'Active'], ['completed', 'Completed']].map(([value, label]) => `<option value="${value}" ${effectiveStatus() === value ? 'selected' : ''}>${label}</option>`).join('')}</select></div><div><label for="priority-filter">Priority</label><select id="priority-filter"><option value="">All priorities</option>${['high', 'medium', 'low'].map(p => `<option value="${p}" ${state.priority === p ? 'selected' : ''}>${p[0].toUpperCase() + p.slice(1)}</option>`).join('')}</select></div><div><label for="due-filter">Due date</label><select id="due-filter">${[['', 'Any date'], ['today', 'Today'], ['week', 'This week'], ['overdue', 'Overdue']].map(([value, label]) => `<option value="${value}" ${state.due === value ? 'selected' : ''}>${label}</option>`).join('')}</select></div><button class="text-button" data-action="reset-filter">Reset</button><p class="filter-hint">Filters narrow the current view. Use All tasks to filter across dates.</p></div>` : ''}`;
}
function taskRow(t) {
  const overdue = !t.completed && t.due_date && t.due_date < localDate();
  const due = t.due_date === localDate() ? 'Today' : prettyDate(t.due_date);
  return `<article class="task-row ${t.completed ? 'is-done' : ''}"><button class="task-check ${t.priority}" data-complete="${t.id}" aria-label="${t.completed ? 'Reopen' : 'Complete'} ${escape(t.title)}">${t.completed ? icon('check', 14) : ''}</button><button class="task-main" data-edit-task="${t.id}"><span class="task-title">${escape(t.title)}</span><span class="task-meta">${t.project_name ? `<span class="project-label"><span class="project-dot ${t.project_color}"></span>${escape(t.project_name)}</span>` : `<span>${icon('inbox', 12)} Inbox</span>`}${t.due_date ? `<span class="${overdue ? 'overdue' : ''}">${icon('calendar', 12)}${overdue ? 'Overdue · ' : ''}${due}</span>` : ''}${t.notes ? `<span class="notes-label">Description</span>` : ''}${t.completed ? `<span class="completed-label">${icon('check', 12)} Completed</span>` : ''}${t.goal_id ? `<span title="${escape(t.goal_title)}">${icon('target', 12)} Goal</span>` : ''}</span></button><span class="priority-badge ${t.priority}">${t.priority === 'high' ? icon('flag', 11) : '<i></i>'}${t.priority}</span><button class="icon-button task-edit" data-edit-task="${t.id}" aria-label="Edit ${escape(t.title)}">${icon('edit', 16)}</button></article>`;
}
function renderTasks() {
  if (state.view === 'goals' && !state.search) {
    $('#task-list').innerHTML = state.dashboard.goals.length ? `<div class="goal-grid">${state.dashboard.goals.map(g => goalCard(g, true)).join('')}</div>` : empty('A little ambition goes a long way.', 'Give your next big idea a home. Link tasks to a goal and watch your progress grow.', 'Create a goal', 'new-goal', 'target');
    $('#pagination').innerHTML = ''; return;
  }
  if (!state.tasks.length) {
    const title = state.search || state.priority || state.status || state.due ? 'No tasks match just yet.' : state.view === 'completed' ? 'Progress starts with one small step.' : state.view === 'today' ? 'A little space for what matters.' : 'A clear space. A fresh beginning.';
    const description = state.search || state.priority || state.status || state.due ? 'Try a different search, status, priority, or date filter.' : state.view === 'completed' ? 'Your completed tasks will find a home here.' : 'Add your first task and take the day one thing at a time.';
    $('#task-list').innerHTML = empty(title, description, state.search || state.priority || state.status || state.due ? 'Clear filters' : 'Add a task', state.search || state.priority || state.status || state.due ? 'clear-filters' : 'new-task', 'leaf');
    if (!state.dashboard.stats.total && !state.dashboard.projects.length && !state.dashboard.goals.length) $('#task-list').insertAdjacentHTML('beforeend', '<div class="demo-invite">Want to take a look around first? <button class="text-button" data-action="demo">Try sample tasks</button></div>');
  } else {
    $('#task-list').innerHTML = state.tasks.map(taskRow).join('') + (state.view !== 'completed' ? `<button class="inline-add" data-action="new-task">${icon('plus', 17)} Add a task <span>Give that thought a home</span></button>` : '');
  }
  $('#pagination').innerHTML = state.total > 40 ? `<div class="pagination"><span>${state.offset + 1}–${Math.min(state.offset + 40, state.total)} of ${state.total}</span><button class="button secondary" data-page="prev" ${state.offset === 0 ? 'disabled' : ''}>Previous</button><button class="button secondary" data-page="next" ${state.offset + 40 >= state.total ? 'disabled' : ''}>Next</button></div>` : '';
}
function empty(title, description, label, action, glyph) {
  return `<div class="empty-state"><div class="empty-illustration">${icon(glyph, 35)}<span>✦</span></div><h3>${title}</h3><p>${description}</p><button class="button secondary" data-action="${action}">${icon('plus', 16)} ${label}</button></div>`;
}
function goalCard(g, full = false) {
  const percent = g.total ? Math.round(g.done / g.total * 100) : 0;
  return `<button class="goal-card ${full ? 'full' : ''}" data-goal="${g.id}"><div class="goal-card-top"><span class="goal-symbol">${icon('target', 19)}</span>${g.target_date ? `<span>${prettyDate(g.target_date)}</span>` : '<span>One step at a time</span>'}${icon('arrow', 16)}</div><h3>${escape(g.title)}</h3>${full && g.notes ? `<p>${escape(g.notes)}</p>` : ''}<div class="goal-progress-label"><span>${g.done} of ${g.total} tasks</span><strong>${percent}%</strong></div><div class="progress-track"><span style="width:${percent}%"></span></div></button>`;
}
function renderRail() {
  const g = state.dashboard.goals[0];
  $('#right-rail').innerHTML = `${state.view === 'dashboard' && !state.search ? deadlinesCard(state.dashboard.upcoming_deadlines, escape, prettyDate) : ''}<section class="focus-card"><div class="card-eyebrow">${icon('spark', 17)} A MOMENT OF FOCUS</div><h2>One thing.<br/>Your full attention.</h2><p>Settle in, silence the noise, and make a little headway.</p><div class="timer" id="timer">25:00</div><button class="button focus-button" data-action="timer" id="timer-toggle">${icon('play', 15)} Start a 25 min focus</button><button class="timer-reset" data-action="timer-reset" ${!state.timerEnd && state.timerRemaining === 1500 ? 'hidden' : ''}>Reset timer</button><div class="focus-orbit" aria-hidden="true"></div></section><section class="goal-section"><div class="rail-heading"><h2>A bigger picture</h2><button class="icon-button" data-view="goals" aria-label="View all goals">${icon('arrow', 17)}</button></div>${g ? goalCard(g) : `<button class="goal-placeholder" data-action="new-goal">${icon('target', 26)}<strong>What are you working toward?</strong><span>Give your next goal a little space.</span><span class="text-button">Create a goal ${icon('arrow', 15)}</span></button>`}</section><div class="gentle-reminder"><span>“</span><p>You don’t have to do it all.<br/>Just the next right thing.</p><small>A LITTLE REMINDER</small></div>`;
  paintTimer();
}
let controller;
async function refresh() {
  controller?.abort(); controller = new AbortController(); const signal = controller.signal; const requestId = ++state.request;
  const query = new URLSearchParams({ today: localDate(), view: state.search ? 'all' : state.view === 'dashboard' ? 'today' : state.view, sort: state.sort, offset: String(state.offset) });
  if (state.search) query.set('search', state.search);
  query.set('status', effectiveStatus());
  if (state.due) query.set('due', state.due);
  if (state.priority) query.set('priority', state.priority);
  if (state.project && !state.search) query.set('project_id', state.project);
  if (state.goal && !state.search) query.set('goal_id', state.goal);
  $('#task-list').setAttribute('aria-busy', 'true');
  try {
    const [dashboard, result] = await Promise.all([api(`dashboard?today=${localDate()}&timezone=${encodeURIComponent(Intl.DateTimeFormat().resolvedOptions().timeZone)}`, 'GET', undefined, signal), api(`tasks?${query}`, 'GET', undefined, signal)]);
    if (requestId !== state.request) return;
    state.dashboard = dashboard; state.tasks = result.tasks; state.total = result.total;
    if (state.offset && state.offset >= state.total) { state.offset = Math.max(0, Math.floor((state.total - 1) / 40) * 40); return refresh(); }
    renderNav(); renderHeading(); renderOverview(); renderToolbar(); renderTasks(); renderRail();
  } catch (error) {
    if (error.name !== 'AbortError') { toast(error.message, true); $('#task-list').innerHTML = '<div class="empty-state"><h3>Couldn’t load your workspace.</h3><p>Your saved data is still on disk. Try connecting again.</p><button class="button secondary" data-action="retry">Try again</button></div>'; }
  } finally { if (requestId === state.request) $('#task-list').setAttribute('aria-busy', 'false'); }
}
function navigate(view, project = null, goal = null) {
  clearTimeout(searchTimeout); resetFilters();
  state.view = view; state.project = project; state.goal = goal; state.offset = 0; state.search = ''; $('#search-input').value = ''; $('#search-area').hidden = true;
  history.pushState(null, '', `#${project ? `project/${project}` : goal ? `goal/${goal}` : view}`);
  closeMenu(); refresh();
}
function routeHash() {
  const [view, id] = location.hash.slice(1).split('/');
  state.view = ['dashboard', 'today', 'inbox', 'upcoming', 'all', 'goals', 'completed', 'project', 'goal'].includes(view) ? view : 'dashboard';
  state.project = view === 'project' ? id : null; state.goal = view === 'goal' ? id : null;
}
function closeMenu() { $('#sidebar').classList.remove('open'); $('#scrim').hidden = true; }
function openDialog(content) { lastFocus = document.activeElement; $('#dialog-content').innerHTML = content; $('#editor').showModal(); }
function closeDialog() { $('#editor').close(); if (lastFocus?.isConnected) lastFocus.focus(); }
const dialogHeader = (title, subtitle) => `<div class="dialog-heading"><div><div class="eyebrow">A LITTLE MORE CLARITY</div><h2 id="dialog-title">${title}</h2></div><button class="icon-button" type="button" data-action="close-dialog" aria-label="Close dialog">${icon('close')}</button></div><p class="dialog-subtitle">${subtitle}</p>`;
const options = (items, selected, key) => items.map(p => `<option value="${p.id}" ${selected === p.id ? 'selected' : ''}>${escape(p[key])}</option>`).join('');
async function taskDialog(id) {
  try {
    const t = id ? await api(`tasks/${id}`) : { title: '', notes: '', priority: 'low', due_date: ['today', 'dashboard'].includes(state.view) ? localDate() : '', project_id: state.project, goal_id: state.goal };
    openDialog(`${dialogHeader(id ? 'Make it your own.' : 'One small step.', id ? 'A little detail goes a long way.' : 'Get it out of your head and into your day.')}<form id="task-form" data-id="${id || ''}" data-revision="${t.revision || ''}"><label for="task-title">What would you like to do?</label><input id="task-title" name="title" placeholder="e.g. Make a plan for the week" value="${escape(t.title)}" required maxlength="200" autofocus/><label for="task-notes">Description <span class="optional">optional</span></label><textarea id="task-notes" name="notes" rows="3" placeholder="A few details, a link, or a place to start…" maxlength="5000">${escape(t.notes)}</textarea><div class="form-grid"><div><label for="task-status">Status</label><select id="task-status" name="completed"><option value="0" ${!t.completed ? 'selected' : ''}>Active</option><option value="1" ${t.completed ? 'selected' : ''}>Completed</option></select></div><div><label for="task-date">Due date</label><input id="task-date" name="due_date" type="date" value="${t.due_date || ''}" max="9999-12-31"/></div><div><label for="task-priority">Priority</label><select id="task-priority" name="priority">${['low', 'medium', 'high'].map(p => `<option value="${p}" ${t.priority === p ? 'selected' : ''}>${p[0].toUpperCase() + p.slice(1)}</option>`).join('')}</select></div><div><label for="task-project">Project / category</label><select id="task-project" name="project_id"><option value="">Inbox · no project</option>${options(state.dashboard.projects, t.project_id, 'name')}</select></div><div><label for="task-goal">Linked goal</label><select id="task-goal" name="goal_id"><option value="">No goal</option>${options(state.dashboard.goals, t.goal_id, 'title')}</select></div></div><p class="form-error" role="alert" hidden></p><div class="dialog-actions">${id ? `<button class="icon-button danger" type="button" data-delete-task="${id}" data-revision="${t.revision}" aria-label="Delete task">${icon('trash', 18)}</button>` : '<span class="dialog-hint">Little things add up.</span>'}<button class="button secondary" type="button" data-action="close-dialog">Cancel</button><button class="button primary" type="submit">${id ? 'Save changes' : 'Add task'} ${icon('arrow', 16)}</button></div></form>`);
  } catch (error) { toast(error.message, true); }
}
function projectDialog(id) {
  const p = state.dashboard.projects.find(p => p.id === id) || { name: '', color: 'sage' };
  openDialog(`${dialogHeader(id ? 'A place for your project.' : 'Start something good.', 'Bring related tasks together in a space of their own.')}<form id="project-form" data-id="${id || ''}"><label for="project-name">Project name</label><input id="project-name" name="name" value="${escape(p.name)}" required maxlength="60" placeholder="e.g. A little side project" autofocus/><label for="project-color">Color</label><select id="project-color" name="color">${['sage', 'violet', 'peach', 'blue'].map(c => `<option value="${c}" ${p.color === c ? 'selected' : ''}>${c[0].toUpperCase() + c.slice(1)}</option>`).join('')}</select><p class="form-error" role="alert" hidden></p><div class="dialog-actions">${id ? `<button type="button" class="icon-button danger" data-delete-project="${id}" aria-label="Delete project">${icon('trash', 18)}</button>` : '<span></span>'}<button type="button" class="button secondary" data-action="close-dialog">Cancel</button><button type="submit" class="button primary">${id ? 'Save changes' : 'Create project'}</button></div></form>`);
}
function goalDialog(id) {
  const g = state.dashboard.goals.find(g => g.id === id) || { title: '', notes: '', target_date: '' };
  openDialog(`${dialogHeader(id ? 'Keep your vision close.' : 'Make room for a bigger idea.', 'Link tasks to this goal to track your progress, one step at a time.')}<form id="goal-form" data-id="${id || ''}" data-revision="${g.revision || ''}"><label for="goal-title">Your goal</label><input id="goal-title" name="title" value="${escape(g.title)}" placeholder="e.g. Build a lasting reading habit" required maxlength="200" autofocus/><label for="goal-notes">Why it matters <span class="optional">optional</span></label><textarea id="goal-notes" name="notes" rows="3" maxlength="5000">${escape(g.notes)}</textarea><label for="goal-date">Target date <span class="optional">optional</span></label><input id="goal-date" name="target_date" type="date" max="9999-12-31" value="${g.target_date || ''}"/><p class="form-error" role="alert" hidden></p><div class="dialog-actions">${id ? `<button type="button" class="icon-button danger" data-delete-goal="${id}" data-revision="${g.revision}" aria-label="Delete goal">${icon('trash', 18)}</button>` : '<span></span>'}<button type="button" class="button secondary" data-action="close-dialog">Cancel</button><button type="submit" class="button primary">${id ? 'Save changes' : 'Create goal'}</button></div></form>`);
}
function settingsDialog() {
  openDialog(`${dialogHeader('Your quiet little workspace.', 'A simple place for your everyday tasks and bigger plans.')}<div class="settings-detail"><span class="setting-icon">${icon('folder', 22)}</span><div><h3>Saved on this computer</h3><p>Tasks, projects, and goals are stored in your local SQLite database. No account or cloud sync is needed.</p></div></div><div class="settings-detail"><span class="setting-icon">${icon('download', 22)}</span><div><h3>Take your data with you</h3><p>Download a JSON copy of all your tasks, projects, and goals. For a restorable database backup, use the backup command in the README.</p><a class="button secondary" href="/api/export" download="todai-export.json">${icon('download', 16)} Export workspace</a></div></div><div class="shortcut-note"><kbd>N</kbd> new task <kbd>/</kbd> search <kbd>Esc</kbd> close dialog</div><div class="dialog-actions"><span>todAI · a little more intentional</span><button class="button primary" data-action="close-dialog">All set</button></div>`);
}
function confirmDelete(resource, id, revision) {
  const singular = resource.slice(0, -1);
  openDialog(`${dialogHeader(`Delete this ${singular}?`, resource === 'tasks' ? 'This task will be permanently removed.' : `Your tasks will stay. They will no longer be linked to this ${singular}.`)}<form id="delete-form" data-resource="${resource}" data-id="${id}" data-revision="${revision || ''}"><p class="form-error" role="alert" hidden></p><div class="dialog-actions"><span></span><button type="button" class="button secondary" data-action="close-dialog">Keep ${singular}</button><button type="submit" class="button destructive">Delete ${singular}</button></div></form>`);
}
function paintTimer() {
  if (state.timerEnd) state.timerRemaining = Math.max(0, Math.ceil((state.timerEnd - Date.now()) / 1000));
  if (state.timerEnd && state.timerRemaining === 0) { state.timerEnd = null; state.timerRemaining = 1500; toast('A little progress, made. Time to take a break.'); }
  if ($('#timer')) $('#timer').textContent = `${String(Math.floor(state.timerRemaining / 60)).padStart(2, '0')}:${String(state.timerRemaining % 60).padStart(2, '0')}`;
  if ($('#timer-toggle')) $('#timer-toggle').innerHTML = `${icon(state.timerEnd ? 'pause' : 'play', 15)} ${state.timerEnd ? 'Pause focus' : state.timerRemaining !== 1500 ? 'Resume focus' : 'Start a 25 min focus'}`;
  if ($('[data-action="timer-reset"]')) $('[data-action="timer-reset"]').hidden = !state.timerEnd && state.timerRemaining === 1500;
}
setInterval(paintTimer, 1000);

document.addEventListener('click', async event => {
  const button = event.target.closest('button, a.brand'); if (!button) return;
  const d = button.dataset;
  if (button.matches('a.brand')) { event.preventDefault(); navigate('dashboard'); return; }
  if (d.editProject) { projectDialog(d.editProject); return; }
  if (d.summary) {
    navigate(d.summary === 'overdue' ? 'all' : d.summary);
    if (d.summary === 'overdue') { state.status = 'active'; state.due = 'overdue'; state.filterOpen = true; refresh(); }
    return;
  }
  if (d.view) { navigate(d.view); return; }
  if (d.project) { navigate('project', d.project); return; }
  if (d.goal) { navigate('goal', null, d.goal); return; }
  if (d.editTask) { taskDialog(d.editTask); return; }
  if (d.complete) {
    const t = state.tasks.find(t => t.id === d.complete); if (!t) return; button.disabled = true;
    try { await api(`tasks/${t.id}`, 'PATCH', { completed: t.completed ? 0 : 1, revision: t.revision }); toast(t.completed ? 'Task reopened. A fresh start.' : 'One small win. Nicely done.'); await refresh(); }
    catch (error) { toast(error.message, true); button.disabled = false; await refresh(); } return;
  }
  if (d.deleteTask) return confirmDelete('tasks', d.deleteTask, d.revision);
  if (d.deleteProject) return confirmDelete('projects', d.deleteProject);
  if (d.deleteGoal) return confirmDelete('goals', d.deleteGoal, d.revision);
  if (d.page) { state.offset += d.page === 'next' ? 40 : -40; await refresh(); $('#main').scrollIntoView({ behavior: 'smooth' }); return; }
  switch (d.action) {
    case 'new-task': taskDialog(); break;
    case 'new-project': projectDialog(); break;
    case 'new-goal': goalDialog(); break;
    case 'edit-context': state.project ? projectDialog(state.project) : goalDialog(state.goal); break;
    case 'close-dialog': closeDialog(); break;
    case 'settings': settingsDialog(); break;
    case 'menu': $('#sidebar').classList.add('open'); $('#scrim').hidden = false; break;
    case 'search': $('#search-area').hidden = false; $('#search-input').focus(); closeMenu(); break;
    case 'clear-search': state.search = ''; $('#search-input').value = ''; $('#search-area').hidden = true; state.offset = 0; refresh(); break;
    case 'clear-filters': clearTimeout(searchTimeout); state.search = ''; $('#search-input').value = ''; resetFilters(); refresh(); break;
    case 'filters': state.filterOpen = !state.filterOpen; renderToolbar(); break;
    case 'reset-filter': resetFilters(); refresh(); break;
    case 'retry': refresh(); break;
    case 'timer': if (state.timerEnd) { paintTimer(); state.timerEnd = null; } else state.timerEnd = Date.now() + state.timerRemaining * 1000; paintTimer(); break;
    case 'timer-reset': state.timerEnd = null; state.timerRemaining = 1500; paintTimer(); break;
    case 'demo': button.disabled = true; try { await api('demo', 'POST', { today: localDate() }); await refresh(); toast('Sample tasks added. Make them your own.'); } catch (error) { toast(error.message, true); button.disabled = false; } break;
  }
});
document.addEventListener('submit', async event => {
  const form = event.target; if (!['task-form', 'project-form', 'goal-form', 'delete-form'].includes(form.id)) return;
  event.preventDefault();
  if (form.dataset.saving) return; form.dataset.saving = 'true';
  const submit = $('[type="submit"]', form); submit.disabled = true; const original = submit.innerHTML; submit.textContent = 'Saving…';
  const errorBox = $('.form-error', form); errorBox.hidden = true;
  const id = form.dataset.id; const body = Object.fromEntries(new FormData(form)); if (form.dataset.revision) body.revision = Number(form.dataset.revision);
  if (form.id === 'task-form') body.completed = Number(body.completed);
  const resource = form.id === 'delete-form' ? form.dataset.resource : { 'task-form': 'tasks', 'project-form': 'projects', 'goal-form': 'goals' }[form.id];
  try {
    await api(`${resource}${id ? `/${id}` : ''}`, form.id === 'delete-form' ? 'DELETE' : id ? 'PATCH' : 'POST', body);
    closeDialog(); toast(form.id === 'delete-form' ? 'Removed from your workspace.' : 'Saved. A little more clarity.');
    if (form.id === 'delete-form' && (state.project === id || state.goal === id)) navigate(resource === 'projects' ? 'inbox' : 'goals'); else await refresh();
  } catch (error) { errorBox.textContent = error.message; errorBox.hidden = false; }
  finally { delete form.dataset.saving; submit.disabled = false; submit.innerHTML = original; }
});
let searchTimeout;
$('#search-input').addEventListener('input', event => { clearTimeout(searchTimeout); searchTimeout = setTimeout(() => { state.search = event.target.value.trim(); state.offset = 0; refresh(); }, 220); });
document.addEventListener('change', event => {
  const key = { sort: 'sort', 'priority-filter': 'priority', 'status-filter': 'status', 'due-filter': 'due' }[event.target.id];
  if (key) { state[key] = event.target.value; state.offset = 0; refresh(); }
});
$('#scrim').addEventListener('click', closeMenu);
$('#editor').addEventListener('cancel', event => { if ($('form[data-saving]', $('#editor'))) event.preventDefault(); });
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') closeMenu();
  if (event.ctrlKey || event.metaKey || event.altKey || event.target.closest('input, textarea, select') || $('#editor').open) return;
  if (event.key === '/') { event.preventDefault(); $('#search-area').hidden = false; $('#search-input').focus(); }
  if (event.key.toLowerCase() === 'n') { event.preventDefault(); taskDialog(); }
});
$('.skip-link').addEventListener('click', event => { event.preventDefault(); $('#main').focus(); });
window.addEventListener('hashchange', () => { clearTimeout(searchTimeout); resetFilters(); routeHash(); state.search = ''; $('#search-input').value = ''; $('#search-area').hidden = true; refresh(); });
window.addEventListener('focus', () => { if (!$('#editor').open) refresh(); });
let day = localDate(); setInterval(() => { if (localDate() !== day) { day = localDate(); refresh(); } }, 60000);
routeHash(); refresh();
