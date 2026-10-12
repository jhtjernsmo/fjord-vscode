// Puts "#12 " in the Source Control message box while you work on task 12.
import * as vscode from 'vscode'
import { commitPrefix } from './model'
import type { Task } from './model'

interface GitRepository {
  rootUri: vscode.Uri
  inputBox: { value: string }
}
interface GitApi {
  repositories: GitRepository[]
}

export class CommitMessages {
  /** Repo root → task id we already filled in, so a cleared box stays cleared. */
  private readonly filled = new Map<string, number>()

  private api(): GitApi | undefined {
    const git = vscode.extensions.getExtension<{ getAPI(version: 1): GitApi }>('vscode.git')
    return git?.isActive ? git.exports.getAPI(1) : undefined
  }

  update(repoPath: string, task: Task | null): void {
    const template = vscode.workspace.getConfiguration('fjord').get<string>('commitPrefix', '#{id} ')
    const repo = this.api()?.repositories.find((r) => samePath(r.rootUri.fsPath, repoPath))
    if (!repo) return
    if (!task || !template) {
      this.filled.delete(repoPath)
      return
    }
    if (this.filled.get(repoPath) === task.id) return
    this.filled.set(repoPath, task.id)
    if (!repo.inputBox.value.trim()) repo.inputBox.value = commitPrefix(template, task)
  }
}

function samePath(a: string, b: string): boolean {
  const norm = (p: string) => p.replace(/[\\/]+$/, '')
  return process.platform === 'win32' ? norm(a).toLowerCase() === norm(b).toLowerCase() : norm(a) === norm(b)
}
