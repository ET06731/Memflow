import type { Conversation, Metadata } from "../types"

export interface ObsidianConfig {
  vaultName: string
  defaultFolder: string
  fileNameFormat: string
  contentFormat: "callout" | "web"
  exportMethod: "uri" | "download"
}

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
      .replace(/[<>:"/\|?*]/g, "-")
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
      console.log("⚙️ Vault名称:", this.config.vaultName)
      console.log("📁 默认文件夹:", this.config.defaultFolder)

      const filename = this.generateFilename(metadata)
      console.log("📄 生成的文件名:", filename)

      // 使用正斜杠构建路径（URI 标准）
      const filePath = this.config.defaultFolder
        ? `${this.config.defaultFolder}/${filename}`.replace(/\\/g, "/")
        : filename.replace(/\\/g, "/")
      console.log("📂 完整文件路径:", filePath)

      const estimatedUriLength = this.estimateURILength(filePath, markdown)
      console.log(`📊 预估 URI 长度: ${estimatedUriLength} 字符`)

      // 策略1: 短内容直接通过 URI 创建
      if (estimatedUriLength < 2000) {
        const uri = this.buildURI(filePath, markdown)
        console.log("🔗 URI:", uri.substring(0, 200) + "...")

        // 尝试打开 URI
        const opened = window.open(uri, "_blank")

        if (!opened) {
          console.warn("⚠️ 弹窗被拦截，尝试直接跳转")
          window.location.href = uri
        }

        return {
          success: true,
          method: "direct",
          message:
            "✅ 已发送到 Obsidian（如未自动创建，请检查 Vault 名称是否正确）"
        }
      }

      // 策略2: 中等内容尝试分段
      if (estimatedUriLength < 5000) {
        console.log("📦 尝试分段发送...")
        return await this.exportInSegments(markdown, metadata, filePath)
      }

      // 策略3: 长内容使用剪贴板
      console.log("📋 内容较长，使用剪贴板模式")
      return await this.exportViaClipboard(markdown, filePath)
    } catch (error) {
      console.error("❌ Obsidian 导出失败:", error)
      return {
        success: false,
        method: "download",
        message: "❌ 导出失败，请尝试下载文件"
      }
    }
  }

  /**
   * 通过剪贴板导出
   */
  private async exportViaClipboard(
    markdown: string,
    filePath: string
  ): Promise<{
    success: boolean
    method: "direct" | "clipboard" | "download"
    message: string
  }> {
    // 使用 buildURI("") 生成 obsidian://new URI，确保创建文件
    const openUri = this.buildURI(filePath, "")
    console.log("🔗 创建URI:", openUri)

    try {
      await navigator.clipboard.writeText(markdown)
      console.log("✅ 已复制到剪贴板")
    } catch (e) {
      console.error("❌ 复制到剪贴板失败:", e)
      return {
        success: false,
        method: "download",
        message: "❌ 无法访问剪贴板，请尝试下载文件"
      }
    }

    // 打开 Obsidian
    window.open(openUri, "_blank")

    return {
      success: true,
      method: "clipboard",
      message: `📋 内容已复制到剪贴板！\n\n请在 Obsidian 中：\n1. 按 Ctrl+V 粘贴内容\n2. 保存到: ${filePath}`
    }
  }

  /**
   * 分段导出
   */
  private async exportInSegments(
    markdown: string,
    metadata: Metadata,
    filePath: string
  ): Promise<{
    success: boolean
    method: "direct" | "clipboard" | "download"
    message: string
  }> {
    const SEGMENT_SIZE = 800 // 每段约 800 字符
    const segments = this.splitIntoSegments(markdown, SEGMENT_SIZE)

    console.log(`📦 分割为 ${segments.length} 段`)

    try {
      // 发送第一段（创建文件）
      const firstUri = this.buildURI(
        filePath,
        segments[0] + "\n\n[内容加载中...]"
      )
      window.open(firstUri, "_blank")

      // 等待 Obsidian 打开
      await this.delay(800)

      // 发送剩余段落
      for (let i = 1; i < segments.length; i++) {
        const appendUri = this.buildAppendURI(filePath, segments[i])
        window.open(appendUri, "_blank")
        await this.delay(400)
      }

      return {
        success: true,
        method: "direct",
        message: `✅ 已分 ${segments.length} 段发送到 Obsidian`
      }
    } catch (error) {
      console.error("❌ 分段导出失败:", error)
      // 分段失败，降级到剪贴板
      return this.exportViaClipboard(markdown, filePath)
    }
  }

  /**
   * 将内容分割成段
   */
  private splitIntoSegments(content: string, maxSize: number): string[] {
    const segments: string[] = []
    let remaining = content

    while (remaining.length > 0) {
      if (remaining.length <= maxSize) {
        segments.push(remaining)
        break
      }

      // 寻找合适的分割点
      let splitPoint = this.findBestSplitPoint(remaining, maxSize)
      segments.push(remaining.slice(0, splitPoint))
      remaining = remaining.slice(splitPoint).trim()
    }

    return segments
  }

  /**
   * 寻找最佳分割点
   */
  private findBestSplitPoint(content: string, maxSize: number): number {
    // 从 maxSize 往前找，优先在段落边界分割
    for (let i = maxSize; i > maxSize * 0.6; i--) {
      if (content[i] === "\n" && content[i - 1] === "\n") {
        return i + 1
      }
    }

    // 其次在行边界
    for (let i = maxSize; i > maxSize * 0.7; i--) {
      if (content[i] === "\n") {
        return i + 1
      }
    }

    // 最后在空格处
    for (let i = maxSize; i > maxSize * 0.8; i--) {
      if (content[i] === " ") {
        return i + 1
      }
    }

    return maxSize
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  public estimateURILength(filePath: string, content: string): number {
    try {
      const vault = encodeURIComponent(this.config.vaultName)
      const file = encodeURIComponent(filePath)
      const cleanContent = this.sanitizeForURI(content)
      const encodedContent = encodeURIComponent(cleanContent)
      const baseLength = "obsidian://new?vault=&file=&content=".length
      return baseLength + vault.length + file.length + encodedContent.length
    } catch (e) {
      console.warn("⚠️ URI 长度预估失败，返回估算值")
      return content.length * 9 + 100
    }
  }

  private buildOpenURI(filePath: string): string {
    const vault = encodeURIComponent(this.config.vaultName)
    const file = encodeURIComponent(filePath)
    return `obsidian://open?vault=${vault}&file=${file}`
  }

  private buildURI(filePath: string, content: string): string {
    const vault = encodeURIComponent(this.config.vaultName)
    const file = encodeURIComponent(filePath)
    const cleanContent = this.sanitizeForURI(content)
    const encodedContent = encodeURIComponent(cleanContent)
    return `obsidian://new?vault=${vault}&file=${file}&content=${encodedContent}`
  }

  private buildAppendURI(filePath: string, content: string): string {
    // 使用 Obsidian Advanced URI 的追加功能（如果安装了该插件）
    // 或者使用 basic 方式追加
    const vault = encodeURIComponent(this.config.vaultName)
    const file = encodeURIComponent(filePath)
    const cleanContent = this.sanitizeForURI(content)
    const encodedContent = encodeURIComponent(cleanContent)
    // 尝试使用 append 模式
    return `obsidian://advanced-uri?vault=${vault}&filepath=${file}&data=${encodedContent}&mode=append`
  }

  private sanitizeForURI(str: string): string {
    return str
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, "")
      .replace(/[\u200B-\u200D\uFEFF]/g, "")
      .replace(/[\uFFFE\uFFFF]/g, "")
  }

  static validateConfig(config: Partial<ObsidianConfig>): boolean {
    return !!(config.vaultName && config.vaultName.trim())
  }
}

export type { ObsidianConfig as Config }
