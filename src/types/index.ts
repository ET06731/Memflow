/**
 * 对话消息类型
 */
export interface Message {
  role: "user" | "assistant"
  content: string
  timestamp?: Date
}

/**
 * 对话数据结构
 */
export interface Conversation {
  id: string
  title?: string
  platform: string
  url: string
  messages: Message[]
  createdAt: Date
}

/**
 * 元数据结构（LLM 生成）
 */
export interface Metadata {
  title: string
  keywords: string[]
  summary: string
  category: "编程" | "生活" | "思考" | "项目" | "娱乐" | "教育"
  topics?: string[]
  platform: string
  url: string
}

/**
 * 导出配置
 */
export interface ExportOptions {
  mode: "direct" | "smart"
  autoDelete: boolean
  format: "markdown"
}

/**
 * Obsidian 配置
 */
export interface ObsidianConfig {
  vaultName: string
  defaultFolder: string
  fileNameFormat: string
  contentFormat: "callout" | "web"
  integrationMethod: "advanced-uri" | "rest-api" | "download"
  restApiUrl?: string
  restApiToken?: string
  saveSubtitles?: boolean
  saveSubtitlesWithTimestamp?: boolean
}

/**
 * AI API 配置
 */
export interface AIApiConfig {
  enabled: boolean
  provider: "openai" | "deepseek" | "kimi" | "gemini" | "custom"
  apiKey: string
  baseUrl?: string
  model: string
  bilibiliPromptTemplate?: "tech" | "study"
}
