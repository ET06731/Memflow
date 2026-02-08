import type { Conversation, Metadata } from "../types"
import { stripHtml } from "../utils/cleaner"
import {
  categorizeConversation,
  extractKeywords,
  generateSummary,
  generateTitle
} from "./local-algorithms"

/**
 * 元数据生成器
 */
export class MetadataGenerator {
  /**
   * 使用本地算法生成元数据
   */
  generateLocal(conversation: Conversation): Metadata {
    // 分别处理每条消息
    const cleanedMessages = conversation.messages.map((msg) => ({
      role: msg.role,
      content: stripHtml(msg.content)
    }))

    // 合并所有消息文本用于关键词和分类
    const fullText = cleanedMessages.map((msg) => msg.content).join("\n\n")

    // 提取关键词（基于完整对话）
    const keywords = extractKeywords(fullText, 5)

    // 生成标题（只从用户的第一条消息提取，更干净）
    const firstUserMessage = cleanedMessages.find((m) => m.role === "user")
    const title = firstUserMessage
      ? generateTitle(firstUserMessage.content)
      : cleanedMessages[0]
        ? generateTitle(cleanedMessages[0].content)
        : "对话记录"

    // 生成摘要（基于完整对话）
    const summary = generateSummary(fullText, 3)

    // 智能分类（基于完整对话）
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
    return keywords.map((kw) => `[[${kw}]]`)
  }
}

/**
 * 创建元数据生成器实例
 */
export function createMetadataGenerator(): MetadataGenerator {
  return new MetadataGenerator()
}
