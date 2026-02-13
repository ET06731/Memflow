import selectors from "../../config/selectors.json"
import { BaseAdapter } from "./base-adapter"
import type { SelectorConfig } from "./base-adapter"

/**
 * 豆包 (字节跳动) 平台适配器
 */
export class DoubaoAdapter extends BaseAdapter {
  platformName = "豆包"
  selectors: SelectorConfig = selectors.platforms.doubao as SelectorConfig

  detectPlatform(): boolean {
    return window.location.host.includes("doubao.com")
  }

  /**
   * 豆包特定的提取逻辑（如果需要覆盖基类方法）
   */
  // extractConversation(): Conversation {
  //   // 可以在这里添加豆包特有的提取逻辑
  //   return super.extractConversation()
  // }
}

/**
 * 创建豆包适配器实例
 */
export function createDoubaoAdapter(): DoubaoAdapter {
  return new DoubaoAdapter()
}
