// Fjord for VS Code: the board for the linked project, the task on the current
// branch in the status bar, and commands that call the fjord CLI.
import * as vscode from 'vscode'
import { basename, relative } from 'node:path'
import { BoardView } from './board'
import { CliMissing, CliTooOld, Fjord } from './cli'
import { CommitMessages } from './commit'
import { findCli, installCli } from './locate'
import { allTasks, importSummary, statusOf, taskRef } from './model'
import type { Board, Task, Workspace } from './model'
import { watchData } from './sync'
import { SCHEME, TaskDocuments } from './taskDocument'
import { sourceBody, titleFromSelection } from './todo'

const AZURE_IMPORT_MS = 10 * 60 * 1000
const AZURE_FIRST_IMPORT_MS = 15 * 1000

type State = 'linked' | 'unlinked' | 'noRepo' | 'noCli' | 'tooOld'

export function activate(context: vscode.ExtensionContext): void {
  const config = () => vscode.workspace.getConfiguration('fjord')
  const storage = context.globalStorageUri.fsPath
  let foundCli: string | null = null
  const cliPath = () => config().get<string>('cliPath')?.trim() || foundCli || 'fjord'
  const fjord = new Fjord(cliPath)
  const commits = new CommitMessages()
  const log = vscode.window.createOutputChannel('Fjord')
  const view = new BoardView()
  const tree = vscode.window.createTreeView('fjord.board', { treeDataProvider: view, showCollapseAll: true })
  const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 50)
  statusBar.command = 'fjord.currentTask'

  let workspace: Workspace | null = null
  let board: Board | null = null
  let links = new Map<number, string>()
  let refreshing: Promise<void> | null = null

  const docs = new TaskDocuments(fjord, () => board)

  const setState = (state: State) => vscode.commands.executeCommand('setContext', 'fjord.state', state)

  const folder = (): string | undefined => {
    const active = vscode.window.activeTextEditor?.document.uri
    const owner = active ? vscode.workspace.getWorkspaceFolder(active) : undefined
    return (owner ?? vscode.workspace.workspaceFolders?.[0])?.uri.fsPath
  }

  let loadedFolder: string | undefined

  const load = async () => {
    if (!config().get<string>('cliPath')?.trim() && !foundCli) {
      foundCli = await findCli(storage)
      if (!foundCli) throw new CliMissing('fjord')
    }
    const dir = folder()
    loadedFolder = dir
    workspace = dir ? await fjord.which(dir) : null
    if (!workspace) {
      board = null
      links = new Map()
      return
    }
    const project = String(workspace.project.id)
    const [b, l] = await Promise.all([fjord.board(project), fjord.azureLinks(project)])
    board = b
    links = new Map(l.map((x) => [x.task_id, x.url]))
  }

  const render = () => {
    view.show(board, workspace?.task?.id ?? null, links)
    tree.description = workspace ? workspace.project.name : undefined
    if (!workspace) {
      statusBar.hide()
      return
    }
    const task = workspace.task
    commits.update(workspace.repo.path, task)
    statusBar.text = task ? `$(tasklist) #${task.id} ${short(task.title)}` : '$(tasklist) Start a task'
    statusBar.tooltip = task ? `${taskRef(task)}\n${workspace.project.name} · ${workspace.branch}` : `No Fjord task on ${workspace.branch}. Click to start one.`
    statusBar.show()
  }

  const refresh = (): Promise<void> => {
    refreshing ??= load()
      .then(() => setState(workspace ? 'linked' : 'unlinked'))
      .catch((err: unknown) => {
        workspace = null
        board = null
        if (err instanceof CliMissing) return setState('noCli')
        if (err instanceof CliTooOld) return setState('tooOld')
        log.appendLine(`refresh: ${message(err)}`)
        return setState(/not inside a git repository/.test(message(err)) ? 'noRepo' : 'unlinked')
      })
      .then(render)
      .finally(() => {
        refreshing = null
      })
    return refreshing
  }

  /** Runs a CLI action, reports errors and refreshes afterwards. */
  const act = async <T>(title: string, run: () => Promise<T>): Promise<T | undefined> => {
    try {
      return await vscode.window.withProgress({ location: vscode.ProgressLocation.Window, title: `Fjord: ${title}` }, run)
    } catch (err) {
      vscode.window.showErrorMessage(`Fjord: ${message(err)}`)
      return undefined
    } finally {
      await refresh()
    }
  }

  const openTasks = (): Task[] => (board ? allTasks(board).filter((t) => !statusOf(t, board!)?.is_done) : [])

  const pickTask = async (placeHolder: string, tasks = openTasks()): Promise<Task | undefined> => {
    if (!tasks.length) {
      vscode.window.showInformationMessage('Fjord: no open tasks in this project.')
      return undefined
    }
    const picked = await vscode.window.showQuickPick(
      tasks.map((t) => ({ label: `#${t.id} ${t.title}`, description: board ? statusOf(t, board)?.name : '', task: t })),
      { placeHolder, matchOnDescription: true },
    )
    return picked?.task
  }

  const taskOrCurrent = async (arg: unknown, placeHolder: string): Promise<Task | undefined> => {
    return taskFrom(arg) ?? workspace?.task ?? pickTask(placeHolder)
  }

  const requireProject = (): Workspace | undefined => {
    if (!workspace) vscode.window.showInformationMessage('Fjord: this folder is not linked to a Fjord project.')
    return workspace ?? undefined
  }

  const commands: Record<string, (...args: unknown[]) => unknown> = {
    'fjord.refresh': () => refresh(),

    'fjord.importAzure': async () => {
      const report = await act('importing from Azure Boards', () => fjord.azureImport())
      if (report) vscode.window.showInformationMessage(`Fjord: ${importSummary(report) ?? 'Azure Boards is up to date.'}`)
    },

    'fjord.openInAzure': async (arg) => {
      const task = taskFrom(arg) ?? workspace?.task
      const url = task ? links.get(task.id) : undefined
      if (url) await vscode.env.openExternal(vscode.Uri.parse(url))
      else vscode.window.showInformationMessage('Fjord: this task did not come from Azure Boards.')
    },

    'fjord.installCli': async () => {
      try {
        foundCli = await vscode.window.withProgress(
          { location: vscode.ProgressLocation.Notification, title: 'Fjord: downloading the fjord CLI…' },
          () => installCli(storage),
        )
        vscode.window.showInformationMessage('Fjord: the CLI is installed and ready.')
      } catch (err) {
        vscode.window.showErrorMessage(`Fjord: ${message(err)}`)
      }
      await refresh()
    },

    'fjord.linkFolder': async () => {
      const dir = folder()
      if (!dir) return
      let projects
      try {
        projects = await fjord.projects()
      } catch (err) {
        vscode.window.showErrorMessage(`Fjord: ${message(err)}`)
        return
      }
      const NEW = '$(add) New project…'
      const pick = await vscode.window.showQuickPick(
        [{ label: NEW, slug: '' }, ...projects.map((p) => ({ label: p.name, description: p.slug, slug: p.slug }))],
        { placeHolder: `Link “${basename(dir)}” to which Fjord project?` },
      )
      if (!pick) return
      let slug = pick.slug
      if (pick.label === NEW) {
        const name = (await vscode.window.showInputBox({ prompt: 'Name of the new Fjord project', value: basename(dir) }))?.trim()
        if (!name) return
        const created = await act('creating project', () => fjord.addProject(name))
        if (!created) return
        slug = created.slug
      }
      await act('linking folder', () => fjord.link(slug, dir))
    },

    'fjord.taskFromSelection': async () => {
      const ws = requireProject()
      const editor = vscode.window.activeTextEditor
      if (!ws || !editor) return
      const range = editor.selection.isEmpty ? editor.document.lineAt(editor.selection.active.line).range : editor.selection
      const text = editor.document.getText(range)
      const title = (await vscode.window.showInputBox({ prompt: `New task in ${ws.project.name}`, value: titleFromSelection(text) }))?.trim()
      if (!title) return
      const file = relative(ws.repo.path, editor.document.uri.fsPath).replaceAll('\\', '/')
      const body = sourceBody(file, range.start.line + 1, text)
      const task = await act('adding task', () => fjord.addTask(String(ws.project.id), title, body))
      if (task) vscode.window.setStatusBarMessage(`$(check) Added #${task.id} ${task.title}`, 4000)
    },

    'fjord.newTask': async () => {
      const ws = requireProject()
      if (!ws) return
      const title = (await vscode.window.showInputBox({ prompt: `New task in ${ws.project.name}`, placeHolder: 'Title' }))?.trim()
      if (!title) return
      const task = await act('adding task', () => fjord.addTask(String(ws.project.id), title))
      if (!task) return
      const pick = await vscode.window.showInformationMessage(`Added #${task.id} ${task.title}`, 'Start it')
      if (pick) await vscode.commands.executeCommand('fjord.startTask', task)
    },

    'fjord.startTask': async (arg) => {
      if (!requireProject()) return
      const task = taskFrom(arg) ?? (await pickTask('Start which task? (checks out its branch)'))
      if (!task) return
      const started = await act(`starting #${task.id}`, () => fjord.startBranch(task.id))
      if (started) vscode.window.setStatusBarMessage(`$(git-branch) ${started.created ? 'Created' : 'Switched to'} ${started.branch}`, 5000)
    },

    'fjord.moveTask': async (arg) => {
      if (!requireProject() || !board) return
      const task = await taskOrCurrent(arg, 'Move which task?')
      if (!task) return
      const target = await vscode.window.showQuickPick(
        board.columns.filter((c) => c.status.id !== task.status_id).map((c) => ({ label: c.status.name, id: c.status.id })),
        { placeHolder: `Move #${task.id} to…` },
      )
      if (target) await act(`moving #${task.id}`, () => fjord.moveTask(task.id, target.id))
    },

    'fjord.doneTask': async (arg) => {
      if (!requireProject()) return
      const task = await taskOrCurrent(arg, 'Mark which task as done?')
      if (task) await act(`finishing #${task.id}`, () => fjord.doneTask(task.id))
    },

    'fjord.openPullRequest': async (arg) => {
      if (!requireProject()) return
      const task = await taskOrCurrent(arg, 'Open a pull request for which task?')
      if (!task) return
      const pr = await act(`opening a pull request for #${task.id}`, () => fjord.openPullRequest(task.id))
      if (!pr) return
      const pick = await vscode.window.showInformationMessage(`Pull request #${pr.number}: ${pr.title}`, 'Open in browser')
      if (pick) vscode.env.openExternal(vscode.Uri.parse(pr.url))
    },

    'fjord.showTask': async (arg) => {
      const task = taskFrom(arg) ?? workspace?.task
      if (!task) return
      const uri = TaskDocuments.uri(task)
      docs.refresh(uri)
      await vscode.commands.executeCommand('markdown.showPreview', uri)
    },

    'fjord.copyRef': async (arg) => {
      const task = taskFrom(arg) ?? workspace?.task
      if (!task) return
      await vscode.env.clipboard.writeText(taskRef(task))
      vscode.window.setStatusBarMessage(`Copied ${taskRef(task)}`, 3000)
    },

    'fjord.currentTask': async () => {
      const task = workspace?.task
      const actions = task
        ? [
            { label: '$(preview) Show task', command: 'fjord.showTask' },
            { label: '$(check) Mark as done', command: 'fjord.doneTask' },
            { label: '$(arrow-right) Move to…', command: 'fjord.moveTask' },
            { label: '$(git-pull-request) Open pull request', command: 'fjord.openPullRequest' },
            { label: '$(copy) Copy reference', command: 'fjord.copyRef' },
          ]
        : [
            { label: '$(git-branch) Start a task…', command: 'fjord.startTask' },
            { label: '$(add) New task…', command: 'fjord.newTask' },
          ]
      const pick = await vscode.window.showQuickPick(actions, { placeHolder: task ? taskRef(task) : `No task on ${workspace?.branch ?? 'this branch'}` })
      if (pick) await vscode.commands.executeCommand(pick.command, task)
    },
  }

  for (const [id, handler] of Object.entries(commands)) {
    context.subscriptions.push(vscode.commands.registerCommand(id, handler))
  }

  // Branch switches, focus changes, settings and a slow poll keep the board current.
  const head = vscode.workspace.createFileSystemWatcher('**/.git/HEAD')
  let timer: NodeJS.Timeout | undefined
  const schedule = () => {
    if (timer) clearInterval(timer)
    const seconds = Math.max(5, config().get<number>('refreshSeconds', 30))
    timer = setInterval(() => {
      if (vscode.window.state.focused) refresh()
    }, seconds * 1000)
  }
  schedule()

  // The same Azure Boards import as the desktop app, so it runs without Fjord open.
  let azureOff = false
  const autoImport = async () => {
    if (azureOff || !workspace || !vscode.window.state.focused) return
    if (config().get<string>('azureImport', 'auto') !== 'auto') return
    try {
      const summary = importSummary(await fjord.azureImport())
      if (summary) {
        vscode.window.setStatusBarMessage(`$(azure) ${summary}`, 8000)
        await refresh()
      }
    } catch (err) {
      // Not set up in Fjord, or offline: try again only if the user asks.
      if (/isn't set up|unrecognized subcommand/.test(message(err))) azureOff = true
      log.appendLine(`azure import: ${message(err)}`)
    }
  }
  const azureTimer = setInterval(autoImport, AZURE_IMPORT_MS)
  setTimeout(autoImport, AZURE_FIRST_IMPORT_MS)

  context.subscriptions.push(
    { dispose: () => clearInterval(azureTimer) },
    log,
    tree,
    statusBar,
    head,
    vscode.workspace.registerTextDocumentContentProvider(SCHEME, docs),
    head.onDidChange(() => refresh()),
    head.onDidCreate(() => refresh()),
    vscode.window.onDidChangeWindowState((s) => s.focused && refresh()),
    vscode.window.onDidChangeActiveTextEditor(() => {
      if (folder() !== loadedFolder) refresh()
    }),
    vscode.workspace.onDidChangeWorkspaceFolders(() => refresh()),
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (!e.affectsConfiguration('fjord')) return
      schedule()
      refresh()
    }),
    { dispose: () => timer && clearInterval(timer) },
    { dispose: watchData(() => refresh()) },
  )

  refresh()
}

export function deactivate(): void {}

function isTask(value: unknown): value is Task {
  return typeof value === 'object' && value !== null && 'id' in value && 'title' in value && 'status_id' in value
}

/** The task a command was called with: a task, or a row in the Fjord view (which wraps one). */
function taskFrom(arg: unknown): Task | undefined {
  if (isTask(arg)) return arg
  if (typeof arg === 'object' && arg !== null && 'task' in arg && isTask((arg as { task: unknown }).task)) return (arg as { task: Task }).task
  return undefined
}

function short(title: string, max = 40): string {
  return title.length > max ? `${title.slice(0, max - 1)}…` : title
}

function message(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}
