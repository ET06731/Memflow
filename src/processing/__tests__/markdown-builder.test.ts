import { describe, expect, it } from "vitest"

import type { Conversation, Metadata } from "../../types"
import { MarkdownBuilder } from "../markdown-builder"

describe("MarkdownBuilder", () => {
  const createMockConversation = (): Conversation => ({
    id: "test-conv-1",
    platform: "DeepSeek",
    url: "https://chat.deepseek.com/test",
    messages: [
      {
        role: "user",
        content: "Hello AI",
        timestamp: new Date("2024-01-01")
      },
      {
        role: "assistant",
        content: "Hello! How can I help you?",
        timestamp: new Date("2024-01-01")
      }
    ],
    createdAt: new Date("2024-01-01")
  })

  const createMockMetadata = (): Metadata => ({
    title: "Test Conversation",
    keywords: ["test", "ai"],
    summary: "A test conversation",
    category: "编程",
    platform: "DeepSeek",
    url: "https://chat.deepseek.com/test"
  })

  describe("build", () => {
    it("应该生成包含 YAML frontmatter 的 markdown", () => {
      const builder = new MarkdownBuilder()
      const conversation = createMockConversation()
      const markdown = builder.build(conversation)

      expect(markdown).toContain("---")
      expect(markdown).toContain("source:")
      expect(markdown).toContain("DeepSeek")
    })

    it("应该包含对话内容", () => {
      const builder = new MarkdownBuilder()
      const conversation = createMockConversation()
      const markdown = builder.build(conversation)

      expect(markdown).toContain("Hello AI")
      expect(markdown).toContain("Hello! How can I help you?")
    })

    it("应该包含元数据", () => {
      const builder = new MarkdownBuilder()
      const conversation = createMockConversation()
      const metadata = createMockMetadata()
      const markdown = builder.build(conversation, metadata)

      expect(markdown).toContain("Test Conversation")
      expect(markdown).toContain("编程")
    })
  })

  describe("formatContent", () => {
    it("应该将 HTML 转换为 Markdown", () => {
      const builder = new MarkdownBuilder()
      const html = "<p>Test <strong>bold</strong> text</p>"
      const result = (builder as any).formatContent(html)

      expect(result).toContain("Test")
      expect(result).toContain("bold")
    })

    it("应该清理多余的换行", () => {
      const builder = new MarkdownBuilder()
      const html = "Line 1\n\n\n\nLine 2"
      const result = (builder as any).formatContent(html)

      // 不应该有超过2个连续换行
      expect(result).not.toContain("\n\n\n\n")
    })
  })

  describe("YAML frontmatter", () => {
    it("应该包含 created 日期", () => {
      const builder = new MarkdownBuilder()
      const conversation = createMockConversation()
      const markdown = builder.build(conversation)

      expect(markdown).toMatch(/created: \d{4}-\d{2}-\d{2}/)
    })

    it("应该包含原始 URL", () => {
      const builder = new MarkdownBuilder()
      const conversation = createMockConversation()
      const markdown = builder.build(conversation)

      expect(markdown).toContain("original_url:")
      expect(markdown).toContain("chat.deepseek.com")
    })

    it("应该包含标签", () => {
      const builder = new MarkdownBuilder()
      const conversation = createMockConversation()
      const metadata = createMockMetadata()
      const markdown = builder.build(conversation, metadata)

      expect(markdown).toContain("tags:")
      expect(markdown).toContain("AI对话")
    })
  })

  describe("对话格式", () => {
    it("web 格式应该使用标题", () => {
      const builder = new MarkdownBuilder()
      const conversation = createMockConversation()
      const markdown = builder.build(conversation, undefined, {
        contentFormat: "web"
      })

      expect(markdown).toContain("## 💬 User")
      expect(markdown).toContain("## 🤖 DeepSeek")
    })

    it("callout 格式应该使用 Obsidian callouts", () => {
      const builder = new MarkdownBuilder()
      const conversation = createMockConversation()
      const markdown = builder.build(conversation, undefined, {
        contentFormat: "callout"
      })

      expect(markdown).toContain("> [!question]")
      expect(markdown).toContain("> [!ai]")
    })
  })
})
