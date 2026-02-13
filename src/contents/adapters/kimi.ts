import selectors from "../../config/selectors.json"
import { BaseAdapter } from "./base-adapter"
import type { SelectorConfig } from "./base-adapter"

/**
 * Kimi (Moonshot) 平台适配器
 */
export class KimiAdapter extends BaseAdapter {
  platformName = "Kimi"
  selectors: SelectorConfig = selectors.platforms.kimi as SelectorConfig

  detectPlatform(): boolean {
    // 支持所有 Kimi 域名变体
    return (
      window.location.host.includes("kimi.moonshot.cn") ||
      window.location.host.includes("kimi.ai") ||
      window.location.host.includes("kimi.com")
    )
  }

  /**
   * Kimi 的有些内容是动态加载的，可能需要特殊的等待逻辑
   * 但目前 BaseAdapter 的 MutationObserver 应该足够覆盖大部分情况
   */
}

/**
 * 创建 Kimi 适配器实例
 */
export function createKimiAdapter(): KimiAdapter {
  return new KimiAdapter()
}
