# Graph Report - fjord-vscode  (2026-11-22)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 182 nodes · 353 edges · 8 communities
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 15 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Community 0
- Community 1
- Community 2
- Community 3
- Community 4
- Community 5
- Community 6
- Community 7

## God Nodes (most connected - your core abstractions)
1. `activate()` - 34 edges
2. `Fjord` - 21 edges
3. `Task` - 12 edges
4. `Board` - 10 edges
5. `compilerOptions` - 9 edges
6. `contributes` - 8 edges
7. `BoardView` - 7 edges
8. `TaskDocuments` - 7 edges
9. `taskDetail()` - 7 edges
10. `allTasks()` - 6 edges

## Surprising Connections (you probably didn't know these)
- `activate()` --calls--> `BoardView`  [EXTRACTED]
  src/extension.ts → src/board.ts
- `activate()` --calls--> `CommitMessages`  [EXTRACTED]
  src/extension.ts → src/commit.ts
- `activate()` --calls--> `findCli()`  [EXTRACTED]
  src/extension.ts → src/locate.ts
- `activate()` --calls--> `installCli()`  [EXTRACTED]
  src/extension.ts → src/locate.ts
- `activate()` --calls--> `allTasks()`  [EXTRACTED]
  src/extension.ts → src/model.ts

## Import Cycles
- None detected.

## Communities (8 total, 0 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.14
Nodes (11): CliMissing, CliTooOld, Fjord, activate(), ExternalLink, ImportReport, Project, Status (+3 more)

### Community 1 - "Community 1"
Cohesion: 0.07
Nodes (31): activationEvents, categories, description, devDependencies, @types/node@^20.0.0, @types/vscode@~1.95.0, typescript@~5.9.0, @vscode/vsce@^4.0.0 (+23 more)

### Community 2 - "Community 2"
Cohesion: 0.15
Nodes (20): BoardView, escape(), icon(), Node, tooltip(), allTasks(), Board, Column (+12 more)

### Community 3 - "Community 3"
Cohesion: 0.08
Nodes (26): properties, title, configuration, default, description, enum, enumDescriptions, type (+18 more)

### Community 4 - "Community 4"
Cohesion: 0.13
Nodes (14): CommitMessages, GitApi, GitRepository, samePath(), isTask(), message(), short(), State (+6 more)

### Community 5 - "Community 5"
Cohesion: 0.23
Nodes (10): assetName(), atLeast(), candidates(), download(), findCli(), installCli(), MIN_VERSION, version() (+2 more)

### Community 6 - "Community 6"
Cohesion: 0.17
Nodes (12): contributes, commands, keybindings, menus, views, viewsWelcome, walkthroughs, commandPalette (+4 more)

### Community 7 - "Community 7"
Cohesion: 0.18
Nodes (10): compilerOptions, lib, module, outDir, rootDir, skipLibCheck, sourceMap, strict (+2 more)

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `contributes` connect `Community 6` to `Community 1`, `Community 3`?**
  _High betweenness centrality (0.093) - this node is a cross-community bridge._
- **Are the 14 inferred relationships involving `activate()` (e.g. with `.show()` and `.addProject()`) actually correct?**
  _`activate()` has 14 INFERRED edges - model-reasoned connections that need verification._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.14204545454545456 - nodes in this community are weakly interconnected._
- **Why does `configuration` connect `Community 3` to `Community 6`?**
  _High betweenness centrality (0.069) - this node is a cross-community bridge._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.07056451612903226 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.1477832512315271 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.07692307692307693 - nodes in this community are weakly interconnected._