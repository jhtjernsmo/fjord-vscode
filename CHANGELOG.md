# Changelog

## 0.3.0

- **Azure Boards:** the extension runs Fjord's Azure Boards import every 10 minutes (with the app's settings), so work items assigned to you arrive even when the Fjord app isn't open. Turn it off with `fjord.azureImport`, or run *Fjord: Import from Azure Boards* yourself.
- Imported tasks have an Azure icon, a link to the work item in the tooltip, and **Open in Azure DevOps** in the right-click menu.

## 0.2.0

- **Link a folder from VS Code:** an unlinked folder shows a button that lists your Fjord projects, or creates a new one.
- **Finds the CLI by itself** on your PATH, in Homebrew, cargo and other usual places, and can download it from the latest Fjord release. No settings needed.
- **Commit message:** while you're on task 12's branch, an empty commit message starts with `#12 ` (`fjord.commitPrefix`).
- **Instant sync:** the board updates the moment something changes in Fjord or the CLI, not every 30 seconds.
- **TODO to task:** select a TODO (or put the cursor on its line), right-click and choose *Fjord: Create Task from Selection*. The task links back to the file and line.
- **Ctrl+Alt+F** opens the menu for the current task; without one, the status bar offers *Start a task*.
- **Get started** walkthrough on the Welcome page.

## 0.1.0

- First version: the board in the Explorer, the current task in the status bar, and commands to start, move and finish tasks and open pull requests.
