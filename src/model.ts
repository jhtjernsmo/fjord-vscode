// Fjord's JSON shapes (from `fjord --json`) and pure helpers for showing them.

export interface Project {
  id: number
  name: string
  slug: string
}

export interface Status {
  id: number
  name: string
  is_done: boolean
}

export interface Task {
  id: number
  project_id: number
  status_id: number
  title: string
  body_md: string
  priority: number
  due_at: string | null
  branch: string | null
  parent_id: number | null
  archived_at: string | null
}

export interface Column {
  status: Status
  tasks: Task[]
}

export interface Board {
  project: Project
  columns: Column[]
}

export interface Workspace {
  project: Project
  branch: string
  task: Task | null
}

const PRIORITY = ['', 'low', 'medium', 'high']
const PRIORITY_ARROW = ['', '↓', '→', '↑']

export function priorityLabel(priority: number): string {
  return PRIORITY[priority] ?? ''
}

/** "↑ high · due 20 Oct" style detail for a task row. */
export function taskDetail(task: Task, today: Date): string {
  const parts: string[] = []
  if (task.priority > 0) parts.push(`${PRIORITY_ARROW[task.priority]} ${priorityLabel(task.priority)}`)
  if (task.due_at) parts.push(dueLabel(task.due_at, today))
  return parts.join(' · ')
}

export function dueLabel(due: string, today: Date): string {
  const [y, m, d] = due.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const days = Math.round((date.getTime() - start.getTime()) / 86_400_000)
  if (days < 0) return `overdue ${-days}d`
  if (days === 0) return 'due today'
  if (days === 1) return 'due tomorrow'
  return `due ${date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
}

export function isOverdue(task: Task, today: Date): boolean {
  return !!task.due_at && dueLabel(task.due_at, today).startsWith('overdue')
}

/** Top-level tasks of a column; subtasks show under their parent instead. */
export function topLevel(column: Column, all: Task[]): Task[] {
  const ids = new Set(all.map((t) => t.id))
  return column.tasks.filter((t) => !t.parent_id || !ids.has(t.parent_id))
}

export function subtasksOf(parent: Task, all: Task[]): Task[] {
  return all.filter((t) => t.parent_id === parent.id)
}

export function allTasks(board: Board): Task[] {
  return board.columns.flatMap((c) => c.tasks)
}

export function statusOf(task: Task, board: Board): Status | undefined {
  return board.columns.find((c) => c.status.id === task.status_id)?.status
}

/** "#12 Fix push notifications", for commit messages and chat. */
export function taskRef(task: Task): string {
  return `#${task.id} ${task.title}`
}

/** A read-only Markdown view of a task. */
export function taskMarkdown(task: Task, board: Board | null, today: Date): string {
  const status = board ? statusOf(task, board)?.name : undefined
  const meta = [status, taskDetail(task, today), task.branch ? `\`${task.branch}\`` : ''].filter(Boolean).join(' · ')
  const body = task.body_md.trim() || '_No description._'
  return `# #${task.id} ${task.title}\n\n${meta}\n\n${body}\n`
}
