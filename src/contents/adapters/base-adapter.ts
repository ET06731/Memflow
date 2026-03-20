import type { Conversation, Message } from "../../types"

/**
 * DOM 选择器配置
 */
export interface SelectorConfig {
  inputBox: string
  sendButton: string
  messageContainer: string
  userMessage: string
  aiMessage: string
  codeBlock?: string
  deleteButton?: string
  title?: string // 新增：标题选择器
  fallback?: {
    inputBox: string
    sendButton: string
  }
}

/**
 * 平台适配器接口
 */
export interface IAdapter {
  platformName: string
  selectors: SelectorConfig

  /**
   * 检测当前页面是否为该平台
   */
  detectPlatform(): boolean

  /**
   * 提取当前对话内容
   */
  extractConversation(): Conversation

  /**
   * 提取单个消息内容
   */
  extractMessage(element: HTMLElement): Message | null

  /**
   * 注入 prompt 到对话框
   */
  injectPrompt(prompt: string): Promise<void>

  /**
   * 等待 AI 回复
   */
  waitForResponse(timeout?: number): Promise<string>

  /**
   * 删除指定消息
   */
  deleteMessage(messageId: string): Promise<void>

  /**
   * 获取所有消息的 DOM 元素
   */
  getMessageElements(): HTMLElement[]
}

/**
 * 基础适配器抽象类
 */
export abstract class BaseAdapter implements IAdapter {
  abstract platformName: string
  abstract selectors: SelectorConfig

  detectPlatform(): boolean {
    return window.location.href.includes(this.platformName.toLowerCase())
  }

  /**
   * 辅助方法：获取元素的角色
   */
  protected getRole(el: Element): "user" | "assistant" | null {
    const userSelectors = this.selectors.userMessage.split(",").map(s => s.trim())
    const aiSelectors = this.selectors.aiMessage.split(",").map(s => s.trim())

    if (userSelectors.some(sel => el.matches(sel))) return "user"
    if (aiSelectors.some(sel => el.matches(sel))) return "assistant"
    const parentUser = el.closest(userSelectors.join(","))
    if (parentUser) return "user"
    const parentAI = el.closest(aiSelectors.join(","))
    if (parentAI) return "assistant"
    return null
  }

  /**
   * 获取所有消息的 DOM 元素
   */
  getMessageElements(): HTMLElement[] {
    const selectorList = this.selectors.messageContainer
      .split(",")
      .map((s) => s.trim())
    const combined: HTMLElement[] = []
    const seen = new Set<Element>()
    
    selectorList.forEach(s => {
      try {
        Array.from(document.querySelectorAll(s)).forEach(el => {
          if (!seen.has(el) && el instanceof HTMLElement) { 
            combined.push(el); 
            seen.add(el); 
          }
        })
      } catch (e) {}
    })

    // 智能过滤逻辑
    let elements = combined.filter(el => {
      const elRole = this.getRole(el)
      const children = combined.filter(other => other !== el && el.contains(other))
      
      if (children.length > 0) {
        const hasDifferentRoleChild = children.some(child => this.getRole(child) !== elRole)
        if (hasDifferentRoleChild) return false
        return true 
      }
      
      const hasParentInList = combined.some(other => other !== el && other.contains(el))
      if (hasParentInList) {
        const parent = combined.find(other => other !== el && other.contains(el))!
        if (this.getRole(parent) === elRole) return false
      }

      return true
    })

    if (elements.length === 0 && combined.length > 0) {
      elements = combined
    } else if (elements.length === 0) {
      elements = Array.from(document.querySelectorAll('div[class*="message"], [role="article"]'))
        .filter(el => el instanceof HTMLElement) as HTMLElement[]
    }

    return elements.sort((a, b) => a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1)
  }

  /**
   * 提取单个消息内容
   */
  extractMessage(element: HTMLElement): Message | null {
    const role = this.getRole(element) || "assistant"
    let content = element.innerHTML || ""

    // ========== 深度清理UI元素（预处理）==========
    content = content.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, "")
    content = content.replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gim, "")
    content = content.replace(/<button\b[^>]*>([\s\S]*?)<\/button>/gi, "")
    content = content.replace(/<svg\b[^>]*>([\s\S]*?)<\/svg>/gi, "")
    content = content.replace(/<img[^>]*src=["']https:\/\/cdn\.deepseek\.com[^"']*["'][^>]*>/gi, "")

    const uiClasses = ["ds-icon", "ds-button", "ds-actions", "ds-copy", "copy", "action", "toolbar", "button", "btn"]
    uiClasses.forEach((cls) => {
      const regex = new RegExp(`<[^>]*class=["'][^"']*${cls}[^"']*["'][^>]*>([\\s\\S]*?)<\\/[^>]*>`, "gi")
      content = content.replace(regex, "")
    })

    content = content.replace(/<[^>]*aria-label=["'](复制|Copy|Regenerate|重新生成|Search|搜索)["'][^>]*>([\s\S]*?)<\/[^>]*>/gi, "")
    content = content.replace(/<img[^>]*src=["']https:\/\/cdn\.deepseek\.com\/site-icons[^"']*["'][^>]*\/?>/gi, "")
    content = content.replace(/!\[\]\(https:\/\/cdn\.deepseek\.com\/site-icons[^\)]*\)/gi, "")
    content = content.replace(/已阅读\s*\d+\s*个网页/g, "")
    content = content.replace(/<[^>]*>\s*\d+\s*个网页\s*<\/[^>]*>/gi, "")
    content = content.replace(/\[-\d+\]/g, "")

    const trimmedContent = content.trim()
    if (trimmedContent && trimmedContent.length > 0) {
      return {
        role,
        content: trimmedContent,
        timestamp: new Date()
      }
    }
    return null
  }

  extractConversation(): Conversation {
    const elements = this.getMessageElements()
    const messages: Message[] = []

    elements.forEach((el) => {
      const msg = this.extractMessage(el)
      if (msg) messages.push(msg)
    })

    return {
      id: crypto.randomUUID(),
      platform: this.platformName,
      url: window.location.href,
      messages,
      createdAt: new Date()
    }
  }

  async injectPrompt(prompt: string): Promise<void> {
    const inputBox = document.querySelector(this.selectors.inputBox) as
      | HTMLTextAreaElement
      | HTMLInputElement

    if (!inputBox) {
      if (this.selectors.fallback) {
        const fallbackInput = document.querySelector(
          this.selectors.fallback.inputBox
        ) as HTMLTextAreaElement | HTMLInputElement
        if (fallbackInput) {
          return this.injectToInput(
            fallbackInput,
            prompt,
            this.selectors.fallback.sendButton
          )
        }
      }
      throw new Error(`Input box not found for ${this.platformName}`)
    }

    return this.injectToInput(inputBox, prompt, this.selectors.sendButton)
  }

  private async injectToInput(
    input: HTMLTextAreaElement | HTMLInputElement,
    prompt: string,
    sendButtonSelector: string
  ): Promise<void> {
    input.focus()
    const proto = Object.getPrototypeOf(input)
    const nativeValueSetter = Object.getOwnPropertyDescriptor(proto, "value")?.set

    if (nativeValueSetter) {
      nativeValueSetter.call(input, prompt)
    } else {
      input.value = prompt
    }

    input.dispatchEvent(new Event("input", { bubbles: true }))
    input.dispatchEvent(new Event("change", { bubbles: true }))
    await new Promise((resolve) => setTimeout(resolve, 500))

    const sendButton = document.querySelector(sendButtonSelector) as HTMLElement
    if (!sendButton) throw new Error("Send button not found")

    if ((sendButton as HTMLButtonElement).disabled || sendButton.getAttribute("aria-disabled") === "true" || sendButton.classList.contains("disabled")) {
      input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true }))
      input.dispatchEvent(new KeyboardEvent("keypress", { bubbles: true }))
      input.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true }))
      input.dispatchEvent(new Event("input", { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 300))
    }

    sendButton.click()
    const mouseEventInit = { bubbles: true, cancelable: true, view: window }
    sendButton.dispatchEvent(new MouseEvent("mousedown", mouseEventInit))
    sendButton.dispatchEvent(new MouseEvent("mouseup", mouseEventInit))

    if (document.activeElement === input) {
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", code: "Enter", bubbles: true }))
    }
  }

  async waitForResponse(timeout = 5000): Promise<string> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now()
      let lastMessageCount = document.querySelectorAll(this.selectors.aiMessage).length

      const observer = new MutationObserver(() => {
        const currentMessages = document.querySelectorAll(this.selectors.aiMessage)
        if (currentMessages.length > lastMessageCount) {
          const lastMessage = currentMessages[currentMessages.length - 1]
          const content = lastMessage.textContent?.trim()
          if (content && content.length > 10) {
            observer.disconnect()
            resolve(content)
          }
        }
        if (Date.now() - startTime > timeout) {
          observer.disconnect()
          reject(new Error("Timeout waiting for AI response"))
        }
      })
      observer.observe(document.body, { childList: true, subtree: true })
    })
  }

  async deleteMessage(messageId: string): Promise<void> {
    if (!this.selectors.deleteButton) return
    const deleteButton = document.querySelector(`[data-message-id="${messageId}"] ${this.selectors.deleteButton}`) as HTMLButtonElement
    if (deleteButton) {
      deleteButton.click()
      await new Promise((resolve) => setTimeout(resolve, 300))
    }
  }
}
