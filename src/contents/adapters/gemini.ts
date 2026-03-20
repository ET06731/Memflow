import type { Conversation } from "../../types"
import selectors from "../../config/selectors.json"
import { stripHtml } from "../../utils/cleaner"
import { BaseAdapter } from "./base-adapter"
import type { SelectorConfig } from "./base-adapter"

/**
 * Gemini (Google) 适配器
 */
export class GeminiAdapter extends BaseAdapter {
  platformName = "Gemini"
  selectors: SelectorConfig = selectors.platforms.gemini as SelectorConfig

  detectPlatform(): boolean {
    return (
      window.location.host.includes("gemini.google.com") ||
      window.location.host.includes("aistudio.google.com")
    )
  }

  extractConversation(): Conversation {
    console.log("🚀 [Memflow] 开始 Gemini 深度内容提取...")

    const messages: Conversation["messages"] = []
    const turnElements = this.getTurnElements()

    console.log(`[Memflow] Gemini 检测到 ${turnElements.length} 个 turn 容器`)

    turnElements.forEach((turn, index) => {
      const role = this.getTurnRole(turn, index)
      const fragments = this.getTurnFragments(turn, role)

      if (fragments.length === 0) {
        const fallbackHtml = this.cleanGeminiContent(turn.innerHTML || "")
        this.appendExtractedMessage(messages, role, fallbackHtml)
        return
      }

      fragments.forEach((fragment) => {
        const content = this.cleanGeminiContent(fragment.innerHTML || "")
        this.appendExtractedMessage(messages, role, content)
      })
    })

    return {
      id: crypto.randomUUID(),
      platform: this.platformName,
      url: window.location.href,
      messages,
      createdAt: new Date()
    }
  }

  private getTurnElements(): Element[] {
    const selectorGroups = [
      "[data-turn]",
      "[data-message-author-role]",
      "user-query",
      "model-response",
      "[class*='conversation-turn']"
    ]

    const candidates = selectorGroups.flatMap((selector) => {
      try {
        return Array.from(document.querySelectorAll(selector))
      } catch (_error) {
        return []
      }
    })

    const uniqueCandidates = candidates.filter(
      (element, index) => candidates.indexOf(element) === index
    )

    const turnElements = uniqueCandidates.filter((element) => {
      return !uniqueCandidates.some(
        (other) => other !== element && other.contains(element)
      )
    })

    if (turnElements.length > 0) {
      return turnElements.sort((a, b) =>
        a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1
      )
    }

    return Array.from(document.querySelectorAll(this.selectors.messageContainer))
  }

  private getTurnRole(
    turn: Element,
    index: number
  ): "user" | "assistant" {
    const dataTurn = turn.getAttribute("data-turn")
    const authorRole = turn.getAttribute("data-message-author-role")

    if (dataTurn === "user" || authorRole === "user") {
      return "user"
    }

    if (dataTurn === "assistant" || authorRole === "assistant") {
      return "assistant"
    }

    if (turn.matches(this.selectors.userMessage)) {
      return "user"
    }

    if (turn.matches(this.selectors.aiMessage)) {
      return "assistant"
    }

    const userChild = turn.querySelector(this.selectors.userMessage)
    if (userChild) {
      return "user"
    }

    const assistantChild = turn.querySelector(this.selectors.aiMessage)
    if (assistantChild) {
      return "assistant"
    }

    return index % 2 === 0 ? "user" : "assistant"
  }

  private getTurnFragments(
    turn: Element,
    role: "user" | "assistant"
  ): Element[] {
    const selectorsToUse =
      role === "user" ? this.selectors.userMessage : this.selectors.aiMessage

    const candidates = this.collectCandidates(turn, selectorsToUse)

    return candidates.filter((candidate) => {
      return !candidates.some(
        (other) =>
          other !== candidate &&
          candidate.contains(other) &&
          this.normalizeGeminiContent(other.innerHTML || "").length > 0
      )
    })
  }

  private collectCandidates(turn: Element, selectorText: string): Element[] {
    const selectorList = selectorText
      .split(",")
      .map((selector) => selector.trim())
      .filter(Boolean)

    const candidates: Element[] = []

    if (selectorList.some((selector) => turn.matches(selector))) {
      candidates.push(turn)
    }

    selectorList.forEach((selector) => {
      try {
        candidates.push(...Array.from(turn.querySelectorAll(selector)))
      } catch (_error) {
        // ignore invalid selectors
      }
    })

    const uniqueCandidates = candidates.filter(
      (element, index) => candidates.indexOf(element) === index
    )

    const nonEmptyCandidates = uniqueCandidates.filter((element) => {
      const cleaned = this.cleanGeminiContent(element.innerHTML || "")
      const normalized = this.normalizeGeminiContent(cleaned)
      return normalized.length > 0
    })

    const fragments: Element[] = []
    nonEmptyCandidates.forEach((candidate) => {
      const candidateText = this.normalizeGeminiContent(candidate.innerHTML || "")
      const duplicate = fragments.some((fragment) => {
        const fragmentText = this.normalizeGeminiContent(fragment.innerHTML || "")
        return (
          fragmentText === candidateText ||
          fragmentText.includes(candidateText) ||
          candidateText.includes(fragmentText)
        )
      })

      if (!duplicate) {
        fragments.push(candidate)
      }
    })

    return fragments
  }

  private normalizeGeminiContent(content: string): string {
    return stripHtml(this.cleanGeminiContent(content))
      .replace(/\u00a0/g, " ")
      .replace(/[\u200b-\u200d\uFEFF]/g, "")
      .replace(/\s+/g, " ")
      .trim()
  }

  private cleanGeminiContent(content: string): string {
    return content
      .replace(/<h[1-6]\b[^>]*>(Gemini|Google)<\/h[1-6]>/gi, "")
      .replace(/Show thoughts/gi, "")
      .replace(/Expand to view model thoughts/gi, "")
      .replace(
        /<div\b[^>]*class="[^"]*model-icon[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
        ""
      )
      .replace(/<button\b[^>]*>([\s\S]*?)<\/button>/gi, "")
      .trim()
  }
}

/**
 * 创建 Gemini 适配器
 */
export function createGeminiAdapter(): GeminiAdapter {
  return new GeminiAdapter()
}
