import type { Conversation, Metadata } from '../types'

// 配置接口定义移到单独的类型文件
export interface ObsidianConfig {
    vaultName: string
    defaultFolder: string
    fileNameFormat: string
    contentFormat: 'callout' | 'web'
    exportMethod: 'uri' | 'download'
}

/**
 * Obsidian URI 处理器
 */
export class ObsidianURIHandler {
    private config: ObsidianConfig

    constructor(config: ObsidianConfig) {
        this.config = config
    }

    /**
     * 生成文件名（基于模板）
     */
    generateFilename(metadata: Metadata): string {
        const date = new Date().toISOString().split('T')[0]
        const title = this.sanitizeFilename(metadata.title || '未命名对话')
        const platform = metadata.platform || 'AI'

        return this.config.fileNameFormat
            .replace('{{date}}', date)
            .replace('{{title}}', title.slice(0, 30))
            .replace('{{platform}}', platform)
            + '.md'
    }

    /**
     * 清理文件名中的非法字符
     */
    private sanitizeFilename(filename: string): string {
        return filename
            .replace(/[<>:"/\\|?*]/g, '-')  // 替换非法字符
            .replace(/\s+/g, '-')            // 空格转短横线
            .replace(/-+/g, '-')             // 多个短横线合并
            .trim()
    }

    /**
     * 导出到 Obsidian
     */
    async exportToObsidian(markdown: string, metadata: Metadata): Promise<boolean> {
        try {
            const filename = this.generateFilename(metadata)
            const filePath = this.config.defaultFolder
                ? `${this.config.defaultFolder}/${filename}`
                : filename

            let uri = this.buildURI(filePath, markdown)

            // 检查 URI 长度限制 (浏览器通常限制 2000-3000 字符)
            if (uri.length > 2500) {
                console.warn('⚠️ 内容过长，降级为剪贴板模式')
                // 仅打开带标题的空笔记
                uri = this.buildURI(filePath, '')

                // 复制内容到剪贴板
                await navigator.clipboard.writeText(markdown)

                // 打开 URI
                window.open(uri, '_blank')

                // 返回 true 但带有特殊标记可能更好，这里先返回 true 让外层提示成功
                // 实际应该提示用户"内容已复制，请粘贴"
                return true
            }

            console.log('📝 Obsidian URI:', uri.substring(0, 100) + '...')

            // 打开 URI
            window.open(uri, '_blank')

            return true
        } catch (error) {
            console.error('❌ Obsidian URI导出失败:', error)

            // 如果是因为长度原因导致的失败（再次兜底）
            if (markdown.length > 1000) {
                try {
                    const filename = this.generateFilename(metadata)
                    const filePath = this.config.defaultFolder
                        ? `${this.config.defaultFolder}/${filename}`
                        : filename

                    const uri = this.buildURI(filePath, '')
                    await navigator.clipboard.writeText(markdown)
                    window.open(uri, '_blank')
                    return true
                } catch (e) {
                    return false
                }
            }

            return false
        }
    }

    /**
     * 构建 Obsidian URI
     */
    private buildURI(filePath: string, content: string): string {
        // 手动构建查询字符串，使用 standard encoding
        // Obsidian 需要 %20 而不是 +
        const vault = encodeURIComponent(this.config.vaultName)
        const file = encodeURIComponent(filePath)
        const encodedContent = encodeURIComponent(content)

        return `obsidian://new?vault=${vault}&file=${file}&content=${encodedContent}`
    }

    /**
     * 验证配置是否完整
     */
    static validateConfig(config: Partial<ObsidianConfig>): boolean {
        return !!(config.vaultName && config.vaultName.trim())
    }
}

// 导出配置类型供其他模块使用
export type { ObsidianConfig as Config }
