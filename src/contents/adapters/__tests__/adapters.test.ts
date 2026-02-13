import { describe, expect, it, vi } from "vitest"

import selectors from "../../../config/selectors.json"
import { createChatGPTAdapter } from "../chatgpt"
import { createDeepSeekAdapter } from "../deepseek"
import { createGeminiAdapter } from "../gemini"
import { detectPlatformAdapter } from "../index"
import { createKimiAdapter } from "../kimi"

describe("Platform Adapters", () => {
  describe("DeepSeek Adapter", () => {
    it("应该正确检测 DeepSeek 平台", () => {
      window.location.href = "https://chat.deepseek.com/"
      const adapter = createDeepSeekAdapter()
      expect(adapter.detectPlatform()).toBe(true)
    })

    it("不应该检测其他平台为 DeepSeek", () => {
      window.location.href = "https://chatgpt.com/"
      const adapter = createDeepSeekAdapter()
      expect(adapter.detectPlatform()).toBe(false)
    })

    it("应该有正确的平台名称", () => {
      const adapter = createDeepSeekAdapter()
      expect(adapter.platformName).toBe("DeepSeek")
    })

    it("应该有配置好的选择器", () => {
      const adapter = createDeepSeekAdapter()
      expect(adapter.selectors).toBeDefined()
      expect(adapter.selectors.messageContainer).toBeDefined()
      expect(adapter.selectors.userMessage).toBeDefined()
      expect(adapter.selectors.aiMessage).toBeDefined()
    })
  })

  describe("ChatGPT Adapter", () => {
    it("应该正确检测 ChatGPT 平台", () => {
      window.location.href = "https://chatgpt.com/"
      const adapter = createChatGPTAdapter()
      expect(adapter.detectPlatform()).toBe(true)
    })

    it("应该检测 openai.com 域名", () => {
      window.location.href = "https://openai.com/"
      const adapter = createChatGPTAdapter()
      expect(adapter.detectPlatform()).toBe(true)
    })

    it("应该有正确的平台名称", () => {
      const adapter = createChatGPTAdapter()
      expect(adapter.platformName).toBe("ChatGPT")
    })
  })

  describe("Kimi Adapter", () => {
    it("应该正确检测 Kimi 平台 (moonshot.cn)", () => {
      window.location.href = "https://kimi.moonshot.cn/"
      const adapter = createKimiAdapter()
      expect(adapter.detectPlatform()).toBe(true)
    })

    it("应该检测 kimi.ai 域名", () => {
      window.location.href = "https://kimi.ai/"
      const adapter = createKimiAdapter()
      expect(adapter.detectPlatform()).toBe(true)
    })

    it("应该有正确的平台名称", () => {
      const adapter = createKimiAdapter()
      expect(adapter.platformName).toBe("Kimi")
    })
  })

  describe("Gemini Adapter", () => {
    it("应该正确检测 Gemini 平台", () => {
      window.location.href = "https://gemini.google.com/"
      const adapter = createGeminiAdapter()
      expect(adapter.detectPlatform()).toBe(true)
    })

    it("应该检测 AI Studio 域名", () => {
      window.location.href = "https://aistudio.google.com/"
      const adapter = createGeminiAdapter()
      expect(adapter.detectPlatform()).toBe(true)
    })

    it("应该有正确的平台名称", () => {
      const adapter = createGeminiAdapter()
      expect(adapter.platformName).toBe("Gemini")
    })
  })

  describe("detectPlatformAdapter", () => {
    it("应该返回匹配的适配器", () => {
      window.location.href = "https://chat.deepseek.com/"
      const adapter = detectPlatformAdapter()
      expect(adapter).not.toBeNull()
      expect(adapter?.platformName).toBe("DeepSeek")
    })

    it("对于不支持的平台应该返回 null", () => {
      window.location.href = "https://unsupported-site.com/"
      const adapter = detectPlatformAdapter()
      expect(adapter).toBeNull()
    })
  })
})

describe("Selectors Config", () => {
  it("应该包含所有平台的配置", () => {
    expect(selectors.platforms.deepseek).toBeDefined()
    expect(selectors.platforms.chatgpt).toBeDefined()
    expect(selectors.platforms.kimi).toBeDefined()
    expect(selectors.platforms.gemini).toBeDefined()
  })

  it("每个平台应该有必需的选择器", () => {
    const platforms = ["deepseek", "chatgpt", "kimi", "gemini"]
    platforms.forEach((platform) => {
      const config =
        selectors.platforms[platform as keyof typeof selectors.platforms]
      expect(config.messageContainer).toBeDefined()
      expect(config.userMessage).toBeDefined()
      expect(config.aiMessage).toBeDefined()
      expect(config.inputBox).toBeDefined()
      expect(config.sendButton).toBeDefined()
    })
  })
})
