import type { AIApiConfig } from "../types"

/**
 * AI API 提供商配置
 */
const PROVIDERS = {
  openai: {
    name: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-3.5-turbo",
    models: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"]
  },
  deepseek: {
    name: "DeepSeek",
    baseUrl: "https://api.deepseek.com/v1",
    defaultModel: "deepseek-chat",
    models: ["deepseek-chat", "deepseek-coder"]
  },
  kimi: {
    name: "Kimi",
    baseUrl: "https://api.moonshot.cn/v1",
    defaultModel: "moonshot-v1-8k",
    models: ["moonshot-v1-8k", "moonshot-v1-32k", "moonshot-v1-128k"]
  },
  gemini: {
    name: "Gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1",
    defaultModel: "gemini-1.5-flash",
    models: ["gemini-1.5-pro", "gemini-1.5-flash", "gemini-1.0-pro"]
  },
  custom: {
    name: "自定义",
    baseUrl: "",
    defaultModel: "",
    models: []
  }
}

export type ProviderType = keyof typeof PROVIDERS

/**
 * AI 总结请求参数
 */
export interface SummarizeOptions {
  subtitles: string
  videoInfo: {
    title: string
    uploader: string
    description: string
    tags: string[]
  }
  config: AIApiConfig
}

/**
 * AI 总结结果
 */
export interface SummarizeResult {
  title: string
  summary: string
  keywords: string[]
  category: "编程" | "生活" | "思考" | "项目" | "娱乐" | "教育" | "技术"
}

/**
 * 聊天对话元数据生成选项
 */
export interface ChatMetadataOptions {
  conversationText: string
  config: AIApiConfig
}

/**
 * AI API 服务
 */
export class AIService {
  /**
   * 获取提供商配置
   */
  static getProviderConfig(provider: ProviderType) {
    return PROVIDERS[provider] || PROVIDERS.openai
  }

  /**
   * 获取所有提供商列表
   */
  static getProviders() {
    return Object.entries(PROVIDERS).map(([key, value]) => ({
      id: key,
      name: value.name,
      models: value.models
    }))
  }

  /**
   * 总结视频内容
   */
  static async summarize(options: SummarizeOptions): Promise<SummarizeResult> {
    const { subtitles, videoInfo, config } = options

    if (!config.enabled || !config.apiKey) {
      throw new Error("请在设置中配置 AI API")
    }

    const provider = PROVIDERS[config.provider] || PROVIDERS.openai
    const baseUrl = config.baseUrl || provider.baseUrl
    const model = config.model || provider.defaultModel

    // 构建 prompt
    const prompt = this.buildPrompt(subtitles, videoInfo)

    console.log("[AIService] 开始调用 API:", config.provider, model)

    try {
      const result = await this.callAPI({
        baseUrl,
        model,
        apiKey: config.apiKey,
        prompt
      })

      return this.parseResult(result)
    } catch (error) {
      console.error("[AIService] API 调用失败:", error)
      throw error
    }
  }

  /**
   * 清理孤立的 Surrogate Unicode 字符，防止 JSON 编码后被严格的解析器拒绝
   */
  private static sanitizeText(str: string, maxLength: number): string {
    if (!str) return ""
    let text = str.length > maxLength ? str.substring(0, maxLength) : str

    if (typeof (text as any).toWellFormed === "function") {
      return (text as any).toWellFormed()
    }

    // 移除截断边缘的高位代理对
    text = text.replace(/[\uD800-\uDBFF]$/, "")
    // 移除未匹配的 Surrogate pairs
    text = text.replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/g, "")
    text = text.replace(/(^|[^\uD800-\uDBFF])[\uDC00-\uDFFF]/g, "$1")
    return text
  }

  /**
   * 构建总结 prompt
   */
  private static buildPrompt(
    subtitles: string,
    videoInfo: {
      title: string
      uploader: string
      description: string
      tags: string[]
    }
  ): string {
    // 使用深度 Unicode 清理避免 API 端 JSON 解析 400 失败报错（unexpected end of hex escape）
    const maxSubtitles = this.sanitizeText(subtitles, 6000)

    return `请分析以下视频内容，生成结构化的深度总结信息。

## 视频信息
- 标题: ${videoInfo.title}
- UP主: ${videoInfo.uploader}
- 简介: ${videoInfo.description || "无"}
- 标签: ${videoInfo.tags.join(", ") || "无"}

## 视频字幕（可能不完整和有错别字）
${maxSubtitles}

请严格以 JSON 格式返回以下信息，不要添加任何其他文字或多余的代码块标记：
{
  "title": "用一句话概括视频主题，不超过15个字",
  "summary": "请提供一份丰富、详实且结构化的深度总结。字数在 300-500 字以下。要求必须使用 Markdown 语法：包含核心观点介绍、高光段落总结、金句摘录、以及清晰的项目符号列表。可以增加类似“【核心要点】”和“【详细记录】”这样的层次结构。",
  "keywords": ["关键词1", "关键词2", "关键词3"],
  "category": "从以下选项中选择一个最匹配的：技术/生活/思考/娱乐/教育"
}

请只返回合法的 JSON 对象。`
  }

  /**
   * 生成聊天对话元数据
   */
  static async generateMetadata(options: ChatMetadataOptions): Promise<SummarizeResult> {
    const { conversationText, config } = options

    if (!config.enabled || !config.apiKey) {
      throw new Error("AI API 未启用或 API Key 未配置")
    }

    const provider = PROVIDERS[config.provider] || PROVIDERS.openai
    const baseUrl = config.baseUrl || provider.baseUrl
    const model = config.model || provider.defaultModel

    // 构建针对聊天的 prompt
    const prompt = this.buildChatPrompt(conversationText)

    console.log("[AIService - Chat] 开始调用 API:", config.provider, model)

    try {
      const result = await this.callAPI({
        baseUrl,
        model,
        apiKey: config.apiKey,
        prompt
      })

      return this.parseResult(result)
    } catch (error) {
      console.error("[AIService - Chat] API 调用失败:", error)
      throw error
    }
  }

  /**
   * 构建针对聊天记录的总结 prompt
   */
  private static buildChatPrompt(conversationText: string): string {
    // 使用深度 Unicode 清理避免复杂的网页带有非法代理字符
    const maxText = this.sanitizeText(conversationText, 8000)

    return `请分析以下人机对话记录，生成用于文档管理的深度元数据信息。

## 聊天记录
${maxText}

请严格以 JSON 格式返回以下信息，不要添加任何其他文字或多余的代码块标记：
{
  "title": "用一句话概括这段对话的核心主题，尽量简短且具有辨识度，不超过20个字",
  "summary": "请提供一份丰富、结构化的上下文导读与深度摘要。要求字数在 300-500 字以上。应当提炼出用户的核心诉求、AI给出的关键解决方案，并使用 Markdown 语法排版（如小标题、强调加粗或无序列表）使得呈现效果清晰专业。",
  "keywords": ["关键词1", "关键词2", "关键词3"],
  "category": "从以下选项中选择一个最匹配的：技术/生活/思考/项目/娱乐/教育"
}

请只返回合法的 JSON 对象。`
  }

  /**
   * 调用 API
   */
  private static async callAPI(params: {
    baseUrl: string
    model: string
    apiKey: string
    prompt: string
  }): Promise<string> {
    const { baseUrl, model, apiKey, prompt } = params

    // 根据不同提供商构建请求
    let url: string
    let body: any

    // 作为终极防御：如果代码文件中或者前面的任何变量拼接时带有“半个乱码”等损坏的字符，
    // 这里使用 toWellFormed() 将其全部修复为 U+FFFD 替换符，确保 JSON.stringify() 时绝对不会生成孤立的 \\ud83d 致使服务端 400 崩溃。
    const safePrompt = typeof prompt === "string" && typeof (prompt as any).toWellFormed === "function"
      ? (prompt as any).toWellFormed()
      : prompt

    if (baseUrl.includes("generativelanguage.googleapis.com")) {
      // Gemini 特殊处理
      url = `${baseUrl}/models/${model}:generateContent?key=${apiKey}`
      body = {
        contents: [
          {
            parts: [{ text: safePrompt }]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 4096,
          topP: 0.95,
          topK: 40
        }
      }
    } else {
      // OpenAI 兼容 API
      url = `${baseUrl}/chat/completions`
      body = {
        model,
        messages: [
          {
            role: "user",
            content: safePrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 4096
      }
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(baseUrl.includes("generativelanguage.googleapis.com")
          ? {}
          : { Authorization: `Bearer ${apiKey}` })
      },
      body: JSON.stringify(body)
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`API 请求失败: ${response.status} - ${errorText}`)
    }

    const data = await response.json()

    // 解析不同格式的响应
    if (baseUrl.includes("generativelanguage.googleapis.com")) {
      return data.candidates?.[0]?.content?.parts?.[0]?.text || ""
    }

    return data.choices?.[0]?.message?.content || ""
  }

  /**
   * 极端容错解析：对于大模型在长文中途遭遇 Token 截断导致的半片残缺 JSON 进行正则抢救提取
   */
  private static fallbackParse(text: string): SummarizeResult {
    const extract = (key: string): string => {
      // 匹配 "key": "value" 甚至在末尾没有闭合引号的情况
      const regex = new RegExp(`"${key}"\\s*:\\s*"((?:[^"\\\\]|\\\\[\\s\\S])*?)(?:"\\s*[,}]|$)`, "i")
      const match = text.match(regex)
      if (match) {
        return match[1].replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\\\/g, "\\")
      }
      return ""
    }

    const title = extract("title") || "视频总结(不完整)"
    const summary = extract("summary") || "提取片段失败，原始大模型返回：\n" + text.slice(0, 500)

    return {
      title: title.slice(0, 50),
      summary,
      keywords: [],
      category: "思考"
    }
  }

  /**
   * 解析 API 结果
   */
  private static parseResult(text: string): SummarizeResult {
    try {
      let jsonStr = text.trim()
      // 清除可能包裹的 Markdown JSON 语法格式
      jsonStr = jsonStr.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim()

      // 提取核心的大括号部分（为了防止被模型额外加的其他前言后语污染）
      const braceMatch = jsonStr.match(/\{[\s\S]*\}/)
      if (braceMatch) {
        jsonStr = braceMatch[0]
      }

      const result = JSON.parse(jsonStr)

      return {
        title: (result.title || "").slice(0, 50),
        summary: result.summary || "",
        keywords: Array.isArray(result.keywords)
          ? result.keywords.slice(0, 5)
          : [],
        category: this.validateCategory(result.category)
      }
    } catch (error) {
      console.warn("[AIService] 严格 JSON 解析失败，大模型回复可能被截断。尝试启用容错正则提取:", error)
      return this.fallbackParse(text)
    }
  }

  /**
   * 验证分类
   */
  private static validateCategory(cat: string): SummarizeResult["category"] {
    const validCategories = ["编程", "生活", "思考", "项目", "娱乐", "教育"]
    const category = validCategories.includes(cat) ? cat : "思考"
    return category as SummarizeResult["category"]
  }
}
