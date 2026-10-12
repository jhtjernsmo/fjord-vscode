// Finds the fjord CLI (PATH, Homebrew, cargo, a copy we downloaded) and can
// download it from the latest GitHub release.
import { execFile } from 'node:child_process'
import { chmod, mkdir, rename, rm, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { get } from 'node:https'
import { homedir } from 'node:os'
import { join } from 'node:path'

const RELEASES = 'https://github.com/jhtjernsmo/fjord/releases/latest/download/'
const MAX_REDIRECTS = 5

/** The release asset for this machine, or null when there is no build for it. */
export function assetName(platform: NodeJS.Platform, arch: string): string | null {
  if (platform === 'linux' && arch === 'x64') return 'fjord-cli-x86_64-unknown-linux-gnu'
  if (platform === 'darwin' && arch === 'arm64') return 'fjord-cli-aarch64-apple-darwin'
  if (platform === 'win32' && arch === 'x64') return 'fjord-cli-x86_64-pc-windows-msvc.exe'
  return null
}

/** Places the CLI is usually installed, most likely first. */
export function candidates(platform: NodeJS.Platform, home: string, env: NodeJS.ProcessEnv, storage: string): string[] {
  const exe = platform === 'win32' ? 'fjord.exe' : 'fjord'
  const list = [
    'fjord',
    join(storage, 'bin', exe),
    join(home, '.cargo', 'bin', exe),
    join(home, '.local', 'bin', exe),
    join(home, 'bin', exe),
  ]
  if (platform === 'darwin') list.push('/opt/homebrew/bin/fjord', '/usr/local/bin/fjord')
  if (platform === 'linux') list.push('/home/linuxbrew/.linuxbrew/bin/fjord', '/usr/local/bin/fjord')
  if (platform === 'win32' && env.LOCALAPPDATA) list.push(join(env.LOCALAPPDATA, 'Programs', 'fjord', exe))
  return list
}

/** The version a CLI reports ("fjord 0.2.18" → [0, 2, 18]), or null if it doesn't run. */
function version(path: string): Promise<number[] | null> {
  return new Promise((resolve) => {
    execFile(path, ['--version'], { timeout: 5000 }, (err, stdout) => {
      const m = /fjord\S*\s+(\d+)\.(\d+)\.(\d+)/i.exec(stdout?.toString() ?? '')
      resolve(err || !m ? null : [Number(m[1]), Number(m[2]), Number(m[3])])
    })
  })
}

export const MIN_VERSION = [0, 2, 18]

export function atLeast(v: number[], min: number[]): boolean {
  for (let i = 0; i < min.length; i++) {
    if ((v[i] ?? 0) !== min[i]) return (v[i] ?? 0) > min[i]
  }
  return true
}

/** The first candidate new enough for the extension, else the first that runs, else null. */
export async function findCli(storage: string): Promise<string | null> {
  let fallback: string | null = null
  for (const path of candidates(process.platform, homedir(), process.env, storage)) {
    if (path !== 'fjord' && !existsSync(path)) continue
    const v = await version(path)
    if (!v) continue
    if (atLeast(v, MIN_VERSION)) return path
    fallback ??= path
  }
  return fallback
}

function download(url: string, redirects = 0): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    get(url, { headers: { 'User-Agent': 'fjord-vscode' } }, (res) => {
      const { statusCode = 0, headers } = res
      if (statusCode >= 300 && statusCode < 400 && headers.location) {
        res.resume()
        if (redirects >= MAX_REDIRECTS) return reject(new Error('too many redirects'))
        return resolve(download(headers.location, redirects + 1))
      }
      if (statusCode !== 200) {
        res.resume()
        return reject(new Error(`download failed (HTTP ${statusCode})`))
      }
      const chunks: Buffer[] = []
      res.on('data', (c: Buffer) => chunks.push(c))
      res.on('end', () => resolve(Buffer.concat(chunks)))
      res.on('error', reject)
    }).on('error', reject)
  })
}

/** Downloads the CLI for this machine into `storage/bin` and returns its path. */
export async function installCli(storage: string): Promise<string> {
  const asset = assetName(process.platform, process.arch)
  if (!asset) throw new Error(`there is no fjord CLI build for ${process.platform} ${process.arch} yet; build it with cargo install`)
  const dir = join(storage, 'bin')
  const target = join(dir, process.platform === 'win32' ? 'fjord.exe' : 'fjord')
  const partial = `${target}.download`
  await mkdir(dir, { recursive: true })
  await writeFile(partial, await download(RELEASES + asset))
  if (process.platform !== 'win32') await chmod(partial, 0o755)
  await rm(target, { force: true })
  await rename(partial, target)
  if (!(await version(target))) throw new Error('the downloaded CLI does not run on this machine')
  return target
}
