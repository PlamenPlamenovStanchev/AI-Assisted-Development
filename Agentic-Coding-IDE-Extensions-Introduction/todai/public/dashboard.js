import { icon } from './icons.js';

// Dashboard markup is isolated from task editing and navigation. Dynamic text
// is escaped by the same renderer used for task titles throughout the app.
export function dashboardOverview(data, escape, prettyDate) {
  const { stats, productivity: p, projects } = data;
  const max = Math.max(1, ...p.daily.map(d => d.completed));
  const cards = [
    ['today', 'sun', 'Due today', stats.today, 'One thing at a time'],
    ['overdue', 'clock', 'Overdue', stats.overdue, 'A little attention needed'],
    ['upcoming', 'calendar', 'Upcoming deadlines', stats.upcoming, 'Make room for what’s next'],
  ];
  return `<section class="dashboard-summary" aria-label="Task overview">${cards.map(([filter, glyph, label, count, hint]) => `<button class="summary-card ${filter}" data-summary="${filter}"><span>${icon(glyph, 19)} ${label} ${icon('arrow', 15)}</span><strong>${count}</strong><small>${hint}</small></button>`).join('')}</section>
    <div class="dashboard-insights"><section class="insight-card" aria-labelledby="productivity-title"><div class="insight-heading"><h2 id="productivity-title">A little progress, every day</h2><span>${prettyDate(p.week_start)} – ${prettyDate(p.week_end)}</span></div><div class="productivity-totals"><div><strong data-stat="completed-today">${p.today}</strong><span>Completed today</span></div><div><strong data-stat="completed-week">${p.week}</strong><span>Completed this week</span></div></div><div class="weekly-chart" role="img" aria-label="Completed tasks this week: ${p.daily.map(d => `${prettyDate(d.date, { weekday: 'long' })}: ${d.completed}`).join(', ')}">${p.daily.map(d => `<div class="chart-day"><span>${d.completed}</span><div class="chart-column"><i style="height:${d.completed ? Math.max(5, d.completed / max * 100) : 0}%"></i></div><small>${prettyDate(d.date, { weekday: 'short' })}</small></div>`).join('')}</div><p class="insight-note">Based on completion time · Monday–Sunday</p></section>
    <section class="insight-card" aria-labelledby="project-progress-title"><div class="insight-heading"><h2 id="project-progress-title">Project progress</h2><button class="text-button" data-action="new-project">${icon('plus', 15)} New</button></div><div class="project-progress-list">${projects.length ? projects.map(project => `<div class="project-progress-item"><div class="project-progress-heading"><button data-project="${project.id}"><span class="project-dot ${project.color}"></span>${escape(project.name)}</button><button class="icon-button" data-edit-project="${project.id}" aria-label="Manage ${escape(project.name)}">${icon('edit', 15)}</button></div><div class="goal-progress-label"><span>${project.done} of ${project.total} completed</span><strong>${project.completion_rate}%</strong></div><div class="progress-track" role="progressbar" aria-label="${escape(project.name)} completion rate" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${project.completion_rate}"><span style="width:${project.completion_rate}%"></span></div></div>`).join('') : '<p class="insight-note">Create a project to bring related tasks together and track its completion rate.</p>'}</div></section></div>`;
}

export function deadlinesCard(tasks, escape, prettyDate) {
  return `<section class="deadline-card"><div class="rail-heading"><h2>Next deadlines</h2><button class="icon-button" data-view="upcoming" aria-label="View upcoming tasks">${icon('arrow', 17)}</button></div>${tasks.length ? tasks.map(t => `<button class="deadline-item" data-edit-task="${t.id}"><span>${escape(t.title)}</span><small>${icon('calendar', 12)} ${prettyDate(t.due_date)}</small></button>`).join('') : '<p class="insight-note">No upcoming deadlines. A little room to plan ahead.</p>'}</section>`;
}
