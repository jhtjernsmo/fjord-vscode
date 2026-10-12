# Fjord for VS Code

Your [Fjord](https://jhtjernsmo.github.io/fjord/) board next to your code.

- **Status bar:** the task for the branch you're on, like `#12 Fix push notifications`. Click it for actions.
- **Fjord view in the Explorer:** the board of the project linked to this folder, column by column, with priority, due dates and subtasks.
- **Start a task:** pick a task and Fjord checks out its branch (created the first time).
- **Move, finish and open pull requests** for tasks without leaving the editor.
- **Show a task** as a Markdown preview, or copy `#12 Title` for a commit message.
- **Commit messages** start with `#12 ` while you're on the task's branch.
- **TODO to task:** right-click a TODO and turn it into a task that links back to the line.
- **Instant sync** with the Fjord app and the CLI.

Everything runs locally through the `fjord` command-line tool, the same way the app and AI agents use it. The extension never deletes anything.

## Requirements

- The `fjord` CLI, version 0.2.18 or later. The extension finds it on your `PATH`, in Homebrew or cargo, and offers to download it if it's missing (or set `fjord.cliPath`).
- A git repository linked to a Fjord project. If the folder isn't linked, the Fjord view has a **Link to a project** button.

## Commands

| Command | What it does |
|---|---|
| Fjord: Start Task | Check out the branch for a task |
| Fjord: New Task | Add a task to the linked project |
| Fjord: Move Task… | Move a task to another column |
| Fjord: Mark Task as Done | Move a task to the done column |
| Fjord: Open Pull Request for Task | Push the task's branch and open a pull request |
| Fjord: Current Task Actions (`Ctrl+Alt+F`) | The same menu as clicking the status bar |
| Fjord: Create Task from Selection | Turn the selected TODO into a task |
| Fjord: Link Folder to Project… | Link this repository to a Fjord project |
| Fjord: Install the fjord CLI | Download the CLI from the latest Fjord release |

Without a task argument, the commands use the task on the current branch, or ask.

## Settings

| Setting | Default | |
|---|---|---|
| `fjord.cliPath` | (auto) | Path to the CLI; empty finds it automatically |
| `fjord.commitPrefix` | `#{id} ` | Start of an empty commit message on a task's branch; empty turns it off |
| `fjord.refreshSeconds` | `30` | How often to refresh while the window is focused |
| `fjord.showDoneTasks` | `false` | List the tasks in done columns, not just their count |
