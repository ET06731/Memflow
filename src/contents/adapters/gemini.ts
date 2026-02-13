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
   * 由于 Gemini 使用复杂的数据属性和动态加载，可能需要特殊处理
   */
  // extractConversation(): Conversation {
  //   // 如果需要覆盖基类方法，在这里添加 Gemini 特有的提取逻辑
  //   return super.extractConversation()
  // }
}

/**
 * 创建 Gemini 适配器实例
 */
export function createGeminiAdapter(): GeminiAdapter {
  return new GeminiAdapter()
}
