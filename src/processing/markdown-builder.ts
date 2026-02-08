import TurndownService from "turndown"
import type { Conversation, Metadata } from "../types"

/**
 * Markdown 构建器
 */
export class MarkdownBuilder {
    private turndown: TurndownService

    constructor() {
        this.turndown = new TurndownService({
            headingStyle: 'atx',
            codeBlockStyle: 'fenced',
            emDelimiter: '*',
            strongDelimiter: '**'
        })

        // 添加自定义规则来保留代码块
        this.turndown.keep(['pre', 'code'])
    }

    /**
     * 构建完整的 Markdown 文档
     */
    build(conversation: Conversation, metadata?: Metadata): string {
        const yaml = this.buildYAML(conversation, metadata)
        const content = this.buildContent(conversation, metadata)

        return `${yaml}\n\n${content}`
    }

    /**
   * 构建 YAML frontmatter
   */
    private buildYAML(conversation: Conversation, metadata?: Metadata): string {
        const date = new Date().toISOString().split('T')[0]
        const title = metadata?.title || conversation.title || 'Untitled'
        const keywords = metadata?.keywords || []
        const category = metadata?.category || '未分类'

        return `---
title: "${title}"
created: ${date}
source: ${conversation.platform}
url: "${conversation.url}"
tags:
  - AI对话
  - ${conversation.platform}
${keywords.map(k => `  - ${k}`).join('\n')}
category: ${category}
---`
    }

    /**
   * 构建对话内容
   */
    private buildContent(conversation: Conversation, metadata?: Metadata): string {
        let md = ''

        // 标题
        const title = metadata?.title || conversation.title || '对话记录'
        md += `# ${title}\n\n`

        // 摘要（如果有）
        if (metadata?.summary) {
            md += `> [!abstract] 记忆摘要\n`
            md += `> ${metadata.summary}\n\n`
            md += `---\n\n`
        }

        // 对话内容 - 使用清晰的标题+内容格式
        conversation.messages.forEach((msg, index) => {
            if (msg.role === 'user') {
                // 用户提问
                md += `## 💬 提问 ${Math.floor(index / 2) + 1}\n\n`
                md += `${this.formatContent(msg.content)}\n\n`
            } else {
                // AI回答 - 保持原始格式
                md += `## 🤖 ${conversation.platform} 的回答\n\n`
                md += `${this.formatContent(msg.content)}\n\n`
            }

            md += `---\n\n`
        })

        // 添加相关上下文
        md += `## 📎 元信息\n\n`
        md += `- **来源平台**: ${conversation.platform}\n`
        md += `- **原始链接**: [点击跳转](${conversation.url})\n`
        md += `- **导出时间**: ${new Date().toLocaleString('zh-CN')}\n`

        return md
    }

    /**
     * 格式化内容，保留段落和列表结构
     */
    private formatContent(content: string): string {
        // 按段落分割
        const paragraphs = content.split(/\n\n+/)

        return paragraphs.map(para => {
            // 移除首尾空白
            para = para.trim()

            // 检查是否是列表项
            if (/^[\d\u4e00-\u9fa5]+[.、．]/.test(para) || /^[-*•]/.test(para)) {
                // 已经是列表格式，保持不变
                return para
            }

            // 检查是否包含多行列表
            const lines = para.split('\n')
            if (lines.some(line => /^[\d\u4e00-\u9fa5]+[.、．]/.test(line.trim()))) {
                // 包含列表项，保持原样
                return lines.map(l => l.trim()).join('\n')
            }

            // 普通段落
            return para
        }).join('\n\n')
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
