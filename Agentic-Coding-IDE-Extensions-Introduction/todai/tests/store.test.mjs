import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createStore } from '../lib/store.mjs';
import { DatabaseSync, backup } from 'node:sqlite';

test('tasks persist after closing, and stale writes cannot overwrite data', () => {
  const dir = mkdtempSync(join(tmpdir(), 'todai-test-')); const file = join(dir, 'test.sqlite');
  let store = createStore(file);
  try {
    const task = store.dispatch('tasks.create', { body: { title: 'A real task', due_date: '2026-10-05' } });
    store.dispatch('tasks.update', { id: task.id, body: { title: 'Updated', revision: 1 } });
    assert.throws(() => store.dispatch('tasks.update', { id: task.id, body: { title: 'Stale', revision: 1 } }), { status: 409 });
    assert.throws(() => store.dispatch('tasks.delete', { id: task.id, body: { revision: 1 } }), { status: 409 });
    store.close(); store = createStore(file);
    assert.equal(store.dispatch('tasks.get', { id: task.id }).title, 'Updated');
    assert.equal(store.db.prepare('PRAGMA integrity_check').get().integrity_check, 'ok');
  } finally { store.close(); rmSync(dir, { recursive: true, force: true }); }
});
test('filters paginate, search escapes wildcard input, and projects preserve tasks on deletion', () => {
  const s = createStore(':memory:');
  try {
    const p = s.dispatch('projects.create', { body: { name: 'Work' } });
    for (let i = 0; i < 85; i++) s.dispatch('tasks.create', { body: { title: `Task ${i}`, project_id: p.id, due_date: i < 42 ? '2026-10-04' : '2026-10-06' } });
    const first = s.dispatch('tasks.list', { query: { view: 'today', today: '2026-10-05' } });
    const second = s.dispatch('tasks.list', { query: { view: 'today', today: '2026-10-05', offset: 40 } });
    assert.equal(first.total, 42); assert.equal(first.tasks.length, 40); assert.equal(second.tasks.length, 2);
    assert.equal(new Set([...first.tasks, ...second.tasks].map(t => t.id)).size, 42);
    assert.equal(s.dispatch('tasks.list', { query: { view: 'upcoming', today: '2026-10-05' } }).total, 43);
    s.dispatch('tasks.create', { body: { title: '100% effort_' } });
    assert.equal(s.dispatch('tasks.list', { query: { search: '%', view: 'all' } }).total, 1);
    s.dispatch('projects.delete', { id: p.id });
    assert.equal(s.dispatch('tasks.list', { query: { view: 'inbox' } }).total, 86);
  } finally { s.close(); }
});
test('goal progress follows task completion and invalid input does not persist', () => {
  const s = createStore(':memory:');
  try {
    const g = s.dispatch('goals.create', { body: { title: 'Learn' } });
    const t = s.dispatch('tasks.create', { body: { title: 'Read', goal_id: g.id, due_date: '2026-10-05' } });
    s.dispatch('tasks.update', { id: t.id, body: { completed: 1, revision: 1 } });
    const d = s.dispatch('dashboard', { query: { today: '2026-10-05' } });
    assert.equal(d.goals[0].done, 1); assert.equal(d.stats.today_done, 1);
    for (const body of [{ title: '' }, { title: 'x', due_date: '2026-02-30' }, { title: 'x', priority: 'invalid' }, { title: 'x', goal_id: 'missing' }, { title: 1 }]) assert.throws(() => s.dispatch('tasks.create', { body }), { status: 400 });
    assert.equal(s.dispatch('export').tasks.length, 1);
    s.dispatch('goals.delete', { id: g.id, body: { revision: 1 } });
    assert.equal(s.dispatch('tasks.get', { id: t.id }).goal_id, null);
  } finally { s.close(); }
});
test('sample data is an explicit, atomic, one-time action', () => {
  const s = createStore(':memory:');
  try {
    assert.equal(s.dispatch('export').tasks.length, 0);
    s.dispatch('demo', { body: { today: '2026-10-05' } });
    assert.equal(s.dispatch('dashboard', { query: { today: '2026-10-05' } }).stats.today, 5);
    assert.throws(() => s.dispatch('demo'), { status: 409 });
    assert.equal(s.dispatch('export').tasks.length, 8);
  } finally { s.close(); }
});

test('an online backup restores a consistent database while the source remains open', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'todai-backup-'));
  const s = createStore(join(dir, 'source.sqlite'));
  let restored;
  try {
    s.dispatch('demo', { body: { today: '2026-10-05' } });
    const destination = join(dir, 'snapshot.sqlite');
    await backup(s.db, destination);
    s.dispatch('tasks.create', { body: { title: 'After the snapshot' } });
    restored = new DatabaseSync(destination, { readOnly: true });
    assert.equal(restored.prepare('SELECT COUNT(*) AS n FROM tasks').get().n, 8);
    assert.equal(restored.prepare('PRAGMA integrity_check').get().integrity_check, 'ok');
    assert.equal(restored.prepare('PRAGMA foreign_key_check').all().length, 0);
  } finally { restored?.close(); s.close(); rmSync(dir, { recursive: true, force: true }); }
});
