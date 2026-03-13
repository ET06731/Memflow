/**
 * 字幕 Token 压缩器
 * 解决 B 站视频字幕上下文爆炸问题
 */

/**
 * 压缩选项
 */
export interface CompressOptions {
  /** 是否保留时间戳 */
  keepTimestamps: boolean
  /** 时间戳格式: 'full' | 'short' | 'seconds' | 'none' */
  timestampFormat: "full" | "short" | "seconds" | "none"
  /** 是否移除语气词 */
  removeFillers: boolean
  /** 最大字符数 (0 = 不限制) */
  maxLength: number
  /** 目标 tokens (会根据估算自动调整 maxLength) */
  targetTokens: number
}

/**
 * 默认压缩选项
 */
export const DEFAULT_COMPRESS_OPTIONS: CompressOptions = {
  keepTimestamps: true,
  timestampFormat: "short", // [12:34] 格式
  removeFillers: true,
  maxLength: 0, // 不限制
  targetTokens: 4000, // 目标 4K tokens
}

/**
 * 语气词列表 (按出现频率排序)
 */
const FILLER_WORDS = [
  "嗯嗯", "嗯哪", "啊嗯", "啊呐", "这个", "那个", "就是", "然后", "那么",
  "的话", "什么", "怎么", "那个啥", "这个啥", "呃", "额", "啊", "嗯", "哦",
  "哈", "嘿", "呀", "哇", "嘞", "呐", "哟", "咯", "呗", "啦", "哩", "咧",
  "的对", "是的", "没错", "好吧", "那啥", "其实", "基本上", "大概", "可能",
  "应该", "我觉得", "你看", "是不是", "对不对", "有没有", "能不能", "要不",
  "不如", "要不然", "那好吧", "随便", "都行", "随便吧", "那行", "成",
]

/**
 * 估算字符对应的 tokens 数量 (中文约 1.5 chars/token, 英文约 4 chars/token)
 * 混合内容平均估算: 2 chars/token
 */
const CHARS_PER_TOKEN = 2

/**
 * 压缩字幕文本
 */
export function compressSubtitles(
  subtitles: string,
  options: Partial<CompressOptions> = {}
): string {
  const opts = { ...DEFAULT_COMPRESS_OPTIONS, ...options }

  let result = subtitles

  // 1. 移除语气词
  if (opts.removeFillers) {
    result = removeFillers(result)
  }

  // 2. 压缩时间戳格式
  if (opts.keepTimestamps) {
    result = compressTimestamps(result, opts.timestampFormat)
  } else {
    result = removeTimestamps(result)
  }

  // 3. 清理多余空白
  result = cleanWhitespace(result)

  // 4. 按目标 Token 截断 (保持句子完整)
  if (opts.targetTokens > 0) {
    const maxChars = opts.targetTokens * CHARS_PER_TOKEN
    if (result.length > maxChars) {
      result = truncateAtSentenceBoundary(result, maxChars)
    }
  } else if (opts.maxLength > 0) {
    if (result.length > opts.maxLength) {
      result = truncateAtSentenceBoundary(result, opts.maxLength)
    }
  }

  return result
}

/**
 * 移除语气词
 */
function removeFillers(text: string): string {
  let result = text

  // 按长度降序排序，避免短词先匹配导致长词无法匹配
  const sortedFillers = [...FILLER_WORDS].sort((a, b) => b.length - a.length)

  for (const filler of sortedFillers) {
    // 使用正则匹配，确保是完整词
    const regex = new RegExp(filler.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi")
    result = result.replace(regex, "")
  }

  // 清理重复的标点和空白
  result = result.replace(/[,\.，\。]+/g, ",").replace(/,{2,}/g, ",")

  return result
}

/**
 * 压缩时间戳格式
 * 支持:
 * - full: 00:12:34.500 → [00:12:34]
 * - short: 00:12:34.500 → [12:34]
 * - seconds: 00:12:34.500 → 754s
 * - none: 00:12:34.500 → (移除)
 */
function compressTimestamps(
  text: string,
  format: "full" | "short" | "seconds" | "none"
): string {
  switch (format) {
    case "full":
      // 00:12:34.500 → [00:12:34]
      return text.replace(
        /(\d{2}):(\d{2}):(\d{2})\.(\d{3})/g,
        (_, h, m, s) => `[${h}:${m}:${s}]`
      )

    case "short":
      // 00:12:34.500 → [12:34]
      return text.replace(
        /\d{2}:(\d{2}):(\d{2})\.\d{3}/g,
        (_, m, s) => `[${m}:${s}]`
      )

    case "seconds":
      // 00:12:34.500 → 754s
      return text.replace(
        /(\d{2}):(\d{2}):(\d{2})\.\d{3}/g,
        (_, h, m, s) => `${parseInt(h) * 3600 + parseInt(m) * 60 + parseInt(s)}s`
      )

    case "none":
      return removeTimestamps(text)

    default:
      return text
  }
}

/**
 * 移除所有时间戳
 */
function removeTimestamps(text: string): string {
  // 移除各种格式的时间戳
  return text
    .replace(/\[\d{2}:\d{2}:\d{2}\]/g, "")
    .replace(/\[\d{2}:\d{2}\]/g, "")
    .replace(/\d+s/g, "")
    .replace(/\d{2}:\d{2}:\d{2}\.\d{3}/g, "")
}

/**
 * 清理多余空白
 */
function cleanWhitespace(text: string): string {
  return text
    .replace(/\n{3,}/g, "\n\n") // 最多2个换行
    .replace(/[ \t]{2,}/g, " ") // 最多1个空格
    .replace(/\n /g, "\n") // 换行后的空格
    .replace(/ \n/g, "\n") // 空格后的换行
    .trim()
}

/**
 * 在句子边界处截断文本
 */
function truncateAtSentenceBoundary(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text

  // 找到最后一个完整句子
  const sentenceEnders = /[。！？\.!\?][\s\n]/
  const lastSentenceEnd = text.slice(0, maxLength).search(/[。！？\.!\?][\s\n]|$/)

  if (lastSentenceEnd > maxLength * 0.7) {
    // 如果最后一个句子在 70% 位置之后，就在这里截断
    return text.slice(0, lastSentenceEnd + 1).trim()
  }

  // 否则找最后一个逗号
  const lastComma = text.slice(0, maxLength).lastIndexOf(",")
  if (lastComma > maxLength * 0.7) {
    return text.slice(0, lastComma + 1).trim()
  }

  // 硬截断
  return text.slice(0, maxLength).trim() + "..."
}

/**
 * 估算 Tokens 数量
 */
export function estimateTokens(text: string): number {
  // 中文字符
  const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length
  // 英文字母
  const englishChars = (text.match(/[a-zA-Z]/g) || []).length
  // 数字
  const numbers = (text.match(/[0-9]/g) || []).length
  // 其他字符
  const otherChars = text.length - chineseChars - englishChars - numbers

  // 中文约 1 char/token, 英文约 4 chars/token
  return Math.ceil(chineseChars / 1.5 + englishChars / 4 + numbers / 3 + otherChars / 2)
}

/**
 * 根据目标 Tokens 自动调整压缩
 */
export function compressToTargetTokens(
  subtitles: string,
  targetTokens: number
): string {
  // 先估算当前 tokens
  const currentTokens = estimateTokens(subtitles)

  if (currentTokens <= targetTokens) {
    return subtitles // 不需要压缩
  }

  // 计算需要压缩到的字符数
  const targetChars = Math.floor(targetTokens * CHARS_PER_TOKEN)

  // 逐级尝试压缩
  let result = subtitles
  const strategies = [
    () => compressTimestamps(result, "short"),
    () => compressTimestamps(result, "seconds"),
    () => { result = removeFillers(result); return result; },
    () => compressTimestamps(result, "none"),
  ]

  for (const strategy of strategies) {
    result = strategy()
    if (estimateTokens(result) <= targetTokens) {
      break
    }
  }

  // 最后确保在目标内
  if (estimateTokens(result) > targetTokens) {
    result = truncateAtSentenceBoundary(result, targetChars)
  }

  return result
}
