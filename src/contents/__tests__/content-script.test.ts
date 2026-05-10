import { describe, expect, it, vi } from "vitest"

describe("content script page injection", () => {
  it("does not inject a page export button on AI chat pages", async () => {
    vi.useFakeTimers()
    vi.resetModules()

    try {
      window.location.href = "https://chatgpt.com/c/test"

      await import("../index")

      window.dispatchEvent(new Event("load"))
      await vi.advanceTimersByTimeAsync(600)

      expect(document.getElementById("memflow-export-btn")).toBeNull()
      expect(document.getElementById("memflow-fallback-container")).toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })
})
