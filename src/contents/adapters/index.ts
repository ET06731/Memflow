import type { IAdapter } from "./base-adapter"
import { createDeepSeekAdapter } from "./deepseek"
import { createChatGPTAdapter } from "./chatgpt"
import { createKimiAdapter } from "./kimi"

export { BaseAdapter } from "./base-adapter"
export { DeepSeekAdapter } from "./deepseek"
export { KimiAdapter } from "./kimi"
export { ChatGPTAdapter } from "./chatgpt"

/**
 * 自动检测当前平台并返回对应的适配器
 */
export function detectPlatformAdapter(): IAdapter | null {
    // 按优先级尝试检测
    const adapters = [
        createDeepSeekAdapter(),
        createChatGPTAdapter(),
        createKimiAdapter()
    ]

    for (const adapter of adapters) {
        if (adapter.detectPlatform()) {
            console.log(`✅ 检测到平台: ${adapter.platformName}`)
            return adapter
        }
    }

    return null
}

