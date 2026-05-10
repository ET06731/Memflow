import { describe, expect, it } from "vitest"

import {
  MAX_FOLDER_HISTORY_ITEMS,
  buildFolderHistory,
  normalizeFolderPath
} from "../folder-history"

describe("normalizeFolderPath", () => {
  it("normalizes path separators and trims outer slashes", () => {
    expect(normalizeFolderPath(" /AI\\Chats//DeepSeek/ ")).toBe(
      "AI/Chats/DeepSeek"
    )
  })
})

describe("buildFolderHistory", () => {
  it("keeps the current folder first and removes duplicates", () => {
    expect(
      buildFolderHistory("AI/Chats/DeepSeek", [
        "AI\\Chats\\DeepSeek",
        "Daily/AI",
        "",
        "Daily/AI"
      ])
    ).toEqual(["AI/Chats/DeepSeek", "Daily/AI"])
  })

  it("caps the list length", () => {
    const history = Array.from({ length: MAX_FOLDER_HISTORY_ITEMS + 3 }, (_, i) =>
      `Folder/${i}`
    )

    expect(buildFolderHistory("Current", history)).toHaveLength(
      MAX_FOLDER_HISTORY_ITEMS
    )
  })
})
