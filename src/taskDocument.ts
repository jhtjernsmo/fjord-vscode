// Read-only Markdown documents for tasks (fjord-task:/12.md), shown as a preview.
import * as vscode from 'vscode'
import { taskMarkdown } from './model'
import type { Board } from './model'
import type { Fjord } from './cli'

export const SCHEME = 'fjord-task'

export class TaskDocuments implements vscode.TextDocumentContentProvider {
  private readonly changed = new vscode.EventEmitter<vscode.Uri>()
  readonly onDidChange = this.changed.event

  constructor(private readonly fjord: Fjord, private readonly board: () => Board | null) {}

  async provideTextDocumentContent(uri: vscode.Uri): Promise<string> {
    const id = Number(uri.path.split('/')[1])
    try {
      return taskMarkdown(await this.fjord.task(id), this.board(), new Date())
    } catch (err) {
      return `# Task #${id}\n\n${err instanceof Error ? err.message : String(err)}\n`
    }
  }

  /** fjord-task:/12/#12 Title.md, so the preview tab shows the task's name. */
  static uri(task: { id: number; title: string }): vscode.Uri {
    const name = `#${task.id} ${task.title}`.replace(/[\\/]/g, '-').slice(0, 60)
    return vscode.Uri.from({ scheme: SCHEME, path: `/${task.id}/${name}.md` })
  }

  refresh(uri: vscode.Uri): void {
    this.changed.fire(uri)
  }
}
