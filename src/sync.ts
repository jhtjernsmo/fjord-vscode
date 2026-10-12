// Watches Fjord's data folder so changes made in the app or by an agent show up at once.
import { watch } from 'node:fs'
import type { FSWatcher } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const DEBOUNCE_MS = 300

/** The folder Fjord keeps fjord.db in (mirrors fjord-core's Store::default_dir). */
export function dataDir(platform: NodeJS.Platform, env: NodeJS.ProcessEnv, home: string): string {
  if (env.FJORD_DATA_DIR) return env.FJORD_DATA_DIR
  if (platform === 'darwin') return join(home, 'Library', 'Application Support', 'fjord')
  if (platform === 'win32') return join(env.APPDATA ?? join(home, 'AppData', 'Roaming'), 'fjord')
  return join(env.XDG_DATA_HOME || join(home, '.local', 'share'), 'fjord')
}

/** Calls `onChange` (debounced) when fjord.db or its WAL changes. Returns a disposer. */
export function watchData(onChange: () => void): () => void {
  let timer: NodeJS.Timeout | undefined
  let watcher: FSWatcher | undefined
  try {
    watcher = watch(dataDir(process.platform, process.env, homedir()), (_event, file) => {
      if (file && !String(file).startsWith('fjord.db')) return
      if (timer) clearTimeout(timer)
      timer = setTimeout(onChange, DEBOUNCE_MS)
    })
  } catch {
    // No data folder yet (Fjord never ran); polling still covers it.
  }
  return () => {
    if (timer) clearTimeout(timer)
    watcher?.close()
  }
}
