// The Fjord view in the Explorer: columns, then tasks, then subtasks.
import * as vscode from 'vscode'
import { allTasks, isOverdue, subtasksOf, taskDetail, topLevel } from './model'
import type { Board, Column, Task } from './model'

type Node = { kind: 'column'; column: Column } | { kind: 'task'; task: Task; done: boolean }

export class BoardView implements vscode.TreeDataProvider<Node> {
  private readonly changed = new vscode.EventEmitter<void>()
  readonly onDidChangeTreeData = this.changed.event
  private board: Board | null = null
  private currentTaskId: number | null = null
  private links = new Map<number, string>()

  show(board: Board | null, currentTaskId: number | null, links: Map<number, string> = new Map()): void {
    this.board = board
    this.currentTaskId = currentTaskId
    this.links = links
    this.changed.fire()
  }

  getTreeItem(node: Node): vscode.TreeItem {
    if (node.kind === 'column') {
      const { status, tasks } = node.column
      const showDone = vscode.workspace.getConfiguration('fjord').get<boolean>('showDoneTasks', false)
      const expandable = tasks.length > 0 && (!status.is_done || showDone)
      const item = new vscode.TreeItem(
        status.name,
        expandable ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.None,
      )
      item.description = String(tasks.length)
      item.iconPath = new vscode.ThemeIcon(status.is_done ? 'pass' : 'circle-large-outline')
      item.contextValue = 'column'
      return item
    }
    const { task, done } = node
    const today = new Date()
    const children = this.board ? subtasksOf(task, allTasks(this.board)) : []
    const item = new vscode.TreeItem(
      `#${task.id} ${task.title}`,
      children.length ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None,
    )
    item.id = `task-${task.id}`
    item.description = done ? '' : taskDetail(task, today)
    const azure = this.links.get(task.id)
    item.tooltip = tooltip(task, azure)
    item.contextValue = `${done ? 'task-done' : 'task'}${azure ? '.azure' : ''}`
    item.iconPath = icon(task, done, task.id === this.currentTaskId, today, !!azure)
    item.command = { command: 'fjord.showTask', title: 'Show Task', arguments: [task] }
    return item
  }

  getChildren(node?: Node): Node[] {
    if (!this.board) return []
    const board = this.board
    const all = allTasks(board)
    if (!node) return board.columns.map((column) => ({ kind: 'column', column }))
    if (node.kind === 'column') {
      return topLevel(node.column, all).map((task) => ({ kind: 'task', task, done: node.column.status.is_done }))
    }
    return subtasksOf(node.task, all).map((task) => ({
      kind: 'task',
      task,
      done: !!board.columns.find((c) => c.status.id === task.status_id)?.status.is_done,
    }))
  }
}

function icon(task: Task, done: boolean, current: boolean, today: Date, azure: boolean): vscode.ThemeIcon {
  if (current) return new vscode.ThemeIcon('git-branch', new vscode.ThemeColor('charts.blue'))
  if (done) return new vscode.ThemeIcon('pass-filled', new vscode.ThemeColor('charts.green'))
  if (isOverdue(task, today)) return new vscode.ThemeIcon('circle-filled', new vscode.ThemeColor('charts.red'))
  if (task.branch) return new vscode.ThemeIcon('git-branch')
  if (azure) return new vscode.ThemeIcon('azure')
  return new vscode.ThemeIcon('circle-outline')
}

function tooltip(task: Task, azure?: string): vscode.MarkdownString {
  const md = new vscode.MarkdownString(undefined, true)
  md.appendMarkdown(`**#${task.id} ${escape(task.title)}**`)
  if (azure) md.appendMarkdown(`\n\n$(azure) [Azure Boards work item](${azure})`)
  if (task.branch) md.appendMarkdown(`\n\n$(git-branch) \`${task.branch}\``)
  const body = task.body_md.trim()
  if (body) md.appendMarkdown(`\n\n---\n\n${body.length > 600 ? `${body.slice(0, 600)}…` : body}`)
  return md
}

function escape(text: string): string {
  return text.replace(/[\\`*_{}[\]()#+\-.!|]/g, '\\$&')
}
