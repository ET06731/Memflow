import selectors from "../../config/selectors.json"
import { BaseAdapter } from "./base-adapter"
import type { SelectorConfig } from "./base-adapter"

/**
 * ChatGPT 平台适配器
 */
export class ChatGPTAdapter extends BaseAdapter {
  platformName = "ChatGPT"
  selectors: SelectorConfig = selectors.platforms.chatgpt as SelectorConfig

  detectPlatform(): boolean {
    return (
      window.location.host.includes("chatgpt.com") ||
      window.location.host.includes("openai.com")
    )
  }

  // ChatGPT 的消息结构比较标准，可以直接使用 BaseAdapter 的逻辑
}

/**
 * 创建 ChatGPT 适配器实例
 */
export function createChatGPTAdapter(): ChatGPTAdapter {
  return new ChatGPTAdapter()
}
