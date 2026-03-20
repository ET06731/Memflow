import { describe, expect, it, vi } from "vitest"

import selectors from "../../../config/selectors.json"
import { createChatGPTAdapter } from "../chatgpt"
import { createDeepSeekAdapter } from "../deepseek"
import { createDoubaoAdapter } from "../doubao"
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

    it("should merge split Gemini user fragments and remove duplicated assistant content", () => {
      window.location.href = "https://gemini.google.com/"
      document.body.innerHTML = `
        <section data-turn="user">
          <div class="query-text-line">pnpm 和 npm</div>
          <div class="query-text-line">能混用吗？</div>
        </section>
        <section data-turn="assistant">
          <div class="response-content">
            <message-content>
              <p>不建议混用。</p>
            </message-content>
          </div>
          <message-content>
            <p>不建议混用。</p>
          </message-content>
        </section>
      `

      const adapter = createGeminiAdapter()
      const conversation = adapter.extractConversation()

      expect(conversation.messages).toHaveLength(2)
      expect(conversation.messages[0].role).toBe("user")
      expect(conversation.messages[0].content).toContain("pnpm 和 npm")
      expect(conversation.messages[0].content).toContain("能混用吗")
      expect(conversation.messages[1].role).toBe("assistant")
      expect(conversation.messages[1].content).toContain("不建议混用")
    })
  })

  describe("Doubao Adapter", () => {
    it("should keep doubao user and assistant content separated", () => {
      window.location.href = "https://www.doubao.com/chat/test"
      document.body.innerHTML = `
        <div class="message-item">
          <div class="from-user">
            <div data-testid="message_text_content" class="container-QQkdo4">
              强化学习的价值函数是什么？
            </div>
          </div>
        </div>
        <div class="message-item">
          <div class="from-assistant">
            <div class="assistant-header">豆包</div>
            <div data-testid="message_content">
              <div
                data-testid="message_text_content"
                class="flow-markdown-body container-P2rR72">
                <div class="paragraph-pP9ZLC">
                  在强化学习里，价值函数用于衡量状态或动作的长期收益。
                </div>
              </div>
            </div>
          </div>
        </div>
      `

      const adapter = createDoubaoAdapter()
      const conversation = adapter.extractConversation()

      expect(conversation.messages).toHaveLength(2)
      expect(conversation.messages[0].role).toBe("user")
      expect(conversation.messages[0].content).toContain("强化学习的价值函数是什么")
      expect(conversation.messages[1].role).toBe("assistant")
      expect(conversation.messages[1].content).toContain("价值函数用于衡量状态或动作的长期收益")
      expect(conversation.messages[1].content).not.toContain("强化学习的价值函数是什么")
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
    expect(selectors.platforms.doubao).toBeDefined()
  })

  it("每个平台应该有必需的选择器", () => {
    const platforms = ["deepseek", "chatgpt", "kimi", "gemini", "doubao"]
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
