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
    build(conversation: Conversation, metadata?: Metadata, options?: { contentFormat: 'callout' | 'web' }): string {
        const yaml = this.buildYAML(conversation, metadata)
        const content = this.buildContent(conversation, metadata, options?.contentFormat || 'web')

        return `${yaml}\n\n${content}`
    }

    /**
   * 构建 YAML frontmatter
   */
    private buildYAML(conversation: Conversation, metadata?: Metadata): string {
        const date = new Date().toISOString().split('T')[0]
        const keywords = metadata?.keywords || []
        const category = metadata?.category || '编程'
        const url = (conversation.url || '').replace(/"/g, '\\"')
        const platform = conversation.platform

        // 构建标签数组
        const tags = [
            'AI对话',
            platform,
            ...keywords
        ].filter(t => t)

        return `---
created: ${date}
source: [[${platform}]]
original_url: "${url}"
tags: [${tags.join(', ')}]
category: ${category}
status: 🟢 待整理
---`
    }

    /**
   * 构建对话内容
   */
    private buildContent(conversation: Conversation, metadata?: Metadata, format: 'callout' | 'web' = 'web'): string {
        let md = ''

        // 标题 (Web模式下才显示H1)
        if (format === 'web') {
            md += `# ${metadata?.title || conversation.title || '对话记录'}\n\n`
        } else {
            // Callout模式下，文件名通常就是标题，文档内再重复H1显得多余，但为了大纲清晰，也可以加
            md += `# ${metadata?.title || conversation.title || '对话记录'}\n\n`
        }

        // 摘要（如果有）
        if (metadata?.summary) {
            md += `> [!abstract] 记忆摘要\n`
            md += `> ${metadata.summary.replace(/\n/g, '\n> ')}\n\n`
            if (format === 'web') md += `---\n\n`
        }

        // 对话内容
        conversation.messages.forEach((msg, index) => {
            const content = this.formatContent(msg.content)

            if (format === 'callout') {
                // Callout 模式
                if (msg.role === 'user') {
                    md += `> [!question] 用户提问\n`
                } else {
                    md += `> [!ai] ${conversation.platform} 的回答\n`
                }

                // 为每一行添加引用符号
                md += content.split('\n').map(line => `> ${line}`).join('\n')
                md += `\n\n`
            } else {
                // Web 模式
                const roleName = msg.role === 'user' ? 'User' : conversation.platform
                const icon = msg.role === 'user' ? '💬' : '🤖'
                md += `## ${icon} ${roleName}\n\n`
                md += `${content}\n\n`
                md += `---\n\n`
            }
        })

        if (format === 'web') {
            md += `## 📎 元信息\n\n`
            md += `- **来源平台**: ${conversation.platform}\n`
            md += `- **原始链接**: [点击跳转](${conversation.url})\n`
            md += `- **导出时间**: ${new Date().toLocaleString('zh-CN')}\n`
        } else {
            md += `---\n\n`
            md += `## 相关上下文记录\n\n`
            md += `- 原始链接: [点击跳转](${conversation.url})\n`
            md += `- 导出时间: ${new Date().toLocaleString('zh-CN')}\n`
        }

        return md
    }

    /**
     * 格式化内容，保留段落和列表结构
     */
    private formatContent(content: string): string {
        // 1. 修复 Turndown 可能产生的 + 列表符号，统一转为 -
        // 2. 移除多余的空行
        return content
            .replace(/^\+ /gm, '- ') // 将行首的 + 替换为 -
            .replace(/\n{3,}/g, '\n\n') // 限制最大连续空行为2
            .trim()
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
