/**
 * 移除字符串中的 HTML 标签
 */
export function stripHtml(html: string): string {
    if (!html) return ''

    // 1. 替换常见块级标签为换行，避免文字粘连
    let text = html.replace(/<\/(div|p|h[1-6]|li|tr)>/gi, '\n')

    // 2. 移除所有 HTML 标签
    text = text.replace(/<[^>]+>/g, '')

    // 3. 解码 HTML 实体 (简单版)
    text = text
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")

    // 4. 清理多余空白
    return text
        .replace(/\n\s*\n/g, '\n\n') // 保留段落
        .trim()
}
