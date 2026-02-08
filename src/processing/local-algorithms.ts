/**
 * 简单的 TF-IDF 关键词提取
 */

// 中英文停用词
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
  "自己",
  "这",
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
  "their"
])

/**
 * 提取关键词（TF-IDF 简化版）
 */
export function extractKeywords(text: string, topN = 5): string[] {
  // 分词（简化版：中文按字符，英文按单词）
  const words =
    text.toLowerCase().match(/[\u4e00-\u9fa5]{2,}|[a-z]{3,}/gi) || []

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
 * 生成标题（提取第一行/第一句话，先清理HTML）
 */
export function generateTitle(text: string, maxLength = 50): string {
  // 先清理HTML标签
  const cleanText = text
    .replace(/<[^>]+>/g, " ") // 移除所有HTML标签
    .replace(/\s+/g, " ") // 合并多余空格
    .trim()

  // 先尝试按换行分割，取第一行
  const lines = cleanText
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
  let title = lines[0] || ""

  // 如果第一行太长，尝试提取第一句话（按标点符号）
  if (title.length > maxLength) {
    const firstSentence = title.match(/^[^.!?。！？]+/)?.[0] || title
    title = firstSentence.trim()
  }

  // 限制长度
  if (title.length > maxLength) {
    title = title.slice(0, maxLength) + "..."
  }

  return title || "对话记录"
}

/**
 * 生成智能摘要（基于句子重要性评分）
 */
export function generateSummary(text: string, maxSentences = 3): string {
  // 先清理HTML标签
  const cleanText = text
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()

  // 按句子分割（支持中英文）
  const sentences = cleanText
    .replace(/([.!?。！？])/g, "$1|")
    .split("|")
    .map((s) => s.trim())
    .filter((s) => s.length > 10 && s.length < 200) // 过滤太短或太长的句子

  if (sentences.length === 0) {
    return cleanText.slice(0, 150) + (cleanText.length > 150 ? "..." : "")
  }

  if (sentences.length <= maxSentences) {
    return sentences.join(" ")
  }

  // 计算每句话的重要性分数
  const wordFreq = new Map<string, number>()

  // 统计词频
  sentences.forEach((sent) => {
    const words =
      sent.toLowerCase().match(/[\u4e00-\u9fa5]{2,}|[a-z]{3,}/gi) || []
    words.forEach((word) => {
      if (!STOP_WORDS.has(word)) {
        wordFreq.set(word, (wordFreq.get(word) || 0) + 1)
      }
    })
  })

  // 给句子打分
  const scoredSentences = sentences.map((sent, index) => {
    const words =
      sent.toLowerCase().match(/[\u4e00-\u9fa5]{2,}|[a-z]{3,}/gi) || []
    let score = 0
    let wordCount = 0

    words.forEach((word) => {
      if (!STOP_WORDS.has(word)) {
        score += wordFreq.get(word) || 0
        wordCount++
      }
    })

    // 归一化分数
    const normalizedScore = wordCount > 0 ? score / wordCount : 0

    // 位置加权：开头的句子通常更重要
    const positionWeight = index === 0 ? 1.5 : index < 3 ? 1.2 : 1.0

    return {
      sentence: sent,
      score: normalizedScore * positionWeight,
      index
    }
  })

  // 按分数排序并选择前 N 句
  const topSentences = scoredSentences
    .sort((a, b) => b.score - a.score)
    .slice(0, maxSentences)
    .sort((a, b) => a.index - b.index) // 按原始顺序排列

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
