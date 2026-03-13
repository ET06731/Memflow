import selectors from "../../config/selectors.json"
import { BaseAdapter } from "./base-adapter"
import type { SelectorConfig } from "./base-adapter"

/**
 * Gemini (Google) 平台适配器
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

  /**
   * Gemini 特定的提取逻辑
   */
  extractConversation() {
    console.log("🚀 [Memflow] 开始 Gemini 深度内容提取...")
    const conversation = super.extractConversation()

    conversation.messages = conversation.messages.map((msg) => {
      let content = msg.content
      // 深度清理：移除 Gemini 标题、图标、显示思路按钮等
      content = content.replace(/<h[1-6]\b[^>]*>(Gemini|Google)<\/h[1-6]>/gi, "")
      content = content.replace(/显示思路|Show thoughts/gi, "")
      content = content.replace(/<div\b[^>]*class="[^"]*model-icon[^"]*"[^>]*>([\s\S]*?)<\/div>/gi, "")
      msg.content = content.trim()
      return msg
    }).filter(msg => msg.content.length > 0)
    
    return conversation
  }
}

/**
 * 创建 Gemini 适配器实例
 */
export function createGeminiAdapter(): GeminiAdapter {
  return new GeminiAdapter()
}
