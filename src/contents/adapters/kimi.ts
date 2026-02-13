import type { Conversation, Message } from "../../types"
import selectors from "../../config/selectors.json"
import { BaseAdapter } from "./base-adapter"
import type { SelectorConfig } from "./base-adapter"

/**
 * Kimi (Moonshot) 平台适配器
 */
export class KimiAdapter extends BaseAdapter {
  platformName = "Kimi"
  selectors: SelectorConfig = selectors.platforms.kimi as SelectorConfig

  detectPlatform(): boolean {
    // 支持所有 Kimi 域名变体
    return (
      window.location.host.includes("kimi.moonshot.cn") ||
      window.location.host.includes("kimi.ai") ||
      window.location.host.includes("kimi.com")
    )
  }

  /**
   * 提取对话内容，过滤掉文件大小等UI元素
   */
  extractConversation(): Conversation {
    const messages: Message[] = []

    // 尝试多种选择器查找消息
    const messageSelectors = [
      "[class*='chat-item']",
      "[class*='message-item']",
      "[data-testid='chat-message']",
      "div[class*='chat-message']"
    ]

    let messageElements: Element[] = []

    for (const selector of messageSelectors) {
      const elements = Array.from(document.querySelectorAll(selector))
      if (elements.length > 0) {
        console.log(`[Memflow] Kimi: 找到 ${elements.length} 个消息元素 (${selector})`)
        messageElements = elements
        break
      }
    }

    // 如果没找到，尝试从对话容器中查找
    if (messageElements.length === 0) {
      const chatContainer = document.querySelector('[class*="chat-list"], [class*="message-list"], [class*="conversation"]')
      if (chatContainer) {
        messageElements = Array.from(chatContainer.children)
        console.log(`[Memflow] Kimi: 从容器中找到 ${messageElements.length} 个元素`)
      }
    }

    messageElements.forEach((element, index) => {
      // 跳过文件上传等UI元素
      const text = element.textContent || ""
      if (text.match(/^\d+\.?\d*\s*(KB|MB|GB)$/i)) {
        console.log(`[Memflow] Kimi: 跳过文件大小元素: ${text}`)
        return
      }

      // 判断消息类型
      const isUser = element.matches('[class*="user"], [data-sender="user"]') ||
                    element.querySelector('[class*="user"], [data-sender="user"]') !== null
      const isAI = element.matches('[class*="assistant"], [data-sender="assistant"]') ||
                   element.querySelector('[class*="assistant"], [data-sender="assistant"]') !== null

      let role: "user" | "assistant"
      if (isUser) {
        role = "user"
      } else if (isAI) {
        role = "assistant"
      } else {
        // 通过位置推断
        role = index % 2 === 0 ? "user" : "assistant"
      }

      // 提取内容，优先使用 textContent
      let content = text.trim()

      // 如果内容太短，尝试获取HTML中的文本
      if (content.length < 10) {
        const textElement = element.querySelector('[class*="text"], [class*="content"], p, span')
        if (textElement) {
          content = textElement.textContent?.trim() || ""
        }
      }

      // 过滤掉纯文件大小信息
      if (content && !content.match(/^\d+\.?\d*\s*(KB|MB|GB)$/i) && content.length > 0) {
        messages.push({
          role,
          content,
          timestamp: new Date()
        })
      }
    })

    console.log(`[Memflow] Kimi: 成功提取 ${messages.length} 条消息`)

    return {
      id: crypto.randomUUID(),
      platform: this.platformName,
      url: window.location.href,
      messages,
      createdAt: new Date()
    }
  }
}

/**
 * 创建 Kimi 适配器实例
 */
export function createKimiAdapter(): KimiAdapter {
  return new KimiAdapter()
}
