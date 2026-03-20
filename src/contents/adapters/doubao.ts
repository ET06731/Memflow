import type { Conversation, Message } from "../../types"
import selectors from "../../config/selectors.json"
import { BaseAdapter } from "./base-adapter"
import type { SelectorConfig } from "./base-adapter"

/**
 * 豆包适配器
 */
export class DoubaoAdapter extends BaseAdapter {
  platformName = "豆包"
  selectors: SelectorConfig = selectors.platforms.doubao as SelectorConfig

  detectPlatform(): boolean {
    return window.location.host.includes("doubao.com")
  }

  extractConversation(): Conversation {
    console.log("🚀 [Memflow] 开始豆包内容提取...")

    const messages: Message[] = []
    const messageElements = this.getMessageElements()

    console.log(`[Memflow] 豆包检测到 ${messageElements.length} 个候选消息节点`)

    messageElements.forEach(({ element, role }) => {
      const content = this.extractMessageContent(element, role)
      this.appendExtractedMessage(messages, role, content)
    })

    if (messages.length === 0) {
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

  private getMessageElements(): Array<{
    element: Element
    role: Message["role"]
  }> {
    const userCandidates = this.collectRoleCandidates(
      this.selectors.userMessage,
      "user"
    )
    const assistantCandidates = this.collectRoleCandidates(
      this.selectors.aiMessage,
      "assistant"
    )

    return [...userCandidates, ...assistantCandidates].sort((a, b) =>
      a.element.compareDocumentPosition(b.element) & Node.DOCUMENT_POSITION_FOLLOWING
        ? -1
        : 1
    )
  }

  private collectRoleCandidates(
    selectorText: string,
    role: Message["role"]
  ): Array<{ element: Element; role: Message["role"] }> {
    const selectors = selectorText
      .split(",")
      .map((selector) => selector.trim())
      .filter(Boolean)

    const candidates = selectors.flatMap((selector) => {
      try {
        return Array.from(document.querySelectorAll(selector))
      } catch (_error) {
        return []
      }
    })

    const uniqueCandidates = candidates.filter(
      (element, index) => candidates.indexOf(element) === index
    )

    const topLevelCandidates = uniqueCandidates.filter((element) => {
      return !uniqueCandidates.some(
        (other) =>
          other !== element &&
          element.contains(other) &&
          this.hasMeaningfulText(other)
      )
    })

    return topLevelCandidates.map((element) => ({ element, role }))
  }

  private extractMessageContent(
    element: Element,
    role: Message["role"]
  ): string {
    const clonedElement = element.cloneNode(true) as HTMLElement
    const oppositeSelectors =
      role === "user" ? this.selectors.aiMessage : this.selectors.userMessage

    oppositeSelectors
      .split(",")
      .map((selector) => selector.trim())
      .filter(Boolean)
      .forEach((selector) => {
        try {
          clonedElement.querySelectorAll(selector).forEach((node) => node.remove())
        } catch (_error) {
          // ignore invalid selectors
        }
      })

    const preferredContentSelectors =
      role === "user"
        ? [
            "div[data-testid='message_text_content'].container-QQkdo4",
            "[data-testid='message_text_content']"
          ]
        : [
            "div.flow-markdown-body[data-testid='message_text_content']",
            "div[data-testid='message_text_content'].container-P2rR72",
            "div[data-testid='message_content']",
            ".flow-markdown-body",
            "[data-testid='message_text_content']"
          ]

    for (const selector of preferredContentSelectors) {
      const target = clonedElement.matches(selector)
        ? clonedElement
        : clonedElement.querySelector(selector)

      if (!target) {
        continue
      }

      const html = (target as HTMLElement).innerHTML || ""
      if (this.hasMeaningfulText(target)) {
        return html
      }
    }

    return clonedElement.innerHTML || ""
  }

  private hasMeaningfulText(element: Element): boolean {
    const normalized = this.normalizeCandidateContent(
      (element as HTMLElement).innerHTML || ""
    )
    return normalized.length > 0
  }

  private normalizeCandidateContent(content: string): string {
    return content
      .replace(/<button\b[^>]*>([\s\S]*?)<\/button>/gi, "")
      .replace(/<svg\b[^>]*>([\s\S]*?)<\/svg>/gi, "")
      .replace(/<img\b[^>]*>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  }
}

/**
 * 创建豆包适配器
 */
export function createDoubaoAdapter(): DoubaoAdapter {
  return new DoubaoAdapter()
}
