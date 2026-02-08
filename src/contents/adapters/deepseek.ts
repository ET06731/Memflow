import { BaseAdapter } from "./base-adapter"
import type { SelectorConfig } from "./base-adapter"
import selectors from "../../config/selectors.json"

/**
 * DeepSeek 平台适配器
 */
export class DeepSeekAdapter extends BaseAdapter {
    platformName = "DeepSeek"
    selectors: SelectorConfig = selectors.platforms.deepseek as SelectorConfig

    detectPlatform(): boolean {
        return (
            window.location.href.includes("deepseek.com") ||
            window.location.href.includes("chat.deepseek")
        )
    }

    /**
     * DeepSeek 特定的提取逻辑（如果需要覆盖基类方法）
     */
    // extractConversation(): Conversation {
    //   // 可以在这里添加 DeepSeek 特有的提取逻辑
    //   return super.extractConversation()
    // }
}

/**
 * 创建 DeepSeek 适配器实例
 */
export function createDeepSeekAdapter(): DeepSeekAdapter {
    return new DeepSeekAdapter()
}
