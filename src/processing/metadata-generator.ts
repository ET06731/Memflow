import type { Conversation, Metadata } from "../types"
import { extractKeywords, generateTitle, generateSummary, categorizeConversation } from "./local-algorithms"
import { stripHtml } from "../utils/cleaner"

/**
 * 元数据生成器
 */
export class MetadataGenerator {
    /**
     * 使用本地算法生成元数据
     */
    generateLocal(conversation: Conversation): Metadata {
        // 合并所有消息文本并清理 HTML
        const fullText = conversation.messages
            .map(msg => stripHtml(msg.content)) // 清理 HTML 标签
            .join('\n')

        // 提取关键词
        const keywords = extractKeywords(fullText, 5)

        // 生成标题
        const title = generateTitle(fullText)

        // 生成摘要
        const summary = generateSummary(fullText, 3)

        // 智能分类
        const category = categorizeConversation(fullText)

        return {
            title,
            keywords,
            summary,
            category,
            platform: conversation.platform,
            url: conversation.url
        }
    }

    /**
     * 将关键词转换为双向链接格式
     */
    keywordsToWikiLinks(keywords: string[]): string[] {
        return keywords.map(kw => `[[${kw}]]`)
    }
}

/**
 * 创建元数据生成器实例
 */
export function createMetadataGenerator(): MetadataGenerator {
    return new MetadataGenerator()
}
