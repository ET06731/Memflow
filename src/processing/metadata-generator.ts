import type { IAdapter } from "../contents/adapters/base-adapter"
import { createAIMetadataGenerator } from "../services"
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
   * 使用AI生成元数据（DOM注入方式）
   * @param conversation 对话数据
   * @param adapter 平台适配器
   * @param autoDelete 是否自动删除分析消息
   * @returns 元数据
   */
  async generateWithAI(
    conversation: Conversation,
    adapter: IAdapter,
    autoDelete = false
  ): Promise<Metadata> {
    console.log("[MetadataGenerator] 使用AI模式生成元数据...")

    // 先使用本地算法作为基础
    const localMetadata = this.generateLocal(conversation)

    try {
      // 创建AI生成器
      const aiGenerator = createAIMetadataGenerator(adapter)

      // 生成AI元数据
      const aiResult = await aiGenerator.generate(conversation)

      if (aiResult) {
        // 合并AI结果和本地结果（AI优先）
        const mergedMetadata: Metadata = {
          title: aiResult.title || localMetadata.title,
          summary: aiResult.summary || localMetadata.summary,
          keywords: aiResult.keywords?.length
            ? aiResult.keywords
            : localMetadata.keywords,
          category: aiResult.category || localMetadata.category,
          platform: conversation.platform,
          url: conversation.url
        }

        console.log("[MetadataGenerator] AI元数据生成成功:", mergedMetadata)

        // 如果需要，删除分析消息
        if (autoDelete) {
          await aiGenerator.deleteAnalysisMessages()
        }

        return mergedMetadata
      }
    } catch (error) {
      console.error("[MetadataGenerator] AI生成失败，使用本地结果:", error)
    }

    // 如果AI生成失败，返回本地结果
    return localMetadata
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
