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

    // 尝试多种选择器查找消息 - 包含更多可能的选择器
    const messageSelectors = [
      "[class*='chat-item']",
      "[class*='message-item']",
      "[class*='message-list'] > div",
      "[class*='chat-list'] > div",
      "[data-testid='chat-message']",
      "div[class*='chat-message']",
      "div[class*='message']",
      "[role='listitem']",
      "article",
      ".group", // Tailwind 常用的消息容器类
      "[class*='group']"
    ]

    let messageElements: Element[] = []
    let usedSelector = ""

    for (const selector of messageSelectors) {
      try {
        const elements = Array.from(document.querySelectorAll(selector))
        if (elements.length > 0) {
          console.log(`[Memflow] Kimi: 找到 ${elements.length} 个消息元素 (${selector})`)
          messageElements = elements
          usedSelector = selector
          break
        }
      } catch (e) {
        // 忽略无效选择器
      }
    }

    // 如果没找到，尝试从对话容器中查找
    if (messageElements.length === 0) {
      const containerSelectors = [
        '[class*="chat-list"]',
        '[class*="message-list"]',
        '[class*="conversation"]',
        '[class*="messages"]',
        '[class*="chat"] > div:last-child',
        'main > div',
        '[role="main"]'
      ]
      
      for (const selector of containerSelectors) {
        try {
          const chatContainer = document.querySelector(selector)
          if (chatContainer) {
            const children = Array.from(chatContainer.children).filter(el => {
              // 过滤掉非消息元素（如输入框区域）
              const tagName = el.tagName.toLowerCase()
              return tagName !== 'script' && tagName !== 'style'
            })
            
            if (children.length > 0) {
              messageElements = children
              console.log(`[Memflow] Kimi: 从容器 ${selector} 中找到 ${children.length} 个元素`)
              usedSelector = selector
              break
            }
          }
        } catch (e) {
          // 忽略无效选择器
        }
      }
    }

    // 如果还是没找到，使用基础适配器的逻辑
    if (messageElements.length === 0) {
      console.log("[Memflow] Kimi: 使用基础适配器提取")
      return super.extractConversation()
    }

    console.log(`[Memflow] Kimi: 使用选择器 "${usedSelector}" 处理 ${messageElements.length} 个元素`)

    messageElements.forEach((element, index) => {
      // 获取元素文本
      const text = element.textContent || ""
      const trimmedText = text.trim()

      // 跳过文件上传等UI元素（只包含文件大小）
      if (trimmedText.match(/^\d+\.?\d*\s*(KB|MB|GB)$/i)) {
        console.log(`[Memflow] Kimi: 跳过文件大小元素: ${trimmedText.slice(0, 50)}`)
        return
      }

      // 跳过太短的元素（可能是图标、按钮等）
      if (trimmedText.length < 3) {
        return
      }

      // 判断消息类型
      const className = element.className || ""
      const isUser = className.includes('user') || 
                    element.matches('[class*="user"]') ||
                    element.querySelector('[class*="user"], [data-sender="user"]') !== null
      const isAI = className.includes('assistant') || 
                   className.includes('ai') ||
                   element.matches('[class*="assistant"]') ||
                   element.querySelector('[class*="assistant"], [data-sender="assistant"]') !== null

      let role: "user" | "assistant"
      if (isUser) {
        role = "user"
      } else if (isAI) {
        role = "assistant"
      } else {
        // 通过位置推断 - 通常奇数为用户，偶数为AI，或反过来
        role = index % 2 === 1 ? "user" : "assistant"
      }

      // 提取内容
      let content = trimmedText

      // 如果内容看起来是文件大小，尝试找内部的文本内容
      if (content.match(/^\d+\.?\d*\s*(KB|MB|GB)/i)) {
        // 查找内部的文本元素
        const textSelectors = ['[class*="text"]', '[class*="content"]', 'p', 'span:not(:has(*))']
        for (const sel of textSelectors) {
          const textEl = element.querySelector(sel)
          if (textEl && textEl.textContent) {
            const innerText = textEl.textContent.trim()
            if (innerText.length > content.length || !innerText.match(/^\d+\.?\d*\s*(KB|MB|GB)$/i)) {
              content = innerText
              break
            }
          }
        }
      }

      // 再次检查内容
      if (content && 
          content.length > 2 && 
          !content.match(/^\d+\.?\d*\s*(KB|MB|GB)$/i)) {
        messages.push({
          role,
          content,
          timestamp: new Date()
        })
        console.log(`[Memflow] Kimi: 提取 ${role} 消息 (${content.slice(0, 50)}...)`)
      }
    })

    console.log(`[Memflow] Kimi: 成功提取 ${messages.length} 条消息`)

    // 如果提取的消息太少，回退到基础适配器
    if (messages.length < 2) {
      console.log("[Memflow] Kimi: 提取消息太少，回退到基础适配器")
      return super.extractConversation()
    }

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
