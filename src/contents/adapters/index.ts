import { createDeepSeekAdapter } from "./deepseek"
import type { IAdapter } from "./base-adapter"

/**
 * 平台适配器注册表
 */
const adapters: IAdapter[] = [
    createDeepSeekAdapter()
    // 未来添加更多适配器：
    // createChatGPTAdapter(),
    // createGeminiAdapter(),
    // createClaudeAdapter(),
]

/**
 * 检测当前平台并返回对应的适配器
 */
export function detectPlatformAdapter(): IAdapter | null {
    for (const adapter of adapters) {
        if (adapter.detectPlatform()) {
            console.log(`✅ Detected platform: ${adapter.platformName}`)
            return adapter
        }
    }

    console.warn("⚠️ No platform adapter found for current page")
    return null
}

/**
 * 导出所有适配器相关
 */
export * from "./base-adapter"
export * from "./deepseek"
