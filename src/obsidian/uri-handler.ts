import type { Metadata } from "../types"

export interface ObsidianConfig {
  vaultName: string
  defaultFolder: string
  fileNameFormat: string
  contentFormat: "callout" | "web"
  exportMethod: "uri" | "download"
  autoOpen?: boolean
}

/**
 * Obsidian URI 处理器
 * 使用原生 &clipboard 参数，Obsidian 自动从剪贴板读取内容
 * 无需 Advanced URI 插件，无需手动粘贴
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

  async exportToObsidian(
    markdown: string,
    metadata: Metadata
  ): Promise<{
    success: boolean
    method: "direct" | "clipboard" | "download"
    message: string
  }> {
    try {
      console.log("🔄 exportToObsidian 开始执行")

      const filename = this.generateFilename(metadata)
      const filePath = this.config.defaultFolder
        ? `${this.config.defaultFolder}/${filename}`.replace(/\\/g, "/")
        : filename.replace(/\\/g, "/")

      console.log("📂 目标路径:", filePath)

      const vault = this.config.vaultName
      const vaultParam = vault ? `&vault=${encodeURIComponent(vault)}` : ""

      // 构建基础 URI
      let obsidianUrl = `obsidian://new?file=${encodeURIComponent(filePath)}${vaultParam}`
      obsidianUrl += "&overwrite=true"

      // autoOpen 设置
      if (this.config.autoOpen === false) {
        obsidianUrl += "&silent=true"
      }

      // 步骤1: 复制到剪贴板
      console.log("📋 复制内容到剪贴板...")
      const clipboardSuccess = await this.copyToClipboard(markdown)

      if (!clipboardSuccess) {
        // 剪贴板失败，尝试直接传参（仅短内容）
        if (markdown.length < 2000) {
          obsidianUrl += `&content=${encodeURIComponent(markdown)}`
          console.log("🔗 剪贴板失败，直接传参:", obsidianUrl.substring(0, 100))

          // 只有 autoOpen 不为 false 时才打开 Obsidian
          if (this.config.autoOpen !== false) {
            this.openObsidianUrl(obsidianUrl)
          } else {
            console.log("🔇 静默模式：跳过打开 Obsidian")
          }

          return {
            success: true,
            method: "direct",
            message:
              this.config.autoOpen !== false
                ? "✅ 已发送到 Obsidian！"
                : "✅ 文件已准备（静默模式）"
          }
        }

        return {
          success: false,
          method: "download",
          message: "❌ 无法访问剪贴板且内容过长"
        }
      }

      // 步骤2: 添加 &clipboard 参数，Obsidian 自动读取剪贴板
      obsidianUrl += "&clipboard"
      console.log("✅ 剪贴板就绪，调用 URI:", obsidianUrl)

      // 只有 autoOpen 不为 false 时才打开 Obsidian
      if (this.config.autoOpen !== false) {
        this.openObsidianUrl(obsidianUrl)
      } else {
        console.log("🔇 静默模式：跳过打开 Obsidian，文件已在后台创建")
      }

      return {
        success: true,
        method: "clipboard",
        message:
          this.config.autoOpen !== false
            ? "✅ 已发送到 Obsidian！"
            : "✅ 已在后台创建文件"
      }
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
   * 复制到剪贴板
   */
  private async copyToClipboard(text: string): Promise<boolean> {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(text)
        return true
      } catch (err) {
        console.warn("Clipboard API 失败:", err)
      }
    }

    try {
      const textarea = document.createElement("textarea")
      textarea.value = text
      textarea.style.cssText = "position:fixed;left:-9999px;opacity:0;"
      document.body.appendChild(textarea)
      textarea.select()

      const success = document.execCommand("copy")
      document.body.removeChild(textarea)

      if (success) return true
    } catch (err) {
      console.warn("execCommand 失败:", err)
    }

    return false
  }

  /**
   * 打开 Obsidian URL
   * 直接使用 window.open，避免 background script 通信延迟
   */
  private openObsidianUrl(url: string): void {
    console.log("🔗 打开 Obsidian:", url)

    // 直接使用 location.href 跳转，速度最快
    // 使用 _self 确保在当前标签页打开（如果是弹出窗口）
    window.location.href = url
  }

  static validateConfig(config: Partial<ObsidianConfig>): boolean {
    return !!(config.vaultName && config.vaultName.trim())
  }
}

export type { ObsidianConfig as Config }
