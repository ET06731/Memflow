import TurndownService from "turndown"
import { gfm } from "turndown-plugin-gfm"

import type { Conversation, Metadata } from "../types"

/**
 * Markdown 构建器
 */
export class MarkdownBuilder {
  private turndown: TurndownService

  constructor() {
    this.turndown = new TurndownService({
      headingStyle: "atx",
      codeBlockStyle: "fenced",
      emDelimiter: "*",
      strongDelimiter: "**",
      linkStyle: "inlined",
      linkReferenceStyle: "full"
    })

    // 使用 GFM 插件（支持表格、删除线等）
    this.turndown.use(gfm)

    // 添加自定义规则来保留代码块，但保持表格转换
    this.turndown.keep(["pre", "code"])

    // ========== 移除无关的UI元素 ==========
    // 基础元素
    this.turndown.remove("button")
    this.turndown.remove("svg")
    this.turndown.remove("script")
    this.turndown.remove("style")
    this.turndown.remove("noscript")
    this.turndown.remove("iframe")
    this.turndown.remove("canvas")

    // DeepSeek 特定清理
    this.turndown.remove(".ds-icon")
    this.turndown.remove(".ds-markdown-copy-button")
    this.turndown.remove(".ds-icon-button")
    this.turndown.remove(".ds-button")
    this.turndown.remove(".ds-actions")
    this.turndown.remove(".ds-message-actions")
    this.turndown.remove(".ds-copy-button")
    this.turndown.remove(".ds-regenerate")
    this.turndown.remove('[class*="copy"]')
    this.turndown.remove('[class*="action"]')

    // 通用清理
    this.turndown.remove('[aria-label="复制"]')
    this.turndown.remove('[aria-label="Copy"]')
    this.turndown.remove('[aria-label="Regenerate"]')
    this.turndown.remove('[aria-label="重新生成"]')
    this.turndown.remove('[title="复制"]')
    this.turndown.remove('[title="Copy"]')

    // 过滤常见的图标和按钮类名
    this.turndown.remove(".icon")
    this.turndown.remove(".btn")
    this.turndown.remove(".button")
    this.turndown.remove(".toolbar")
    this.turndown.remove(".actions")
    this.turndown.remove(".message-actions")
  }

  /**
   * 构建完整的 Markdown 文档
   */
  build(
    conversation: Conversation,
    metadata?: Metadata,
    options?: { contentFormat: "callout" | "web" }
  ): string {
    const yaml = this.buildYAML(conversation, metadata)
    const content = this.buildContent(
      conversation,
      metadata,
      options?.contentFormat || "web"
    )

    return `${yaml}\n\n${content}`
  }

  /**
   * 构建 YAML frontmatter
   */
  private buildYAML(conversation: Conversation, metadata?: Metadata): string {
    const date = new Date().toISOString().split("T")[0]
    const keywords = metadata?.keywords || []
    const category = metadata?.category || "编程"
    const url = (conversation.url || "").replace(/"/g, '\\"')
    const platform = conversation.platform

    // 构建标签数组
    const tags = ["AI对话", platform, ...keywords].filter((t) => t)

    return `---
created: ${date}
source: [[${platform}]]
original_url: "${url}"
tags: [${tags.join(", ")}]
category: ${category}
status: \u{1F7E2} 待整理
---`
  }

  /**
   * 构建对话内容
   */
  private buildContent(
    conversation: Conversation,
    metadata?: Metadata,
    format: "callout" | "web" = "web"
  ): string {
    let md = ""

    // 标题 (Web模式下才显示H1)
    if (format === "web") {
      md += `# ${metadata?.title || conversation.title || "对话记录"}\n\n`
    } else {
      // Callout模式下，文件名通常就是标题，文档内再重复H1显得多余，但为了大纲清晰，也可以加
      md += `# ${metadata?.title || conversation.title || "对话记录"}\n\n`
    }

    // 摘要（如果有）
    if (metadata?.summary) {
      md += `> [!abstract] 记忆摘要\n`
      md += `> ${metadata.summary.replace(/\n/g, "\n> ")}\n\n`
      if (format === "web") md += `---\n\n`
    }

    // 对话内容
    conversation.messages.forEach((msg, index) => {
      // 将 HTML 转换为 Markdown
      const content = this.formatContent(msg.content)

      if (format === "callout") {
        // Callout 模式
        if (msg.role === "user") {
          md += `> [!question] 用户提问\n`
        } else {
          md += `> [!ai] ${conversation.platform} 的回答\n`
        }

        // 为每一行添加引用符号
        md += content
          .split("\n")
          .map((line) => `> ${line}`)
          .join("\n")
        md += `\n\n`
      } else {
        // Web 模式
        const roleName = msg.role === "user" ? "User" : conversation.platform
        const icon = msg.role === "user" ? "\u{1F4AC}" : "\u{1F916}"
        md += `## ${icon} ${roleName}\n\n`
        md += `${content}\n\n`
        md += `---\n\n`
      }
    })

    if (format === "web") {
      md += `## \u{1F4CE} 元信息\n\n`
      md += `- **来源平台**: ${conversation.platform}\n`
      md += `- **原始链接**: [点击跳转](${conversation.url})\n`
      md += `- **导出时间**: ${new Date().toLocaleString("zh-CN")}\n`
    } else {
      md += `---\n\n`
      md += `## 相关上下文记录\n\n`
      md += `- 原始链接: [点击跳转](${conversation.url})\n`
      md += `- 导出时间: ${new Date().toLocaleString("zh-CN")}\n`
    }

    return md
  }

  /**
   * 格式化内容：HTML转Markdown -> 清理 -> 格式优化
   */
  private formatContent(content: string): string {
    // 1. 如果看起来像 HTML，先转换
    let md = content
    if (
      content.trim().startsWith("<") ||
      content.includes("</div>") ||
      content.includes("</p>")
    ) {
      md = this.htmlToMarkdown(content)
    }

    // 2. 深度清理 DeepSeek 特定的内容
    md = this.cleanDeepSeekContent(md)

    // 3. 修复格式
    return md
      .replace(/^\+ /gm, "- ") // 将行首的 + 替换为 -
      .replace(/\n{3,}/g, "\n\n") // 限制最大连续空行为2
      .trim()
  }

  /**
   * 清理 DeepSeek 特定的内容
   */
  private cleanDeepSeekContent(md: string): string {
    return (
      md
        // 移除 site-icons 图片
        .replace(
          /!\[\]\(https:\/\/cdn\.deepseek\.com\/site-icons[^\)]*\)/gi,
          ""
        )
        // 移除 "已阅读 X 个网页" 文本
        .replace(/已阅读\s*\d+\s*个网页/g, "")
        // 移除独立的 "X 个网页" 文本
        .replace(/^\s*\d+\s*个网页\s*$/gm, "")
        // 移除引用链接标记（如 [-2], [-4]）
        .replace(/\[-\d+\]/g, "")
        // 移除 "重新生成" 等按钮文本
        .replace(/重新生成/g, "")
        .replace(/Regenerate/gi, "")
        .replace(/复制/g, "")
        .replace(/Copy/g, "")
        // 清理多余的空行
        .replace(/\n{3,}/g, "\n\n")
        .trim()
    )
  }

  /**
   * 将 HTML 转换为 Markdown
   */
  htmlToMarkdown(html: string): string {
    return this.turndown.turndown(html)
  }
}

/**
 * 创建 Markdown 构建器实例
 */
export function createMarkdownBuilder(): MarkdownBuilder {
  return new MarkdownBuilder()
}
