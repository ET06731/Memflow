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
        const selectorList = this.selectors.messageContainer.split(',').map(s => s.trim())
        let messageElements: NodeListOf<Element> | null = null

        console.log('🔍 尝试查找消息容器，选择器:', selectorList)

        for (const selector of selectorList) {
            const elements = document.querySelectorAll(selector)
            if (elements.length > 0) {
                console.log(`✅ 找到 ${elements.length} 个消息元素 (${selector})`)
                messageElements = elements
                break
            }
        }

        if (!messageElements || messageElements.length === 0) {
            console.warn('⚠️ 无法找到消息容器，尝试通用方法')
            // 降级：查找所有可能的消息元素
            messageElements = document.querySelectorAll('div[class*="message"], [role="article"], p')
        }

        console.log(`📝 开始处理 ${messageElements.length} 个元素`)

        messageElements.forEach((element, index) => {
            // 判断是用户消息还是AI消息
            const userSelectors = this.selectors.userMessage.split(',').map(s => s.trim())
            const aiSelectors = this.selectors.aiMessage.split(',').map(s => s.trim())

            let isUser = userSelectors.some(sel => element.matches(sel))
            let isAI = aiSelectors.some(sel => element.matches(sel))

            // 如果无法明确判断，通过文本特征或位置推断
            if (!isUser && !isAI) {
                // 通过index判断：偶数为用户，奇数为AI（常见模式）
                isUser = index % 2 === 0
                isAI = !isUser
            }

            const role = isUser ? 'user' : 'assistant'

            // 提取文本内容，保留换行
            let content = element.textContent?.trim() || ''

            // 跳过空内容或太短的内容
            if (!content || content.length < 5) {
                return
            }

            // 处理代码块
            if (this.selectors.codeBlock) {
                const codeBlocks = element.querySelectorAll(this.selectors.codeBlock)
                codeBlocks.forEach((block) => {
                    const code = block.textContent || ''
                    const language = block.className.match(/language-(\w+)/)?.[1] || ''
                    // 注意：这里简化处理，实际可能需要更复杂的逻辑
                    if (code && !content.includes('```')) {
                        content = content.replace(
                            code,
                            `\`\`\`${language}\n${code}\n\`\`\``
                        )
                    }
                })
            }

            if (content) {
                messages.push({
                    role,
                    content,
                    timestamp: new Date()
                })
                console.log(`  [${index}] ${role}: ${content.substring(0, 50)}...`)
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
        const inputBox = document.querySelector(this.selectors.inputBox) as HTMLTextAreaElement | HTMLInputElement

        if (!inputBox) {
            // 尝试 fallback 选择器
            if (this.selectors.fallback) {
                const fallbackInput = document.querySelector(this.selectors.fallback.inputBox) as HTMLTextAreaElement | HTMLInputElement
                if (fallbackInput) {
                    return this.injectToInput(fallbackInput, prompt, this.selectors.fallback.sendButton)
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
        // 设置值
        input.value = prompt

        // 触发 input 事件（某些平台需要这个事件来启用发送按钮）
        input.dispatchEvent(new Event('input', { bubbles: true }))
        input.dispatchEvent(new Event('change', { bubbles: true }))

        // 等待一小段时间确保UI更新
        await new Promise(resolve => setTimeout(resolve, 100))

        // 点击发送按钮
        const sendButton = document.querySelector(sendButtonSelector) as HTMLButtonElement
        if (!sendButton) {
            throw new Error('Send button not found')
        }

        sendButton.click()
    }

    async waitForResponse(timeout = 5000): Promise<string> {
        return new Promise((resolve, reject) => {
            const startTime = Date.now()
            let lastMessageCount = document.querySelectorAll(this.selectors.aiMessage).length

            const observer = new MutationObserver(() => {
                const currentMessages = document.querySelectorAll(this.selectors.aiMessage)

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
                    reject(new Error('Timeout waiting for AI response'))
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
            console.warn('Delete button selector not configured')
            return
        }

        const deleteButton = document.querySelector(
            `[data-message-id="${messageId}"] ${this.selectors.deleteButton}`
        ) as HTMLButtonElement

        if (deleteButton) {
            deleteButton.click()
            await new Promise(resolve => setTimeout(resolve, 300))
        }
    }
}
