import { AIService } from "../services/ai-api"
import type { AIApiConfig, Conversation, Metadata } from "../types"
import { stripHtml } from "../utils/cleaner"

/**
 * 元数据生成器
 */
export class MetadataGenerator {
  /**
   * 使用本地简化逻辑生成元数据（降级方案）
   */
  generateLocal(conversation: Conversation): Metadata {
    const cleanedMessages = conversation.messages.map((msg) => ({
      role: msg.role,
      content: stripHtml(msg.content)
    }))

    const fullText = cleanedMessages.map((msg) => msg.content).join("\n\n")

    const firstUserMessage = cleanedMessages.find((m) => m.role === "user")
    const rawTitle = firstUserMessage
      ? firstUserMessage.content
      : cleanedMessages[0]?.content || ""
    const title = rawTitle
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .split(/[.!?。！？\n]/)[0]
      ?.trim()
      ?.slice(0, 50)
      ?.replace(/[<>:"/\\|?*]/g, " ") || "对话记录"

    const cleanText = fullText
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
    const sentences = cleanText
      .replace(/([.!?。！？\n])/g, "$1|")
      .split("|")
      .map((s) => s.trim())
      .filter((s) => s.length > 10)
    const summary =
      sentences.length > 0
        ? sentences.slice(0, 3).join(" ")
        : cleanText.slice(0, 150) + (cleanText.length > 150 ? "..." : "")

    return {
      title,
      keywords: [],
      summary,
      category: "思考",
      platform: conversation.platform,
      url: conversation.url
    }
  }

  /**
   * 构建对话文本用于发送给 API
   */
  private buildConversationText(conversation: Conversation): string {
    // 只取最近的有效消息即可，避免 token 超出
    const recentMessages = conversation.messages.slice(-20)

    const lines = recentMessages.map((msg) => {
      const role = msg.role === "user" ? "用户" : "AI"
      const cleanContent = stripHtml(msg.content)
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 1000) // 单条消息最多1000字符
      return `${role}: ${cleanContent}`
    })

    return lines.join("\n\n")
  }

  /**
   * 使用 API 生成元数据
   * @param conversation 对话数据
   * @param adapter 平台适配器（当前由于不再需要注入，可以保留参数用于兼容旧方法签名）
   * @param autoDelete 是否自动删除分析消息（原用于清理通过注入页面发送的消息，现保留兼容接口格式）
   * @returns 元数据
   */
  async generateWithAI(
    conversation: Conversation,
    adapter: any,
    autoDelete = false
  ): Promise<Metadata> {
    console.log("[MetadataGenerator] 使用第三方 API 生成元数据...")

    // 先使用本地算法作为基础
    const localMetadata = this.generateLocal(conversation)

    try {
      // 检查 AI 配置
      if (!chrome.storage) {
        throw new Error("chrome.storage 不可用")
      }

      const { aiApiConfig } = await chrome.storage.sync.get("aiApiConfig")

      const isLocalProvider = aiApiConfig?.provider === "local"
      if (!aiApiConfig || !aiApiConfig.enabled) {
        console.warn("[MetadataGenerator] 未配置 AI API，降级使用本地生成。")
        return localMetadata
      }
      if (!isLocalProvider && !aiApiConfig.apiKey) {
        console.warn("[MetadataGenerator] 未配置 AI API Key，降级使用本地生成。")
        return localMetadata
      }

      const config: AIApiConfig = {
        enabled: aiApiConfig.enabled,
        provider: aiApiConfig.provider || "deepseek",
        apiKey: aiApiConfig.apiKey,
        baseUrl: aiApiConfig.baseUrl || "",
        model: aiApiConfig.model || ""
      }

      const conversationText = this.buildConversationText(conversation)

      // 生成AI元数据
      const aiResult = await AIService.generateMetadata({
        conversationText,
        config
      })

      if (aiResult) {
        // 合并AI结果和本地结果（AI优先）
        const mergedMetadata: Metadata = {
          title: aiResult.title || localMetadata.title,
          summary: aiResult.summary || localMetadata.summary,
          keywords: aiResult.keywords?.length
            ? aiResult.keywords
            : localMetadata.keywords,
          category: (aiResult.category as any) || localMetadata.category,
          platform: conversation.platform,
          url: conversation.url
        }

        console.log("[MetadataGenerator] API 元数据生成成功:", mergedMetadata)
        return mergedMetadata
      }
    } catch (error) {
      console.error("[MetadataGenerator] API 生成失败，使用本地结果:", error)
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
