// Runs the fjord command-line tool and parses its JSON output.
import { execFile } from 'node:child_process'
import type { Board, ExternalLink, ImportReport, Project, Status, Task, Workspace } from './model'

const TIMEOUT_MS = 60_000

export class CliMissing extends Error {}
export class CliTooOld extends Error {}

export class Fjord {
  constructor(private readonly cliPath: () => string) {}

  private run<T>(args: string[], cwd?: string): Promise<T> {
    return new Promise((resolve, reject) => {
      execFile(this.cliPath(), ['--json', ...args], { cwd, timeout: TIMEOUT_MS, maxBuffer: 16 * 1024 * 1024 }, (err, stdout, stderr) => {
        if (err) {
          if ((err as NodeJS.ErrnoException).code === 'ENOENT') return reject(new CliMissing(this.cliPath()))
          const message = stderr.toString().trim().replace(/^fjord: /, '') || err.message
          if (/unrecognized subcommand 'which'/.test(message)) return reject(new CliTooOld(message))
          return reject(new Error(message))
        }
        try {
          resolve(JSON.parse(stdout.toString()) as T)
        } catch {
          reject(new Error(`unexpected output from fjord: ${stdout.toString().slice(0, 200)}`))
        }
      })
    })
  }

  /** The project linked to the repository containing `folder`, or null. */
  which(folder: string): Promise<Workspace | null> {
    return this.run<Workspace | null>(['git', 'which', folder], folder)
  }

  board(project: string): Promise<Board> {
    return this.run<Board>(['project', 'show', project])
  }

  columns(project: string): Promise<Status[]> {
    return this.run<Status[]>(['column', 'list', project])
  }

  task(id: number): Promise<Task> {
    return this.run<Task>(['task', 'show', String(id)])
  }

  addTask(project: string, title: string, body = ''): Promise<Task> {
    return this.run<Task>(['task', 'add', project, title, '--body', body])
  }

  projects(): Promise<Project[]> {
    return this.run<Project[]>(['project', 'list'])
  }

  addProject(name: string): Promise<Project> {
    return this.run<Project>(['project', 'add', name])
  }

  azureImport(): Promise<ImportReport> {
    return this.run<ImportReport>(['azure', 'import'])
  }

  /** Work item links for imported tasks; empty with an older CLI. */
  azureLinks(project: string): Promise<ExternalLink[]> {
    return this.run<ExternalLink[]>(['azure', 'links', project]).catch(() => [])
  }

  link(project: string, folder: string): Promise<unknown> {
    return this.run(['git', 'link', project, folder])
  }

  moveTask(id: number, status: number): Promise<Task> {
    return this.run<Task>(['task', 'move', String(id), String(status)])
  }

  doneTask(id: number): Promise<Task> {
    return this.run<Task>(['task', 'done', String(id)])
  }

  startBranch(id: number): Promise<{ branch: string; created: boolean }> {
    return this.run(['git', 'branch', String(id)])
  }

  openPullRequest(id: number): Promise<{ number: number; url: string; title: string }> {
    return this.run(['git', 'pr', String(id)])
  }
}
