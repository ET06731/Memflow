import type { IAdapter } from "./base-adapter"
import { createChatGPTAdapter } from "./chatgpt"
import { createDeepSeekAdapter } from "./deepseek"
import { createDoubaoAdapter } from "./doubao"
import { createGeminiAdapter } from "./gemini"
import { createKimiAdapter } from "./kimi"

export { BaseAdapter } from "./base-adapter"
export { ChatGPTAdapter } from "./chatgpt"
export { DeepSeekAdapter } from "./deepseek"
export { DoubaoAdapter } from "./doubao"
export { GeminiAdapter } from "./gemini"
export { KimiAdapter } from "./kimi"

/**
 * 自动检测当前平台并返回对应的适配器
 */
export function detectPlatformAdapter(): IAdapter | null {
  // 按优先级尝试检测
  const adapters = [
    createDeepSeekAdapter(),
    createChatGPTAdapter(),
    createKimiAdapter(),
    createGeminiAdapter(),
    createDoubaoAdapter()
  ]

  for (const adapter of adapters) {
    if (adapter.detectPlatform()) {
      console.log(`✅ 检测到平台: ${adapter.platformName}`)
      return adapter
    }
  }

  return null
}
