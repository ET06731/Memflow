/**
 * 简单的 TF-IDF 关键词提取
 */

// 中英文停用词 (扩展版)
const STOP_WORDS = new Set([
  // 中文
  "的",
  "了",
  "是",
  "在",
  "我",
  "有",
  "和",
  "就",
  "不",
  "人",
  "都",
  "一",
  "个",
  "上",
  "也",
  "很",
  "到",
  "说",
  "要",
  "去",
  "你",
  "会",
  "着",
  "没有",
  "看",
  "好",
  "好的",
  "自己",
  "这",
  "那",
  "有",
  "与",
  "及",
  "等",
  "或",
  "但是",
  "因为",
  "所以",
  "如果",
  "虽然",
  "关于",
  "对于",
  "之",
  "为",
  "以",
  "将",
  "本",
  "该",
  "由",
  "向",
  "而",
  "被",
  "让",
  "给",
  "但",
  "并",
  "更",
  "已",
  "我们要",
  "你们",
  "它们",
  "什么",
  "怎么",
  "如何",
  "为什么",
  // 英文
  "the",
  "a",
  "an",
  "and",
  "or",
  "but",
  "in",
  "on",
  "at",
  "to",
  "for",
  "of",
  "with",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "being",
  "have",
  "has",
  "had",
  "do",
  "does",
  "did",
  "will",
  "would",
  "could",
  "should",
  "can",
  "may",
  "might",
  "this",
  "that",
  "these",
  "those",
  "i",
  "you",
  "he",
  "she",
  "it",
  "we",
  "they",
  "them",
  "their",
  "my",
  "your",
  "his",
  "her",
  "its",
  "our",
  "us",
  "him",
  "if",
  "then",
  "else",
  "when",
  "where",
  "why",
  "how",
  "all",
  "any",
  "both",
  "each",
  "few",
  "more",
  "most",
  "other",
  "some",
  "such",
  "no",
  "nor",
  "not",
  "only",
  "own",
  "same",
  "so",
  "than",
  "too",
  "very",
  "can",
  "just",
  "should",
  "now"
])

/**
 * 提取关键词（TF-IDF 简化版）
 */
export function extractKeywords(text: string, topN = 5): string[] {
  // 分词（改进版：支持中英文混合）
  // 移除标点符号和特殊字符，只保留文字
  const cleanText = text.replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s]/g, " ")

  // 分词策略：
  // 1. 英文单词 (3个字母以上)
  // 2. 中文词语 (2个汉字以上)
  const words =
    cleanText.toLowerCase().match(/[\u4e00-\u9fa5]{2,}|[a-z]{3,}/gi) || []

  // 词频统计
  const wordCount = new Map<string, number>()
  words.forEach((word) => {
    if (!STOP_WORDS.has(word) && word.length > 1) {
      wordCount.set(word, (wordCount.get(word) || 0) + 1)
    }
  })

  // 排序并返回 Top N
  return Array.from(wordCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([word]) => word)
}

/**
 * 生成标题（基于内容关键词的智能标题）
 */
export function generateTitle(text: string, maxLength = 50): string {
  // 1. 预处理：清理HTML和多余空格
  let cleanText = text
    .replace(/<[^>]+>/g, " ") // 移除HTML
    .replace(/\s+/g, " ") // 合并空格
    .trim()

  // 2. 去除常见的前缀干扰词 (AI/User 标记)
  const prefixesToRemove = [
    /^你说[：:]\s*/i,
    /^you said[：:]\s*/i,
    /^chatgpt[：:]\s*/i,
    /^ai[：:]\s*/i,
    /^user[：:]\s*/i,
    /^assistant[：:]\s*/i,
    /^bot[：:]\s*/i,
    /^question[：:]\s*/i,
    /^answer[：:]\s*/i,
    /^问题[：:]\s*/i,
    /^回答[：:]\s*/i
  ]

  prefixesToRemove.forEach((regex) => {
    cleanText = cleanText.replace(regex, "")
  })

  // 3. 提取核心内容
  // 先尝试按换行分割，取第一行
  const firstLine = cleanText.split("\n")[0]?.trim() || ""

  // 提取第一句话（按句号/问号/感叹号分割）
  let title = firstLine.match(/^[^.!?。！？\n]+/)?.[0]?.trim() || firstLine

  // 4. 后处理：去除首尾标点符号
  // 去除句尾标点
  title = title.replace(/[.!?。！？;；]+$/, "")
  // 去除首尾引号/括号
  title = title.replace(/^["'“‘『【(（]+|["'”’』】)）]+$/g, "")
  // 去除文件名非法字符 (Windows/Unix)
  title = title.replace(/[<>:"/\\|?*]/g, " ")

  title = title.trim()

  // 5. 智能兜底策略

  // 如果标题太短（如"你好"），尝试从前200个字符中提取关键词组合标题
  if (title.length < 5) {
    const keywords = extractKeywords(cleanText.slice(0, 500), 3)
    if (keywords.length > 0) {
      return keywords.join(" ") + " 对话"
    }
  }

  // 如果标题太长，截断
  if (title.length > maxLength) {
    return title.slice(0, maxLength).trim() + "..."
  }

  return title || "对话记录"
}

/**
 * 生成智能摘要（基于 TextRank 思想的句子评分）
 * 算法逻辑参考 MrRSS：
 * 1. 分词并计算词频 (TF)
 * 2. 给每个句子评分 = sum(词频) / 句子长度
 * 3. 考虑位置权重 (首尾句更重要)
 */
export function generateSummary(text: string, maxSentences = 3): string {
  // 先清理HTML标签
  const cleanText = text
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()

  // 按句子分割（增强版正则，处理更多标点）
  const sentences = cleanText
    .replace(/([.!?。！？\n])/g, "$1|")
    .split("|")
    .map((s) => s.trim())
    .filter((s) => s.length > 10 && s.length < 300) // 过滤过短或过长的句子

  if (sentences.length === 0) {
    return cleanText.slice(0, 150) + (cleanText.length > 150 ? "..." : "")
  }

  if (sentences.length <= maxSentences) {
    return sentences.join(" ")
  }

  // 1. 计算词频 (Term Frequency)
  const wordFreq = new Map<string, number>()
  sentences.forEach((sent) => {
    const words = extractKeywords(sent, 100) // 提取所有关键词
    words.forEach((word) => {
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1)
    })
  })

  // 2. 给句子打分
  const scoredSentences = sentences.map((sent, index) => {
    const words = extractKeywords(sent, 100)
    let score = 0

    if (words.length === 0) return { sentence: sent, score: 0, index }

    words.forEach((word) => {
      score += wordFreq.get(word) || 0
    })

    // 归一化分数：除以句子长度（避免偏向长句）
    // 但稍微保留一点长度优势（使用 log 或 sqrt）
    const lengthPenalty = Math.max(1, Math.log(words.length + 1))
    let finalScore = score / lengthPenalty

    // 3. 位置加权：
    // 开头(Introduction)和结尾(Conclusion)通常更重要
    if (index === 0) finalScore *= 2.0
    else if (index === sentences.length - 1) finalScore *= 1.5
    else if (index < 3) finalScore *= 1.3

    return {
      sentence: sent,
      score: finalScore,
      index
    }
  })

  // 4. 排序并提取
  // 过滤掉得分极低的句子
  const validSentences = scoredSentences.filter((s) => s.score > 0)

  const topSentences = validSentences
    .sort((a, b) => b.score - a.score)
    .slice(0, maxSentences)
    .sort((a, b) => a.index - b.index) // 恢复原始顺序，保持逻辑通顺

  // 如果没有有效句子（比如全是废话），回退到前几句
  if (topSentences.length === 0) {
    return sentences.slice(0, maxSentences).join(" ")
  }

  return topSentences.map((s) => s.sentence).join(" ")
}

/**
 * 智能分类（基于关键词）
 */
export function categorizeConversation(
  text: string
): "编程" | "生活" | "思考" | "项目" {
  const lowerText = text.toLowerCase()

  // 关键词匹配
  const programmingKeywords = [
    "code",
    "代码",
    "function",
    "函数",
    "bug",
    "api",
    "database",
    "数据库",
    "typescript",
    "python",
    "javascript",
    "编程",
    "开发"
  ]
  const projectKeywords = [
    "project",
    "项目",
    "plan",
    "计划",
    "deadline",
    "截止",
    "team",
    "团队",
    "task",
    "任务"
  ]
  const lifeKeywords = [
    "life",
    "生活",
    "food",
    "美食",
    "travel",
    "旅行",
    "health",
    "健康",
    "hobby",
    "爱好"
  ]

  let programmingScore = 0
  let projectScore = 0
  let lifeScore = 0

  programmingKeywords.forEach((kw) => {
    if (lowerText.includes(kw)) programmingScore++
  })

  projectKeywords.forEach((kw) => {
    if (lowerText.includes(kw)) projectScore++
  })

  lifeKeywords.forEach((kw) => {
    if (lowerText.includes(kw)) lifeScore++
  })

  // 返回得分最高的分类
  const scores = [
    { category: "编程" as const, score: programmingScore },
    { category: "项目" as const, score: projectScore },
    { category: "生活" as const, score: lifeScore }
  ]

  const best = scores.sort((a, b) => b.score - a.score)[0]

  // 如果所有得分都是0，返回"思考"
  return best.score > 0 ? best.category : "思考"
}
