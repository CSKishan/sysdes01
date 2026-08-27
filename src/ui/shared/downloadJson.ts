/** Downloads `data` as a pretty-printed JSON file -- the Blob/anchor/
 * revoke dance every "Export ..." button in this app does, extracted once
 * two independent copies of it (Settings' progress export, Sandbox's
 * design export) had already started drifting from each other. */
export function downloadJson(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
