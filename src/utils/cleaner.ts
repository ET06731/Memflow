/**
 * 移除字符串中的 HTML 标签
 */
export function stripHtml(html: string): string {
  if (!html) return ""

  // 1. 将块级标签的开始和结束都替换为换行，避免文字粘连
  let text = html
    .replace(
      /<(div|p|h[1-6]|li|tr|section|article|main|header|footer)\b[^>]*>/gi,
      "\n"
    )
    .replace(
      /<\/(div|p|h[1-6]|li|tr|section|article|main|header|footer)>/gi,
      "\n"
    )
    .replace(/<(br|hr)\b[^>]*\/?>/gi, "\n")

  // 2. 移除所有 HTML 标签
  text = text.replace(/<[^>]+>/g, " ")

  // 3. 解码 HTML 实体 (简单版)
  text = text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")

  // 4. 清理多余空白，确保段落间有换行
  return text
    .replace(/\n\s*\n+/g, "\n\n") // 多个换行合并为两个
    .replace(/[ \t]+/g, " ") // 合并多个空格
    .trim()
}
