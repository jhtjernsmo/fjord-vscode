# Fjord for VS Code

Your [Fjord](https://jhtjernsmo.github.io/fjord/) board next to your code.

- **Status bar:** the task for the branch you're on, like `#12 Fix push notifications`. Click it for actions.
- **Fjord view in the Explorer:** the board of the project linked to this folder, column by column, with priority, due dates and subtasks.
- **Start a task:** pick a task and Fjord checks out its branch (created the first time).
- **Move, finish and open pull requests** for tasks without leaving the editor.
- **Show a task** as a Markdown preview, or copy `#12 Title` for a commit message.

Everything runs locally through the `fjord` command-line tool, the same way the app and AI agents use it. The extension never deletes anything.

## Requirements

- The `fjord` CLI, version 0.2.18 or later, on your `PATH` (or set `fjord.cliPath`). Get it from the [releases page](https://github.com/jhtjernsmo/fjord/releases/latest) or with `brew install jhtjernsmo/fjord/fjord-cli`.
- A Fjord project linked to the folder's repository: open the project's Git tab in Fjord, or run `fjord git link <project> .`.

## Commands

| Command | What it does |
|---|---|
| Fjord: Start Task | Check out the branch for a task |
| Fjord: New Task | Add a task to the linked project |
| Fjord: Move Task… | Move a task to another column |
| Fjord: Mark Task as Done | Move a task to the done column |
| Fjord: Open Pull Request for Task | Push the task's branch and open a pull request |
| Fjord: Current Task Actions | The same menu as clicking the status bar |

Without a task argument, the commands use the task on the current branch, or ask.

## Settings

| Setting | Default | |
|---|---|---|
| `fjord.cliPath` | `fjord` | Path to the CLI |
| `fjord.refreshSeconds` | `30` | How often to refresh while the window is focused |
| `fjord.showDoneTasks` | `false` | List the tasks in done columns, not just their count |
