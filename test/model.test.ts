import { test } from 'node:test'
import * as assert from 'node:assert/strict'
import { dueLabel, isOverdue, subtasksOf, taskDetail, taskMarkdown, taskRef, topLevel } from '../src/model'
import type { Board, Task } from '../src/model'

const task = (id: number, extra: Partial<Task> = {}): Task => ({
  id,
  project_id: 1,
  status_id: 1,
  title: `Task ${id}`,
  body_md: '',
  priority: 0,
  due_at: null,
  branch: null,
  parent_id: null,
  archived_at: null,
  ...extra,
})

const today = new Date(2026, 9, 12)

test('due labels count days from today', () => {
  assert.equal(dueLabel('2026-10-12', today), 'due today')
  assert.equal(dueLabel('2026-10-13', today), 'due tomorrow')
  assert.equal(dueLabel('2026-10-09', today), 'overdue 3d')
  assert.equal(dueLabel('2026-10-20', today), 'due 20 Oct')
})

test('detail shows priority and due date when set', () => {
  assert.equal(taskDetail(task(1), today), '')
  assert.equal(taskDetail(task(1, { priority: 3, due_at: '2026-10-12' }), today), '↑ high · due today')
  assert.ok(isOverdue(task(1, { due_at: '2026-10-01' }), today))
  assert.ok(!isOverdue(task(1, { due_at: '2026-10-30' }), today))
})

test('subtasks show under their parent, not at the top level', () => {
  const parent = task(1)
  const child = task(2, { parent_id: 1 })
  const orphan = task(3, { parent_id: 99 })
  const column = { status: { id: 1, name: 'To do', is_done: false }, tasks: [parent, child, orphan] }
  const all = column.tasks
  assert.deepEqual(topLevel(column, all).map((t) => t.id), [1, 3])
  assert.deepEqual(subtasksOf(parent, all).map((t) => t.id), [2])
})

test('references and markdown use the task number', () => {
  const t = task(12, { title: 'Fix push', branch: 'fix/12-fix-push', body_md: 'Details' })
  assert.equal(taskRef(t), '#12 Fix push')
  const board: Board = { project: { id: 1, name: 'Demo', slug: 'demo' }, columns: [{ status: { id: 1, name: 'To do', is_done: false }, tasks: [t] }] }
  const md = taskMarkdown(t, board, today)
  assert.match(md, /^# #12 Fix push/)
  assert.match(md, /To do · `fix\/12-fix-push`/)
  assert.match(md, /Details/)
  assert.match(taskMarkdown(task(5), null, today), /_No description._/)
})

test('import summary mentions only what changed', async () => {
  const { importSummary } = await import('../src/model')
  assert.equal(importSummary({ created: [], updated: 3, closed: 0, unmapped: 0 }), null)
  assert.equal(importSummary({ created: [task(1)], updated: 0, closed: 0, unmapped: 0 }), '1 new task from Azure Boards')
  assert.equal(importSummary({ created: [task(1), task(2)], updated: 0, closed: 1, unmapped: 0 }), '2 new tasks from Azure Boards, 1 closed')
})
