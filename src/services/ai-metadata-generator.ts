import prompts from "../config/prompts.json"
import type { IAdapter } from "../contents/adapters/base-adapter"
import type { Conversation, Metadata } from "../types"

/**
 * AI元数据提取结果
 */
export interface AIMetadataResult {
  title: string
  keywords: string[]
  summary: string
  category: "编程" | "生活" | "思考" | "项目"
}

/**
 * AI元数据生成器
 * 使用DOM注入方式利用原平台LLM生成智能元数据
 */
export class AIMetadataGenerator {
  private adapter: IAdapter
  private isGenerating = false

  constructor(adapter: IAdapter) {
    this.adapter = adapter
  }

  /**
   * 生成AI增强的元数据
   * @param conversation 对话数据
   * @param timeout 超时时间（毫秒）
   * @returns 元数据或null（如果失败）
   */
  async generate(
    conversation: Conversation,
    timeout = 30000
  ): Promise<Partial<Metadata> | null> {
    if (this.isGenerating) {
      console.log("[AI Metadata] 已有生成任务进行中")
      return null
    }

    this.isGenerating = true

    try {
      console.log("[AI Metadata] 开始AI元数据生成...")

      // 构建完整prompt (无需发送对话内容，利用当前上下文)
      const fullPrompt = prompts.metadataExtraction

      console.log("[AI Metadata] 注入prompt到当前平台...")

      // 注入prompt
      await this.adapter.injectPrompt(fullPrompt)

      // 等待响应
      console.log("[AI Metadata] 等待AI响应...")
      const response = await this.waitForAIResponse(timeout)

      if (!response) {
        console.warn("[AI Metadata] 未获取到AI响应")
        return null
      }

      // 解析响应
      console.log("[AI Metadata] 解析AI响应...")
      const result = this.parseAIResponse(response)

      if (result) {
        console.log("[AI Metadata] 成功生成元数据:", result)
      }

      return result
    } catch (error) {
      console.error("[AI Metadata] 生成失败:", error)
      return null
    } finally {
      this.isGenerating = false
    }
  }

  /**
   * 构建对话文本
   */
  private buildConversationText(conversation: Conversation): string {
    // 只取最近20条消息，避免过长
    const recentMessages = conversation.messages.slice(-20)

    const lines = recentMessages.map((msg) => {
      const role = msg.role === "user" ? "用户" : "AI"
      // 清理HTML标签
      const cleanContent = msg.content
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 500) // 单条消息最多500字符

      return `${role}: ${cleanContent}`
    })

    return lines.join("\n\n")
  }

  /**
   * 等待AI响应
   */
  private async waitForAIResponse(timeout: number): Promise<string | null> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now()
      const checkInterval = 500 // 每500ms检查一次

      const checkResponse = () => {
        // 查找最新的AI消息
        const aiMessages = document.querySelectorAll(
          this.adapter.selectors.aiMessage
        )

        if (aiMessages.length > 0) {
          const lastMessage = aiMessages[aiMessages.length - 1]
          const content = lastMessage.textContent?.trim() || ""

          // 检查是否包含JSON格式
          if (content.includes('"title"') && content.includes('"summary"')) {
            resolve(content)
            return
          }
        }

        // 检查超时
        if (Date.now() - startTime > timeout) {
          reject(new Error("等待AI响应超时"))
          return
        }

        // 继续等待
        setTimeout(checkResponse, checkInterval)
      }

      checkResponse()
    })
  }

  /**
   * 解析AI响应
   */
  private parseAIResponse(response: string): Partial<Metadata> | null {
    try {
      // 尝试提取JSON代码块
      const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/)
      const jsonStr = jsonMatch ? jsonMatch[1] : response

      // 尝试解析JSON
      const result = JSON.parse(jsonStr) as AIMetadataResult

      // 验证必要字段
      if (!result.title || !result.summary) {
        console.warn("[AI Metadata] 解析结果缺少必要字段")
        return null
      }

      // 限制标题长度
      const title = result.title.slice(0, 30).trim()

      // 限制摘要长度
      const summary = result.summary.slice(0, 300).trim()

      // 确保关键词是数组
      const keywords = Array.isArray(result.keywords)
        ? result.keywords.slice(0, 5)
        : []

      // 验证分类
      const validCategories = ["编程", "生活", "思考", "项目"]
      const category = validCategories.includes(result.category)
        ? result.category
        : "思考"

      return {
        title,
        summary,
        keywords,
        category
      }
    } catch (error) {
      console.error("[AI Metadata] 解析AI响应失败:", error)

      // 尝试使用正则提取（降级方案）
      return this.parseWithRegex(response)
    }
  }

  /**
   * 使用正则表达式提取（降级方案）
   */
  private parseWithRegex(response: string): Partial<Metadata> | null {
    try {
      const titleMatch = response.match(/"title"\s*:\s*"([^"]+)"/)
      const summaryMatch = response.match(/"summary"\s*:\s*"([^"]+)"/)

      if (titleMatch && summaryMatch) {
        return {
          title: titleMatch[1].slice(0, 30),
          summary: summaryMatch[1].slice(0, 300)
        }
      }

      return null
    } catch (error) {
      console.error("[AI Metadata] 正则解析失败:", error)
      return null
    }
  }

  /**
   * 删除分析消息（可选）
   */
  async deleteAnalysisMessages(): Promise<void> {
    try {
      // 注入删除确认消息
      await this.adapter.injectPrompt(prompts.deleteConfirmation)

      // 等待一下让消息发送
      await new Promise((resolve) => setTimeout(resolve, 1000))

      console.log("[AI Metadata] 已发送删除确认消息")
    } catch (error) {
      console.warn("[AI Metadata] 删除分析消息失败:", error)
    }
  }
}

/**
 * 创建AI元数据生成器实例
 */
export function createAIMetadataGenerator(
  adapter: IAdapter
): AIMetadataGenerator {
  return new AIMetadataGenerator(adapter)
}
