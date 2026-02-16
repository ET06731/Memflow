import { beforeEach, describe, expect, it, vi } from "vitest"

import type { IAdapter } from "../../contents/adapters/base-adapter"
import { AIMetadataGenerator } from "../ai-metadata-generator"

describe("AIMetadataGenerator", () => {
  let mockAdapter: IAdapter
  let generator: AIMetadataGenerator

  beforeEach(() => {
    mockAdapter = {
      platformName: "TestPlatform",
      selectors: {
        aiMessage: ".ai-message",
        inputBox: "#input",
        sendButton: "#send"
      },
      injectPrompt: vi.fn().mockResolvedValue(undefined),
      deleteMessage: vi.fn().mockResolvedValue(undefined)
    } as unknown as IAdapter

    generator = new AIMetadataGenerator(mockAdapter)

    // Reset DOM
    document.body.innerHTML = ""
  })

  it("should generate metadata successfully when AI responds with JSON", async () => {
    // Mock DOM for waitForAIResponse
    const aiMsg = document.createElement("div")
    aiMsg.className = "ai-message"
    aiMsg.textContent = JSON.stringify({
      title: "Test Title",
      summary: "Test Summary",
      keywords: ["k1", "k2"],
      category: "编程"
    })

    // Timer to simulate async response
    setTimeout(() => {
      document.body.appendChild(aiMsg)
    }, 100)

    const conversation = {
      messages: [{ role: "user", content: "test" }]
    } as any

    const result = await generator.generate(conversation, 1000)

    expect(mockAdapter.injectPrompt).toHaveBeenCalled()
    expect(result).toEqual({
      title: "Test Title",
      summary: "Test Summary",
      keywords: ["k1", "k2"],
      category: "编程"
    })
  })

  it("should return null on timeout", async () => {
    const conversation = {
      messages: [{ role: "user", content: "test" }]
    } as any

    // No message added to DOM

    // Reduce timeout for test
    const result = await generator.generate(conversation, 200)

    expect(result).toBeNull()
  })
})
