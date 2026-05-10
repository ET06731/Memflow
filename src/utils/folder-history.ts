export const DEFAULT_FOLDER_HISTORY_KEY = "defaultFolderHistory"
export const MAX_FOLDER_HISTORY_ITEMS = 3

export function normalizeFolderPath(folder: string): string {
  return folder
    .replace(/\\/g, "/")
    .replace(/\/+/g, "/")
    .trim()
    .replace(/^\/+/, "")
    .replace(/\/+$/, "")
}

export function buildFolderHistory(
  currentFolder: string,
  history: string[] = []
): string[] {
  const nextHistory: string[] = []
  const source = [currentFolder, ...history]

  for (const folder of source) {
    const normalized = normalizeFolderPath(folder)
    if (!normalized || nextHistory.includes(normalized)) {
      continue
    }

    nextHistory.push(normalized)
    if (nextHistory.length >= MAX_FOLDER_HISTORY_ITEMS) {
      break
    }
  }

  return nextHistory
}
