// Turns a selected TODO comment into a task title.

const COMMENT = /^\s*(\/\/+|#+|--+|;+|\/\*+|\*+|<!--|%+)\s*/
const TRAILING = /\s*(\*\/|-->)\s*$/
const MARKER = /^(TODO|FIXME|HACK|XXX|BUG)\b\s*(\([^)]*\))?\s*:?\s*/i
const MAX_TITLE = 120

/** "// TODO(jonas): handle offline mode" → "Handle offline mode". */
export function titleFromSelection(text: string): string {
  const line = text
    .split('\n')
    .map((l) => l.replace(COMMENT, '').replace(TRAILING, '').trim())
    .filter(Boolean)
    .join(' ')
  const title = line.replace(MARKER, '').trim()
  return (title.charAt(0).toUpperCase() + title.slice(1)).slice(0, MAX_TITLE)
}

/** Markdown body pointing back to where the task came from. */
export function sourceBody(relativePath: string, line: number, snippet: string): string {
  const code = snippet.trim().split('\n').slice(0, 8).join('\n')
  return `From \`${relativePath}:${line}\`\n\n\`\`\`\n${code}\n\`\`\`\n`
}
