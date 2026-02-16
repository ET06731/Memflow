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

  extractConversation(): Conversation {
    const messages: Message[] = []

    // 尝试使用选择器查找消息容器
    const selectorList = this.selectors.messageContainer
      .split(",")
      .map((s) => s.trim())
    let messageElements: NodeListOf<Element> | null = null

    console.log("🔍 尝试查找消息容器，选择器:", selectorList)

    for (const selector of selectorList) {
      const elements = document.querySelectorAll(selector)
      if (elements.length > 0) {
        console.log(`✅ 找到 ${elements.length} 个消息元素 (${selector})`)
        messageElements = elements
        break
      }
    }

    if (!messageElements || messageElements.length === 0) {
      console.warn("⚠️ 无法找到消息容器，尝试通用方法")
      // 降级：查找所有可能的消息元素
      messageElements = document.querySelectorAll(
        'div[class*="message"], [role="article"], p'
      )
    }

    console.log(`📝 开始处理 ${messageElements.length} 个元素`)

    messageElements.forEach((element, index) => {
      // 判断是用户消息还是AI消息
      const userSelectors = this.selectors.userMessage
        .split(",")
        .map((s) => s.trim())
      const aiSelectors = this.selectors.aiMessage
        .split(",")
        .map((s) => s.trim())

      let isUser = userSelectors.some((sel) => element.matches(sel))
      let isAI = aiSelectors.some((sel) => element.matches(sel))

      // 如果无法明确判断，通过文本特征或位置推断
      if (!isUser && !isAI) {
        // 通过index判断：偶数为用户，奇数为AI（常见模式）
        isUser = index % 2 === 0
        isAI = !isUser
      }

      const role = isUser ? "user" : "assistant"

      // 提取 HTML 内容，以便保留格式（列表、表格、代码块等）
      // 我们将在构建 Markdown 时处理它
      let content = element.innerHTML || ""

      // ========== 深度清理UI元素（预处理）==========
      // 1. 移除脚本和样式
      content = content.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, "")
      content = content.replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gim, "")

      // 2. 移除 DeepSeek 特定的UI元素
      content = content.replace(/<button\b[^>]*>([\s\S]*?)<\/button>/gi, "")
      content = content.replace(/<svg\b[^>]*>([\s\S]*?)<\/svg>/gi, "")
      content = content.replace(
        /<img[^>]*src=["']https:\/\/cdn\.deepseek\.com[^"']*["'][^>]*>/gi,
        ""
      ) // 移除 DeepSeek 图标

      // 3. 移除带特定 class 的元素
      const uiClasses = [
        "ds-icon",
        "ds-button",
        "ds-actions",
        "ds-copy",
        "copy",
        "action",
        "toolbar",
        "button",
        "btn"
      ]
      uiClasses.forEach((cls) => {
        const regex = new RegExp(
          `<[^>]*class=["'][^"']*${cls}[^"']*["'][^>]*>([\\s\\S]*?)<\\/[^>]*>`,
          "gi"
        )
        content = content.replace(regex, "")
      })

      // 4. 移除 aria-label 包含特定文本的元素
      content = content.replace(
        /<[^>]*aria-label=["'](复制|Copy|Regenerate|重新生成|Search|搜索)["'][^>]*>([\s\S]*?)<\/[^>]*>/gi,
        ""
      )

      // 5. 移除 DeepSeek 搜索结果相关的图片和链接
      // 移除 site-icons 图片
      content = content.replace(
        /<img[^>]*src=["']https:\/\/cdn\.deepseek\.com\/site-icons[^"']*["'][^>]*\/?>/gi,
        ""
      )
      // 移除已经转换为 markdown 的 site-icons 图片
      content = content.replace(
        /!\[\]\(https:\/\/cdn\.deepseek\.com\/site-icons[^\)]*\)/gi,
        ""
      )

      // 6. 移除 DeepSeek 特定的UI文本
      // 移除 "已阅读 X 个网页" 文本
      content = content.replace(/已阅读\s*\d+\s*个网页/g, "")
      // 移除独立的 "X 个网页" 文本（通常在搜索结果底部）
      content = content.replace(/<[^>]*>\s*\d+\s*个网页\s*<\/[^>]*>/gi, "")

      // 7. 移除引用链接中的搜索结果标记（如 [-2], [-4] 等）
      content = content.replace(/\[-\d+\]/g, "")

      const trimmedContent = content.trim()

      if (trimmedContent && trimmedContent.length > 0) {
        messages.push({
          role,
          content: trimmedContent,
          timestamp: new Date()
        })
        // console.log(`  [${index}] ${role}: extracted HTML length ${trimmedContent.length}`)
      }
    })

    console.log(`✅ 成功提取 ${messages.length} 条消息`)

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
      // 尝试 fallback 选择器
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
    // 1. 聚焦输入框
    input.focus()

    // 2. 设置值 - 针对 React 等框架做特殊处理
    // React 16+ 重写了 value setter，直接赋值可能不会触发状态更新
    const proto = Object.getPrototypeOf(input)
    const nativeValueSetter = Object.getOwnPropertyDescriptor(
      proto,
      "value"
    )?.set

    if (nativeValueSetter) {
      nativeValueSetter.call(input, prompt)
    } else {
      input.value = prompt
    }

    // 3. 触发一系列事件以激活 UI 状态
    input.dispatchEvent(new Event("input", { bubbles: true }))
    input.dispatchEvent(new Event("change", { bubbles: true }))

    // 4. 等待 UI 响应（例如发送按钮变亮）
    await new Promise((resolve) => setTimeout(resolve, 500))

    // 5. 查找发送按钮
    const sendButton = document.querySelector(sendButtonSelector) as HTMLElement

    if (!sendButton) {
      throw new Error("Send button not found")
    }

    // 6. 检查按钮状态，如果禁用则尝试重新触发事件
    if (
      (sendButton as HTMLButtonElement).disabled ||
      sendButton.getAttribute("aria-disabled") === "true" ||
      sendButton.classList.contains("disabled")
    ) {
      console.warn("[Memflow] 发送按钮禁用，尝试模拟键盘输入...")
      input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true }))
      input.dispatchEvent(new KeyboardEvent("keypress", { bubbles: true }))
      input.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true }))
      input.dispatchEvent(new Event("input", { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 300))
    }

    // 7. 触发点击 (多种方式确保成功)
    console.log("[Memflow] 点击发送按钮...")
    sendButton.click()

    // 备用：模拟鼠标事件（某些按钮监听 mousedown/up）
    const mouseEventInit = {
      bubbles: true,
      cancelable: true,
      view: window
    }
    sendButton.dispatchEvent(new MouseEvent("mousedown", mouseEventInit))
    sendButton.dispatchEvent(new MouseEvent("mouseup", mouseEventInit))

    // 如果还没发送出去，可能需要回车发送
    if (document.activeElement === input) {
      input.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Enter",
          code: "Enter",
          bubbles: true
        })
      )
    }
  }

  async waitForResponse(timeout = 5000): Promise<string> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now()
      let lastMessageCount = document.querySelectorAll(
        this.selectors.aiMessage
      ).length

      const observer = new MutationObserver(() => {
        const currentMessages = document.querySelectorAll(
          this.selectors.aiMessage
        )

        // 检查是否有新消息
        if (currentMessages.length > lastMessageCount) {
          const lastMessage = currentMessages[currentMessages.length - 1]
          const content = lastMessage.textContent?.trim()

          if (content && content.length > 10) {
            observer.disconnect()
            resolve(content)
          }
        }

        // 超时检查
        if (Date.now() - startTime > timeout) {
          observer.disconnect()
          reject(new Error("Timeout waiting for AI response"))
        }
      })

      observer.observe(document.body, {
        childList: true,
        subtree: true
      })
    })
  }

  async deleteMessage(messageId: string): Promise<void> {
    if (!this.selectors.deleteButton) {
      console.warn("Delete button selector not configured")
      return
    }

    const deleteButton = document.querySelector(
      `[data-message-id="${messageId}"] ${this.selectors.deleteButton}`
    ) as HTMLButtonElement

    if (deleteButton) {
      deleteButton.click()
      await new Promise((resolve) => setTimeout(resolve, 300))
    }
  }
}
