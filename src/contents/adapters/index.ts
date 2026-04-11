import type { IAdapter } from "./base-adapter"
import { createBiliBiliAdapter } from "./bilibili"
import { createChatGPTAdapter } from "./chatgpt"
import { createDeepSeekAdapter } from "./deepseek"
import { createDoubaoAdapter } from "./doubao"
import { createGeminiAdapter } from "./gemini"
import { createKimiAdapter } from "./kimi"
import { createSmartClipAdapter } from "./smartclip"
import { createYouTubeAdapter } from "./youtube"

export { BaseAdapter } from "./base-adapter"
export { BiliBiliAdapter } from "./bilibili"
export { ChatGPTAdapter } from "./chatgpt"
export { DeepSeekAdapter } from "./deepseek"
export { DoubaoAdapter } from "./doubao"
export { GeminiAdapter } from "./gemini"
export { KimiAdapter } from "./kimi"
export { SmartClipAdapter } from "./smartclip"
export { YouTubeAdapter } from "./youtube"

/**
 * 自动检测当前平台并返回对应的适配器
 */
export function detectPlatformAdapter(): IAdapter | null {
  const adapters = [
    createBiliBiliAdapter(),
    createYouTubeAdapter(),
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

/**
 * 检测是否应该使用 SmartClip 通用网页剪藏
 * 当没有匹配到特定平台时，返回 SmartClip 适配器
 */
export function detectSmartClipAdapter(): IAdapter | null {
  const currentHost = window.location.hostname

  const excludedHosts = [
    "chat.deepseek.com",
    "chatgpt.com",
    "openai.com",
    "kimi.moonshot.cn",
    "kimi.ai",
    "www.kimi.com",
    "gemini.google.com",
    "www.doubao.com",
    "bilibili.com",
    "www.bilibili.com",
    "youtube.com",
    "www.youtube.com",
    "youtu.be"
  ]

  for (const host of excludedHosts) {
    if (currentHost.includes(host)) {
      return null
    }
  }

  return createSmartClipAdapter()
}
