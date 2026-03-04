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
  category: "编程" | "生活" | "思考" | "项目" | "娱乐" | "教育"
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
    const maxSubtitles = subtitles.slice(0, 8000) // 限制输入长度

    return `请分析以下视频内容，生成结构化的总结信息。

## 视频信息
- 标题: ${videoInfo.title}
- UP主: ${videoInfo.uploader}
- 简介: ${videoInfo.description || "无"}
- 标签: ${videoInfo.tags.join(", ") || "无"}

## 视频字幕（可能不完整）
${maxSubtitles}

请严格以 JSON 格式返回以下信息，不要添加其他文字：
{
  "title": "用一句话概括视频主题，不超过15个字",
  "summary": "用3-5句话总结视频的核心内容",
  "keywords": ["关键词1", "关键词2", "关键词3", "关键词4", "关键词5"],
  "category": "从以下选项中选择一个：编程/生活/思考/项目/娱乐/教育"
}

请只返回 JSON，不要其他内容。`
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
    const maxText = conversationText.slice(0, 10000) // 限制输入长度

    return `请分析以下人机对话记录，生成用于文档管理的元数据（标题、摘要、标签和分类）。

## 聊天记录
${maxText}

请严格以 JSON 格式返回以下信息，不要添加其他文字：
{
  "title": "用一句话概括这段对话的核心主题，尽量简短且具有辨识度，不超过20个字",
  "summary": "用2-3句话总结对话的主要解决问题或者讨论重点，作为文档简介",
  "keywords": ["关键词1", "关键词2", "关键词3"],
  "category": "从以下选项中选择一个最匹配的：编程/生活/思考/项目/娱乐/教育"
}

请只返回 JSON 对象，不要含有 Markdown 代码块。`
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

    if (baseUrl.includes("generativelanguage.googleapis.com")) {
      // Gemini 特殊处理
      url = `${baseUrl}/models/${model}:generateContent?key=${apiKey}`
      body = {
        contents: [
          {
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
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
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1024
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
   * 解析 API 结果
   */
  private static parseResult(text: string): SummarizeResult {
    try {
      // 尝试提取 JSON
      const jsonMatch =
        text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/\{[\s\S]*\}/)

      if (!jsonMatch) {
        throw new Error("无法解析 API 返回")
      }

      const jsonStr = jsonMatch[1] || jsonMatch[0]
      const result = JSON.parse(jsonStr)

      return {
        title: (result.title || "").slice(0, 30),
        summary: (result.summary || "").slice(0, 500),
        keywords: Array.isArray(result.keywords)
          ? result.keywords.slice(0, 5)
          : [],
        category: this.validateCategory(result.category)
      }
    } catch (error) {
      console.error("[AIService] 解析结果失败:", error)
      // 返回降级结果
      return {
        title: "视频总结",
        summary: text.slice(0, 300),
        keywords: [],
        category: "思考"
      }
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
