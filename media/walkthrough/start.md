# Start a task

**Fjord: Start Task** checks out the task's branch, creating it the first time, and moves the task to *In progress*.

While you're on that branch:

- the status bar shows `#12 Title`
- an empty commit message starts with `#12 ` (change or turn off with `fjord.commitPrefix`)
- **Open Pull Request** pushes the branch and opens a PR
