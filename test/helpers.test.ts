import { test } from 'node:test'
import * as assert from 'node:assert/strict'
import { join } from 'node:path'
import { assetName, atLeast, candidates } from '../src/locate'
import { commitPrefix } from '../src/model'
import type { Task } from '../src/model'
import { dataDir } from '../src/sync'
import { sourceBody, titleFromSelection } from '../src/todo'

test('TODO comments become task titles', () => {
  assert.equal(titleFromSelection('// TODO: handle offline mode'), 'Handle offline mode')
  assert.equal(titleFromSelection('  # FIXME(jonas) retry failed uploads'), 'Retry failed uploads')
  assert.equal(titleFromSelection('/* XXX: remove before release */'), 'Remove before release')
  assert.equal(titleFromSelection('<!-- todo: alt text -->'), 'Alt text')
  assert.equal(titleFromSelection('// TODO: split\n// into two lines'), 'Split into two lines')
  assert.equal(titleFromSelection('plain words'), 'Plain words')
})

test('the task body points back to the file and line', () => {
  const body = sourceBody('src/app.ts', 42, '// TODO: x\n')
  assert.match(body, /^From `src\/app.ts:42`/)
  assert.match(body, /```\n\/\/ TODO: x\n```/)
})

test('a release asset exists only for built platforms', () => {
  assert.equal(assetName('linux', 'x64'), 'fjord-cli-x86_64-unknown-linux-gnu')
  assert.equal(assetName('darwin', 'arm64'), 'fjord-cli-aarch64-apple-darwin')
  assert.equal(assetName('win32', 'x64'), 'fjord-cli-x86_64-pc-windows-msvc.exe')
  assert.equal(assetName('darwin', 'x64'), null)
  assert.equal(assetName('linux', 'arm64'), null)
})

test('CLI candidates start with PATH and include the downloaded copy', () => {
  const linux = candidates('linux', '/home/u', {}, '/store')
  assert.equal(linux[0], 'fjord')
  assert.equal(linux[1], join('/store', 'bin', 'fjord'))
  assert.ok(linux.includes(join('/home/u', '.cargo', 'bin', 'fjord')))
  assert.ok(candidates('darwin', '/Users/u', {}, '/s').includes('/opt/homebrew/bin/fjord'))
  assert.ok(candidates('win32', 'C:\\Users\\u', { LOCALAPPDATA: 'C:\\L' }, 'C:\\s').every((p) => p === 'fjord' || p.endsWith('fjord.exe')))
})

test('the data folder matches Fjord on each platform', () => {
  assert.equal(dataDir('linux', {}, '/home/u'), join('/home/u', '.local', 'share', 'fjord'))
  assert.equal(dataDir('linux', { XDG_DATA_HOME: '/x' }, '/home/u'), join('/x', 'fjord'))
  assert.equal(dataDir('darwin', {}, '/Users/u'), join('/Users/u', 'Library', 'Application Support', 'fjord'))
  assert.equal(dataDir('win32', { APPDATA: 'C:\\R' }, 'C:\\Users\\u'), join('C:\\R', 'fjord'))
  assert.equal(dataDir('linux', { FJORD_DATA_DIR: '/d' }, '/home/u'), '/d')
})

test('commit prefix fills in the task', () => {
  const task = { id: 12, title: 'Fix push' } as Task
  assert.equal(commitPrefix('#{id} ', task), '#12 ')
  assert.equal(commitPrefix('{title} (#{id})', task), 'Fix push (#12)')
})

test('version check needs 0.2.18 or later', () => {
  assert.ok(atLeast([0, 2, 18], [0, 2, 18]))
  assert.ok(atLeast([0, 3, 0], [0, 2, 18]))
  assert.ok(atLeast([1, 0, 0], [0, 2, 18]))
  assert.ok(!atLeast([0, 2, 17], [0, 2, 18]))
  assert.ok(!atLeast([0, 1, 99], [0, 2, 18]))
})
