import type { Metadata } from "../types"

export interface ObsidianConfig {
  vaultName: string
  defaultFolder: string
  fileNameFormat: string
  contentFormat: "callout" | "web"
  exportMethod: "uri" | "download"
  autoOpen?: boolean // 导出后自动打开 Obsidian (默认为 true)
}

/**
 * Obsidian URI 处理器 - 参考 Obsidian Clipper 实现
 * 核心逻辑:
 * 1. 尝试复制内容到剪贴板
 * 2. 调用 obsidian://new?file=...&clipboard (原生协议)
 * 3. Obsidian 自动从剪贴板读取内容
 *
 * 特点:
 * - 零插件依赖 (使用原生 obsidian:// 协议)
 * - 无视长度限制 (通过剪贴板中转)
 * - 支持 append/prepend/overwrite 行为
 */
export class ObsidianURIHandler {
  private config: ObsidianConfig

  constructor(config: ObsidianConfig) {
    this.config = config
  }

  generateFilename(metadata: Metadata): string {
    const date = new Date().toISOString().split("T")[0]
    const title = this.sanitizeFilename(metadata.title || "未命名对话")
    const platform = metadata.platform || "AI"

    return (
      this.config.fileNameFormat
        .replace("{{date}}", date)
        .replace("{{title}}", title.slice(0, 30))
        .replace("{{platform}}", platform) + ".md"
    )
  }

  private sanitizeFilename(filename: string): string {
    return filename
      .replace(/[<>:"/\\|?*]/g, "-")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim()
  }

  /**
   * 导出到 Obsidian (参考 Clipper 实现)
   */
  async exportToObsidian(
    markdown: string,
    metadata: Metadata
  ): Promise<{
    success: boolean
    method: "direct" | "clipboard" | "download"
    message: string
  }> {
    try {
      console.log("🔄 exportToObsidian 开始执行 (Clipper 模式)")
      console.log("⚙️ Vault:", this.config.vaultName)

      const filename = this.generateFilename(metadata)

      // 确保路径以 / 结尾
      let folder = this.config.defaultFolder || ""
      if (folder && !folder.endsWith("/")) {
        folder += "/"
      }

      const filePath = folder + filename
      console.log("📂 目标路径:", filePath)

      // 核心逻辑: 复制到剪贴板 + 调用 URI
      return await this.saveToObsidian(markdown, filePath)
    } catch (error) {
      console.error("❌ Obsidian 导出失败:", error)
      return {
        success: false,
        method: "download",
        message: "❌ 导出失败"
      }
    }
  }

  /**
   * 核心导出逻辑 (纯原生方案，无需插件)
   */
  private async saveToObsidian(
    fileContent: string,
    filePath: string
  ): Promise<{
    success: boolean
    method: "direct" | "clipboard" | "download"
    message: string
  }> {
    const vault = this.config.vaultName
    const vaultParam = vault ? `&vault=${encodeURIComponent(vault)}` : ""

    // 策略1: 短内容直接通过 URI content 参数传递
    if (fileContent.length < 1800) {
      let obsidianUrl = `obsidian://new?file=${encodeURIComponent(filePath)}${vaultParam}`
      obsidianUrl += "&overwrite=true"

      // 自动打开设置
      if (this.config.autoOpen === false) {
        obsidianUrl += "&silent=true"
      }

      obsidianUrl += `&content=${encodeURIComponent(fileContent)}`

      console.log("🔗 短内容直接传递:", obsidianUrl.substring(0, 200) + "...")
      this.openObsidianUrl(obsidianUrl)

      return {
        success: true,
        method: "direct",
        message: "✅ 已发送到 Obsidian！"
      }
    }

    // 策略2: 长内容使用剪贴板 + 创建空文件
    console.log("📋 长内容，使用剪贴板方案...")

    // 先创建空文件（带提示）
    let obsidianUrl = `obsidian://new?file=${encodeURIComponent(filePath)}${vaultParam}`
    obsidianUrl += "&overwrite=true"

    if (this.config.autoOpen === false) {
      obsidianUrl += "&silent=true"
    }

    // 空文件占位内容
    const placeholder = "# 正在加载...\n\n请稍候，或手动粘贴剪贴板内容 (Ctrl+V)"
    obsidianUrl += `&content=${encodeURIComponent(placeholder)}`

    console.log("🔗 创建空文件:", filePath)
    this.openObsidianUrl(obsidianUrl)

    // 尝试写入剪贴板
    const clipboardSuccess = await this.copyToClipboard(fileContent)

    if (clipboardSuccess) {
      return {
        success: true,
        method: "clipboard",
        message:
          this.config.autoOpen !== false
            ? "✅ 已打开 Obsidian！内容已复制到剪贴板，请按 Ctrl+V 粘贴"
            : "✅ 文件已在后台创建，内容已复制到剪贴板"
      }
    } else {
      return {
        success: true,
        method: "clipboard",
        message: "⚠️ 已打开 Obsidian 但剪贴板写入失败，请手动复制内容"
      }
    }
  }

  /**
   * 复制到剪贴板 (带多种回退机制)
   */
  private async copyToClipboard(text: string): Promise<boolean> {
    // 方法1: 现代 Clipboard API
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(text)
        console.log("✅ 使用 Clipboard API 成功")
        return true
      } catch (err) {
        console.warn("⚠️ Clipboard API 失败:", err)
      }
    }

    // 方法2: 传统 execCommand 回退
    try {
      const textarea = document.createElement("textarea")
      textarea.value = text
      textarea.style.cssText = "position:fixed;left:-9999px;opacity:0;"
      document.body.appendChild(textarea)
      textarea.select()

      const success = document.execCommand("copy")
      document.body.removeChild(textarea)

      if (success) {
        console.log("✅ 使用 execCommand 成功")
        return true
      }
    } catch (err) {
      console.warn("⚠️ execCommand 失败:", err)
    }

    return false
  }

  /**
   * 打开 Obsidian URL
   */
  private openObsidianUrl(url: string): void {
    console.log("🔗 打开 Obsidian:", url)

    // 尝试通过 background script 打开 (如果是扩展环境)
    if (
      typeof chrome !== "undefined" &&
      chrome.runtime &&
      chrome.runtime.sendMessage
    ) {
      try {
        chrome.runtime
          .sendMessage({
            action: "openObsidianUrl",
            url: url
          })
          .catch((error) => {
            console.warn("Background script 失败，使用 window.open:", error)
            window.open(url, "_self")
          })
        return
      } catch (e) {
        console.warn("sendMessage 失败:", e)
      }
    }

    // 直接打开
    window.open(url, "_self")
  }

  static validateConfig(config: Partial<ObsidianConfig>): boolean {
    return !!(config.vaultName && config.vaultName.trim())
  }
}

export type { ObsidianConfig as Config }
