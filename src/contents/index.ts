import type { PlasmoCSConfig } from "plasmo"

import { ObsidianURIHandler } from "../obsidian/uri-handler"
import { createMarkdownBuilder, createMetadataGenerator } from "../processing"
import { AIService } from "../services/ai-api"
import { MemflowHelperService } from "../services/memflow-helper"
import type { AIApiConfig, Conversation, MemflowHelperConfig } from "../types"
import {
  BiliBiliAdapter,
  detectPlatformAdapter,
  detectSmartClipAdapter,
  DoubaoAdapter,
  SmartClipAdapter,
  YouTubeAdapter
} from "./adapters"

/**
 * 构建 B 站视频的 Markdown 内容
 */
export function buildBilibiliMarkdown(
  videoInfo: {
    title: string
    uploader: string
    uploaderUrl: string
    description: string
    tags: string[]
    views: string
    likes: string
    coins: string
    favorites: string
    publishDate: string
    bvid?: string
  },
  subtitles: string
): string {
  const date = new Date().toISOString().split("T")[0]
  const tags = ["B站视频", ...videoInfo.tags].filter((t) => t).join(", ")

  // 构建 YAML frontmatter
  const yaml = `---
created: ${date}
source: [[B站视频]]
original_url: "${window.location.href}"
tags: [${tags}]
category: 娱乐
status: 待整理
---`

  let content = ""

  // 标题
  content += `# ${videoInfo.title}\n\n`

  const videoEmbed = buildBilibiliEmbed(window.location.href, videoInfo.title)
  if (videoEmbed) {
    content += `${videoEmbed}\n\n`
  }

  // 视频信息
  content += `## 视频信息\n\n`
  content += `- **UP主**: [${videoInfo.uploader}](${videoInfo.uploaderUrl})\n`
  content += `- **发布时间**: ${videoInfo.publishDate}\n`
  content += `- **播放量**: ${videoInfo.views}\n`
  content += `- **点赞**: ${videoInfo.likes}\n`
  content += `- **投币**: ${videoInfo.coins}\n`
  content += `- **收藏**: ${videoInfo.favorites}\n`
  content += `- **标签**: ${videoInfo.tags.join(", ")}\n\n`

  // 简介
  content += `---\n\n`
  content += `## 视频简介\n\n`
  content += `${videoInfo.description || "无简介"}\n\n`

  // 字幕
  if (subtitles) {
    content += `---\n\n`
    content += `## 字幕内容\n\n`
    content += subtitles + "\n"
  }

  // 底部信息
  content += `---\n\n`
  content += `## 相关信息\n\n`
  content += `- **视频地址**: ${window.location.href}\n`
  content += `- **导出时间**: ${new Date().toLocaleString("zh-CN")}\n`

  return yaml + "\n\n" + content
}

async function tryMemflowHelperSubtitleFallback(
  videoUrl: string,
  platformLabel: string
): Promise<string> {
  try {
    const { memflowHelperConfig } =
      await chrome.storage.sync.get("memflowHelperConfig")
    const helperConfig = memflowHelperConfig as MemflowHelperConfig | undefined
    if (!helperConfig?.enabled || !helperConfig.baseUrl) {
      return ""
    }

    showToast(`未检测到原生字幕，尝试 ${platformLabel} 本地转写...`, "warning")
    const transcript = await MemflowHelperService.transcribeVideoUrl(
      videoUrl,
      helperConfig,
      "auto"
    )
    return transcript?.trim() || ""
  } catch (error) {
    console.error(`[Memflow ${platformLabel}] MemflowHelper 转写失败:`, error)
    return ""
  }
}

/**
 * 构建 B 站可嵌入播放器
 */
function buildBilibiliEmbed(videoUrl: string, title: string): string {
  let bvid = ""
  let page = "1"

  try {
    const url = new URL(videoUrl)
    const bvMatch = url.pathname.match(/\/video\/(BV[\w]+)/)
    bvid = bvMatch?.[1] || url.searchParams.get("bvid") || ""
    page = url.searchParams.get("p") || "1"
  } catch (_error) {
    bvid = ""
  }

  if (!bvid) return ""

  const safeTitle = title.replace(/"/g, "&quot;")

  return `<iframe
  width="720"
  height="405"
  src="https://player.bilibili.com/player.html?bvid=${bvid}&page=${page}"
  title="${safeTitle}"
  frameborder="0"
  allow="fullscreen; autoplay"
  allowfullscreen>
</iframe>`
}

/**
 * 构建 B 站列表页（稍后看等）的 Markdown 内容
 */
function buildBilibiliListMarkdown(conversation: Conversation): string {
  const date = new Date().toISOString().split("T")[0]

  const yaml = `---
created: ${date}
source: [[B站视频]]
original_url: "${window.location.href}"
tags: [B站视频, 稍后看, 视频列表]
category: 娱乐
status: 待整理
---`

  let content = ""

  // 标题
  content += `# ${conversation.title}\n\n`
  content += `> 由 Memflow 导出\n\n`

  // 视频列表内容（从 messages 中提取）
  if (conversation.messages.length > 0) {
    content += conversation.messages[0].content + "\n"
  }

  // 底部信息
  content += `---\n\n`
  content += `## 相关信息\n\n`
  content += `- **列表地址**: ${window.location.href}\n`
  content += `- **导出时间**: ${new Date().toLocaleString("zh-CN")}\n`

  return yaml + "\n\n" + content
}

/**
 * 构建 YouTube 可嵌入播放器
 */
function buildYouTubeEmbed(videoUrl: string, title: string): string {
  let videoId = ""

  try {
    const url = new URL(videoUrl)
    if (url.hostname.includes("youtu.be")) {
      videoId = url.pathname.split("/").filter(Boolean)[0] || ""
    } else if (url.pathname.startsWith("/shorts/")) {
      videoId = url.pathname.split("/shorts/")[1]?.split("?")[0] || ""
    } else {
      videoId = url.searchParams.get("v") || ""
    }
  } catch (_error) {
    videoId = ""
  }

  if (!videoId) return ""

  const safeTitle = title.replace(/"/g, "&quot;")

  return `<iframe
  width="720"
  height="405"
  src="https://www.youtube.com/embed/${videoId}"
  title="${safeTitle}"
  frameborder="0"
  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
  allowfullscreen>
</iframe>`
}

/**
 * 构建 YouTube 视频的 Markdown 内容
 */
export function buildYouTubeMarkdown(
  videoInfo: {
    title: string
    channelName: string
    channelUrl: string
    description: string
    viewCount: string
    likeCount: string
    publishDate: string
    thumbnail: string
    duration: string
  },
  subtitles: string
): string {
  const date = new Date().toISOString().split("T")[0]
  const tags = ["YouTube视频"].join(", ")

  const yaml = `---
created: ${date}
source: [[YouTube视频]]
original_url: "${window.location.href}"
tags: [${tags}]
category: 娱乐
status: 待整理
---`

  let content = ""

  content += `# ${videoInfo.title}\n\n`

  const videoEmbed = buildYouTubeEmbed(window.location.href, videoInfo.title)
  if (videoEmbed) {
    content += `${videoEmbed}\n\n`
  }

  content += `## 视频信息\n\n`
  content += `- **频道**: [${videoInfo.channelName}](${videoInfo.channelUrl})\n`
  if (videoInfo.publishDate) {
    content += `- **发布时间**: ${videoInfo.publishDate}\n`
  }
  content += `- **播放量**: ${videoInfo.viewCount}\n`
  if (videoInfo.likeCount) {
    content += `- **点赞**: ${videoInfo.likeCount}\n`
  }
  if (videoInfo.duration) {
    content += `- **时长**: ${videoInfo.duration}\n`
  }

  if (videoInfo.description) {
    content += `---\n\n`
    content += `## 视频简介\n\n`
    content += `${videoInfo.description}\n\n`
  }

  if (subtitles) {
    content += `---\n\n`
    content += `## 字幕内容\n\n`
    content += subtitles + "\n"
  }

  content += `---\n\n`
  content += `## 相关信息\n\n`
  content += `- **视频地址**: ${window.location.href}\n`
  content += `- **导出时间**: ${new Date().toLocaleString("zh-CN")}\n`

  return yaml + "\n\n" + content
}

export const config: PlasmoCSConfig = {
  matches: [
    "https://chat.deepseek.com/*",
    "https://*.deepseek.com/*",
    "https://chatgpt.com/*",
    "https://*.openai.com/*",
    "https://kimi.moonshot.cn/*",
    "https://kimi.ai/*",
    "https://www.kimi.com/*",
    "https://gemini.google.com/*",
    "https://www.doubao.com/*",
    // B站视频页面
    "https://www.bilibili.com/video/*",
    "https://bilibili.com/video/*",
    // B站稍后看列表
    "https://www.bilibili.com/list/watchlater*",
    "https://bilibili.com/list/watchlater*",
    // B站其他列表页
    "https://www.bilibili.com/list/*",
    "https://bilibili.com/list/*",
    // YouTube视频页面
    "https://www.youtube.com/watch*",
    "https://youtube.com/watch*",
    "https://youtu.be/*",
    "https://www.youtube.com/shorts/*",
    "https://youtube.com/shorts/*",
    // SmartClip: 通用网页剪藏 - 所有HTTP/HTTPS页面
    "<all_urls>"
  ]
}

let currentAdapter = detectPlatformAdapter()
if (!currentAdapter) {
  currentAdapter = detectSmartClipAdapter()
}
console.log("[Memflow] 初始适配器:", currentAdapter?.platformName || "未检测到")

// 如果是 B 站页面（视频或列表），立即安装字幕拦截器
if (
  currentAdapter instanceof BiliBiliAdapter &&
  (currentAdapter.isVideoPage() || currentAdapter.isListPage())
) {
  currentAdapter.installSubtitleHook()
}

// 如果是 YouTube 视频页面，立即安装字幕拦截器
if (currentAdapter instanceof YouTubeAdapter && currentAdapter.isVideoPage()) {
  currentAdapter.installSubtitleHook()
}

/**
 * 重新检测当前平台（用于消息触发时）
 */
function reDetectPlatform() {
  const newAdapter = detectPlatformAdapter()
  if (newAdapter) {
    currentAdapter = newAdapter
    console.log("[Memflow] 重新检测到平台:", currentAdapter.platformName)
  }
  return currentAdapter
}

/**
 * 判断是否为 B 站视频页面
 */
function isBiliBiliVideo(): boolean {
  return currentAdapter?.platformName === "Bilibili"
}

/**
 * 判断是否为 YouTube 视频页面
 */
function isYouTubeVideo(): boolean {
  return currentAdapter?.platformName === "YouTube"
}

function isSmartClip(): boolean {
  return currentAdapter instanceof SmartClipAdapter
}

/**
 * SmartClip 通用网页直接导出
 */
async function exportSmartClipDirect() {
  try {
    if (!(currentAdapter instanceof SmartClipAdapter)) {
      showToast("当前页面不是通用网页", "error")
      return
    }

    const smartClipAdapter = currentAdapter as SmartClipAdapter

    console.log("[Memflow SmartClip] 开始提取网页内容...")
    showToast("正在提取网页内容...", "warning")

    // 1. 提取网页内容
    const conversation = smartClipAdapter.extractConversation()
    const metadata = smartClipAdapter.getMetadata()

    if (!conversation.messages.length) {
      showToast("未找到网页内容", "warning")
      return
    }

    console.log(
      `[Memflow SmartClip] 提取到内容，长度: ${conversation.messages[0]?.content.length || 0}`
    )

    // 2. 生成本地元数据
    const metadataGen = createMetadataGenerator()
    const localMetadata = metadataGen.generateLocal(conversation)

    // 3. 构建 Markdown 内容
    const date = new Date().toISOString().split("T")[0]
    const tags = ["SmartClip", ...localMetadata.keywords]
      .filter((t) => t)
      .join(", ")

    const yaml = `---
created: ${date}
source: [[网页剪藏]]
original_url: "${window.location.href}"
tags: [${tags}]
category: ${localMetadata.category}
status: 待整理
---`

    let content = ""

    // 标题
    content += `# ${metadata.title || localMetadata.title}\n\n`

    // 元数据信息
    content += `---\n\n`
    content += `## 网页信息\n\n`
    if (metadata.author) {
      content += `- **作者**: ${metadata.author}\n`
    }
    if (metadata.siteName) {
      content += `- **来源网站**: ${metadata.siteName}\n`
    }
    if (metadata.publishDate) {
      content += `- **发布时间**: ${metadata.publishDate}\n`
    }
    if (metadata.description) {
      content += `- **原文描述**: ${metadata.description}\n`
    }

    // 封面图
    if (metadata.coverImage) {
      content += `\n![cover](${metadata.coverImage})\n`
    }

    // 本地摘要
    content += `---\n\n`
    content += `## 摘要\n\n`
    content += `${localMetadata.summary}\n\n`

    // 关键词
    content += `---\n\n`
    content += `## 关键词\n\n`
    content += localMetadata.keywords.join(", ") + "\n\n"

    // 高亮内容
    const highlights =
      currentAdapter instanceof SmartClipAdapter
        ? (currentAdapter as SmartClipAdapter).getHighlights()
        : []

    if (highlights.length > 0) {
      content += `---\n\n`
      content += `## 高亮内容\n\n`
      highlights.forEach((h: any, i) => {
        content += `${i + 1}. ${h.text}\n`
        if (h.note) {
          content += `   > 想法: ${h.note}\n`
        }
      })
      content += "\n"
    }

    // 网页正文
    content += `---\n\n`
    content += `## 网页正文\n\n`

    const rawContent = conversation.messages[0]?.content || ""
    content += rawContent + "\n"

    // 底部信息
    content += `---\n\n`
    content += `## 相关信息\n\n`
    content += `- **原文链接**: ${window.location.href}\n`
    content += `- **剪藏时间**: ${new Date().toLocaleString("zh-CN")}\n`

    const markdownContent = yaml + "\n\n" + content

    // 4. 导出
    if (!chrome.runtime?.id || !chrome.storage) {
      downloadMarkdown(markdownContent, localMetadata.title)
      showToast("已导出为文件", "success")
      return
    }

    const { obsidianConfig } = await chrome.storage.sync.get("obsidianConfig")

    if (!obsidianConfig || !obsidianConfig.vaultName) {
      downloadMarkdown(markdownContent, localMetadata.title)
      showToast("请在扩展设置中配置 Obsidian", "warning")
      return
    }

    if (obsidianConfig.exportMethod === "uri") {
      const handler = new ObsidianURIHandler(obsidianConfig)
      const result = await handler.exportToObsidian(markdownContent, {
        title: localMetadata.title,
        summary: localMetadata.summary,
        keywords: localMetadata.keywords,
        category: localMetadata.category,
        platform: "SmartClip",
        url: window.location.href
      })
      if (result.success) {
        showToast(result.message, "success")
      } else {
        downloadMarkdown(markdownContent, localMetadata.title)
        showToast("URI调用失败，已下载文件", "warning")
      }
    } else {
      downloadMarkdown(markdownContent, localMetadata.title)
      showToast("导出成功", "success")
    }
  } catch (error) {
    console.error("[Memflow SmartClip] 导出失败:", error)
    showToast(`导出失败: ${error.message}`, "error")
  }
}

/**
 * 通用的最终导出逻辑
 */
async function finalizeExport(conversation: Conversation) {
  const metadataGen = createMetadataGenerator()
  const metadata = metadataGen.generateLocal(conversation)

  const { obsidianConfig } = await chrome.storage.sync.get("obsidianConfig")
  const markdownBuilder = createMarkdownBuilder()
  const markdown = markdownBuilder.build(conversation, metadata, {
    contentFormat: obsidianConfig?.contentFormat || "web"
  })

  if (!chrome.runtime?.id || !chrome.storage) {
    downloadMarkdown(markdown, metadata.title)
    showToast("已导出为文件", "success")
    return
  }

  if (!obsidianConfig || !obsidianConfig.vaultName) {
    downloadMarkdown(markdown, metadata.title)
    showToast("请在扩展设置中配置 Obsidian", "warning")
    return
  }

  if (obsidianConfig.exportMethod === "uri") {
    const handler = new ObsidianURIHandler(obsidianConfig)
    const result = await handler.exportToObsidian(markdown, metadata)
    showToast(result.message, result.success ? "success" : "warning")
  } else {
    downloadMarkdown(markdown, metadata.title)
    showToast("导出成功", "success")
  }
}

async function exportDirect() {
  try {
    if (!currentAdapter) {
      showToast("当前页面不支持导出", "error")
      return
    }

    console.log("[Memflow] 开始提取对话...")

    // B 站列表页处理
    if (currentAdapter instanceof BiliBiliAdapter) {
      const bilibiliAdapter = currentAdapter as BiliBiliAdapter

      if (bilibiliAdapter.isListPage()) {
        // 列表页 - 直接导出视频列表
        console.log("[Memflow Bilibili] 检测到列表页")
        showToast("正在提取视频列表...", "warning")

        const conversation = bilibiliAdapter.extractConversation()

        // 构建列表页 Markdown
        const listMarkdown = buildBilibiliListMarkdown(conversation)

        // 导出
        const { obsidianConfig } =
          await chrome.storage.sync.get("obsidianConfig")

        if (!chrome.runtime?.id || !chrome.storage) {
          downloadMarkdown(listMarkdown, conversation.title)
          showToast("已导出为文件", "success")
          return
        }

        if (!obsidianConfig?.vaultName) {
          downloadMarkdown(listMarkdown, conversation.title)
          showToast("请在扩展设置中配置 Obsidian", "warning")
          return
        }

        if (obsidianConfig.exportMethod === "uri") {
          const handler = new ObsidianURIHandler(obsidianConfig)
          const result = await handler.exportToObsidian(listMarkdown, {
            title: conversation.title,
            summary: `包含 ${(conversation.messages[0]?.content || "").split("### ").length - 1 || 0} 个视频`,
            keywords: ["B站", "稍后看", "视频列表"],
            category: "娱乐",
            platform: "Bilibili",
            url: window.location.href
          })
          showToast(result.message, result.success ? "success" : "warning")
        } else {
          downloadMarkdown(listMarkdown, conversation.title)
          showToast("导出成功", "success")
        }
        return
      }

      // 视频详情页 - 继续获取字幕
      if (bilibiliAdapter.isVideoPage()) {
        let conversation = bilibiliAdapter.extractConversation()
        let subtitles = ""

        // 读取关于字幕的配置
        const { obsidianConfig: videoConfig } =
          await chrome.storage.sync.get("obsidianConfig")

        if (videoConfig?.saveSubtitles !== false) {
          showToast("正在获取字幕...", "warning")
          console.log("[Memflow Bilibili] 正在获取字幕...")

          const videoBaseUrl = window.location.href.split("?")[0]
          subtitles = await bilibiliAdapter.getSubtitles(
            !!videoConfig?.saveSubtitlesWithTimestamp,
            videoBaseUrl
          )
          if (!subtitles) {
            subtitles = await tryMemflowHelperSubtitleFallback(
              videoBaseUrl,
              "Bilibili"
            )
          }
        } else {
          console.log("[Memflow Bilibili] 设置中禁用了保存字幕")
        }

        if (subtitles && subtitles.length > 0) {
          conversation.messages.push({
            role: "assistant",
            content: "\n---\n\n## 视频字幕\n\n" + subtitles,
            timestamp: new Date()
          })
          console.log(
            "[Memflow Bilibili] 字幕获取成功:",
            subtitles.slice(0, 100) + "..."
          )
        } else {
          console.log("[Memflow Bilibili] 未找到字幕")
          showToast("未找到字幕，将导出视频基本信息", "warning")
        }

        if (conversation.messages.length === 0) {
          showToast("没有找到对话内容", "warning")
          return
        }

        console.log(`[Memflow] 提取到 ${conversation.messages.length} 条消息`)

        // B 站视频详情页使用专门的模板
        const videoInfo = bilibiliAdapter.getVideoInfo()
        const bilibiliMarkdown = buildBilibiliMarkdown(videoInfo, subtitles)

        const { obsidianConfig } =
          await chrome.storage.sync.get("obsidianConfig")

        if (!chrome.runtime?.id || !chrome.storage) {
          downloadMarkdown(bilibiliMarkdown, videoInfo.title)
          showToast("已导出为文件", "success")
          return
        }

        if (!obsidianConfig?.vaultName) {
          downloadMarkdown(bilibiliMarkdown, videoInfo.title)
          showToast("请在扩展设置中配置 Obsidian", "warning")
          return
        }

        if (obsidianConfig.exportMethod === "uri") {
          const handler = new ObsidianURIHandler(obsidianConfig)
          const result = await handler.exportToObsidian(bilibiliMarkdown, {
            title: videoInfo.title,
            summary: "",
            keywords: videoInfo.tags,
            category: "娱乐",
            platform: "Bilibili",
            url: window.location.href
          })
          if (result.success) {
            showToast(result.message, "success")
          } else {
            downloadMarkdown(bilibiliMarkdown, videoInfo.title)
            showToast("URI调用失败，已下载文件", "warning")
          }
        } else {
          downloadMarkdown(bilibiliMarkdown, videoInfo.title)
          showToast("导出成功", "success")
        }
        return
      }
    }

    // YouTube 视频处理
    if (currentAdapter instanceof YouTubeAdapter) {
      const youtubeAdapter = currentAdapter as YouTubeAdapter

      if (youtubeAdapter.isVideoPage()) {
        let conversation = youtubeAdapter.extractConversation()
        let subtitles = ""

        const { obsidianConfig: videoConfig } =
          await chrome.storage.sync.get("obsidianConfig")

        if (videoConfig?.saveSubtitles !== false) {
          showToast("正在获取字幕...", "warning")
          console.log("[Memflow YouTube] 正在获取字幕...")

          const videoBaseUrl = window.location.href
          subtitles = await youtubeAdapter.getSubtitles(
            !!videoConfig?.saveSubtitlesWithTimestamp,
            videoBaseUrl
          )
          if (!subtitles) {
            subtitles = await tryMemflowHelperSubtitleFallback(
              videoBaseUrl,
              "YouTube"
            )
          }
        } else {
          console.log("[Memflow YouTube] 设置中禁用了保存字幕")
        }

        if (subtitles && subtitles.length > 0) {
          conversation.messages.push({
            role: "assistant",
            content: "\n---\n\n## 视频字幕\n\n" + subtitles,
            timestamp: new Date()
          })
          console.log(
            "[Memflow YouTube] 字幕获取成功:",
            subtitles.slice(0, 100) + "..."
          )
        } else {
          console.log("[Memflow YouTube] 未找到字幕")
          showToast("未找到字幕，将导出视频基本信息", "warning")
        }

        if (conversation.messages.length === 0) {
          showToast("没有找到对话内容", "warning")
          return
        }

        console.log(`[Memflow] 提取到 ${conversation.messages.length} 条消息`)

        const videoInfo = youtubeAdapter.getVideoInfo()
        const youtubeMarkdown = buildYouTubeMarkdown(videoInfo, subtitles)

        const { obsidianConfig } =
          await chrome.storage.sync.get("obsidianConfig")

        if (!chrome.runtime?.id || !chrome.storage) {
          downloadMarkdown(youtubeMarkdown, videoInfo.title)
          showToast("已导出为文件", "success")
          return
        }

        if (!obsidianConfig?.vaultName) {
          downloadMarkdown(youtubeMarkdown, videoInfo.title)
          showToast("请在扩展设置中配置 Obsidian", "warning")
          return
        }

        if (obsidianConfig.exportMethod === "uri") {
          const handler = new ObsidianURIHandler(obsidianConfig)
          const result = await handler.exportToObsidian(youtubeMarkdown, {
            title: videoInfo.title,
            summary: "",
            keywords: [],
            category: "娱乐",
            platform: "YouTube",
            url: window.location.href
          })
          if (result.success) {
            showToast(result.message, "success")
          } else {
            downloadMarkdown(youtubeMarkdown, videoInfo.title)
            showToast("URI调用失败，已下载文件", "warning")
          }
        } else {
          downloadMarkdown(youtubeMarkdown, videoInfo.title)
          showToast("导出成功", "success")
        }
        return
      }
    }

    // SmartClip 通用网页导出
    if (currentAdapter instanceof SmartClipAdapter) {
      await exportSmartClipDirect()
      return
    }

    // 非 B 站平台的原有逻辑
    const conversation = currentAdapter.extractConversation()
    if (!conversation || conversation.messages.length === 0) {
      showToast("没有找到对话内容", "warning")
      return
    }

    console.log(`[Memflow] 提取到 ${conversation.messages.length} 条消息`)

    await finalizeExport(conversation)
  } catch (error) {
    console.error("导出失败:", error)
    showToast(`导出失败: ${error.message}`, "error")
  }
}

/**
 * B 站视频智能导出 - 使用 AI 总结字幕内容
 */
async function exportBiliBiliSmart() {
  try {
    if (!currentAdapter || !(currentAdapter instanceof BiliBiliAdapter)) {
      showToast("当前页面不是 B 站视频", "error")
      return
    }

    // 2. 确认提示
    const confirmed = await showMemflowConfirm({
      title: "请确认视频自带或支持AI字幕",
      description: "插件将提取视频字幕并生成总结。",
      question: "是否继续?",
      icon: "captions",
      confirmText: "继续"
    })
    if (!confirmed) return

    showVideoProgress(1)
    console.log("[Memflow Bilibili] 开始智能导出...")

    // 3. 获取视频信息和字幕
    const bilibiliAdapter = currentAdapter as BiliBiliAdapter
    const videoInfo = bilibiliAdapter.getVideoInfo()

    const { obsidianConfig: topConfig } =
      await chrome.storage.sync.get("obsidianConfig")
    let subtitles = ""

    // 默认给 AI 发送的字幕不带时间戳也可以，但如果用户开启了时间戳并保存字幕，
    // 我们为了统一就把带时间戳的字幕发给 AI 并且保存。
    // 当然也可以获取两次分离，这里按最简单方式复用。
    const withTimestamp = topConfig?.saveSubtitlesWithTimestamp === true
    const videoBaseUrl = window.location.href.split("?")[0]

    subtitles = await bilibiliAdapter.getSubtitles(withTimestamp, videoBaseUrl)
    if (!subtitles || subtitles.length === 0) {
      subtitles = await tryMemflowHelperSubtitleFallback(videoBaseUrl, "Bilibili")
    }

    if (!subtitles || subtitles.length === 0) {
      hideVideoProgress()
      showToast(
        "未检测到字幕。请在播放器底部点击「字幕」或「AI 字幕」按钮后重试",
        "error"
      )
      console.log("[Memflow Bilibili] 未找到字幕，视频可能没有开启字幕")
      return
    }

    console.log("[Memflow Bilibili] 字幕获取成功，长度:", subtitles.length)

    // 4. 检查 API 配置
    const [aiApiConfigResult, templateConfigResult] = await Promise.all([
      chrome.storage.sync.get("aiApiConfig"),
      chrome.storage.sync.get("templateConfig")
    ])
    const aiApiConfig = aiApiConfigResult.aiApiConfig
    const templateConfig = templateConfigResult.templateConfig
    const templateType = templateConfig?.bilibili?.templateType || "tech"

    const isLocalProvider = aiApiConfig?.provider === "local"
    if (!aiApiConfig?.enabled) {
      hideVideoProgress()
      showToast("请在设置中启用 AI API", "error")
      return
    }
    if (!isLocalProvider && !aiApiConfig?.apiKey) {
      hideVideoProgress()
      showToast("请在设置中配置 AI API Key", "error")
      return
    }

    showVideoProgress(2, "发送请求...")

    const aiConfig: AIApiConfig = {
      enabled: aiApiConfig.enabled,
      provider: aiApiConfig.provider || "deepseek",
      apiKey: aiApiConfig.apiKey,
      baseUrl: aiApiConfig.baseUrl || "",
      model: aiApiConfig.model || "",
      bilibiliPromptTemplate: templateType as any
    }

    const aiResult = await AIService.summarize({
      subtitles,
      videoInfo: {
        title: videoInfo.title,
        uploader: videoInfo.uploader,
        description: videoInfo.description,
        tags: videoInfo.tags
      },
      config: aiConfig
    })

    console.log("[Memflow Bilibili] AI 总结完成:", aiResult)

    // 6. 构建 Markdown 内容 - 使用统一的 B 站模板
    const finalTitle = aiResult.title || videoInfo.title
    const date = new Date().toISOString().split("T")[0]
    const tags = ["B站视频", ...aiResult.keywords].filter((t) => t).join(", ")

    // 构建 YAML frontmatter
    const yaml = `---
created: ${date}
source: [[B站视频]]
original_url: "${window.location.href}"
tags: [${tags}]
category: ${aiResult.category as any}
status: 待整理
---`

    let content = ""

    // 标题
    content += `# ${videoInfo.title}\n\n`
    content += `> 由 Memflow AI 总结\n\n`

    const videoEmbed = buildBilibiliEmbed(window.location.href, videoInfo.title)
    if (videoEmbed) {
      content += `${videoEmbed}\n\n`
    }

    // 视频信息
    content += `## 视频信息\n\n`
    content += `- **UP主**: [${videoInfo.uploader}](${videoInfo.uploaderUrl})\n`
    content += `- **发布时间**: ${videoInfo.publishDate}\n`
    content += `- **播放量**: ${videoInfo.views}\n`
    content += `- **点赞**: ${videoInfo.likes}\n`
    content += `- **投币**: ${videoInfo.coins}\n`
    content += `- **收藏**: ${videoInfo.favorites}\n`
    content += `- **标签**: ${videoInfo.tags.join(", ")}\n\n`

    // 简介
    content += `---\n\n`
    content += `## 视频简介\n\n`
    content += `${videoInfo.description || "无简介"}\n\n`

    // AI 总结
    content += `---\n\n`
    content += `## AI 总结\n\n`
    content += `${aiResult.summary}\n\n`

    // 关键词
    content += `---\n\n`
    content += `## 关键词\n\n`
    content += aiResult.keywords.join(", ") + "\n\n"

    if (aiConfig.bilibiliPromptTemplate === "english") {
      if (aiResult.highFrequencyWords && aiResult.highFrequencyWords.length > 0) {
        content += `---\n\n`
        content += `## 高频词汇\n\n`
        aiResult.highFrequencyWords.forEach((item) => {
          content += `* **${item.word}** - ${item.translation}\n`
          if (item.example) {
            content += `  > 例句: ${item.example}\n`
          }
        })
        content += "\n"
      }

      if (aiResult.commonPhrases && aiResult.commonPhrases.length > 0) {
        content += `---\n\n`
        content += `## 常用短语\n\n`
        aiResult.commonPhrases.forEach((item) => {
          content += `* **${item.phrase}** - ${item.translation}\n`
          if (item.example) {
            content += `  > 例句: ${item.example}\n`
          }
        })
        content += "\n"
      }

      if (aiResult.idioms && aiResult.idioms.length > 0) {
        content += `---\n\n`
        content += `##俗语 英文俗语\n\n`
        aiResult.idioms.forEach((item) => {
          content += `* **${item.idiom}** - ${item.meaning}\n`
          if (item.origin) {
            content += `  > 来源: ${item.origin}\n`
          }
        })
        content += "\n"
      }

      if (aiResult.trendingPhrases && aiResult.trendingPhrases.length > 0) {
        content += `---\n\n`
        content += `## 流行语解释\n\n`
        aiResult.trendingPhrases.forEach((item) => {
          content += `* **${item.phrase}** - ${item.meaning}\n`
          if (item.context) {
            content += `  > 场景: ${item.context}\n`
          }
        })
        content += "\n"
      }
    }

    // 如果用户开启了保存原文字幕，则追加
    // 原文字幕
    if (topConfig?.saveSubtitles !== false && subtitles) {
      content += `---\n\n`
      content += `## 字幕原文\n\n`
      const subtitleText = aiConfig.bilibiliPromptTemplate === "english" && aiResult.originalTextWithBold
        ? aiResult.originalTextWithBold
        : subtitles
      content += `${subtitleText}\n\n`
    }

    // 底部信息
    content += `---\n\n`
    content += `## 相关信息\n\n`
    content += `- **视频地址**: ${window.location.href}\n`
    content += `- **导出时间**: ${new Date().toLocaleString("zh-CN")}\n`

    const markdownContent = yaml + "\n\n" + content

    // 7. 导出
    showVideoProgress(3)

    if (!chrome.runtime?.id || !chrome.storage) {
      hideVideoProgress()
      downloadMarkdown(markdownContent, finalTitle)
      showToast("已导出为文件", "success")
      return
    }

    const { obsidianConfig } = await chrome.storage.sync.get("obsidianConfig")

    if (!obsidianConfig || !obsidianConfig.vaultName) {
      hideVideoProgress()
      downloadMarkdown(markdownContent, finalTitle)
      showToast("请在扩展设置中配置 Obsidian", "warning")
      return
    }

    if (obsidianConfig.exportMethod === "uri") {
      const handler = new ObsidianURIHandler(obsidianConfig)
      const result = await handler.exportToObsidian(markdownContent, {
        title: finalTitle,
        summary: aiResult.summary,
        keywords: aiResult.keywords,
        category: aiResult.category as any,
        platform: "Bilibili",
        url: window.location.href
      })
      hideVideoProgress()
      if (result.success) {
        showToast(result.message, "success")
      } else {
        downloadMarkdown(markdownContent, finalTitle)
        showToast("URI调用失败，已下载文件", "warning")
      }
    } else {
      hideVideoProgress()
      downloadMarkdown(markdownContent, finalTitle)
      showToast("导出成功", "success")
    }
  } catch (error) {
    hideVideoProgress()
    console.error("[Memflow Bilibili] 智能导出失败:", error)
    showToast(`智能导出失败: ${error.message}`, "error")
  }
}

/**
 * YouTube 视频智能导出 - 使用 AI 总结字幕内容
 */
async function exportYouTubeSmart() {
  try {
    if (!currentAdapter || !(currentAdapter instanceof YouTubeAdapter)) {
      showToast("当前页面不是 YouTube 视频", "error")
      return
    }

    const { aiApiConfig: initialAiConfig } = await chrome.storage.sync.get("aiApiConfig")

    const confirmed = await showMemflowConfirm({
      title: "YouTube 视频智能导出",
      description: "将尝试提取视频完整字幕，并使用 AI 生成结构化长文总结。",
      icon: "captions",
      confirmText: "开始导出"
    })
    if (!confirmed) return

    showVideoProgress(1)
    console.log("[Memflow YouTube] 开始智能导出...")

    const youtubeAdapter = currentAdapter as YouTubeAdapter
    const videoInfo = youtubeAdapter.getVideoInfo()

    const { obsidianConfig: topConfig } =
      await chrome.storage.sync.get("obsidianConfig")
    let subtitles = ""

    const withTimestamp = topConfig?.saveSubtitlesWithTimestamp === true
    const videoBaseUrl = window.location.href

    subtitles = await youtubeAdapter.getSubtitles(withTimestamp, videoBaseUrl)
    if (!subtitles || subtitles.length === 0) {
      subtitles = await tryMemflowHelperSubtitleFallback(videoBaseUrl, "YouTube")
    }

    if (!subtitles || subtitles.length === 0) {
      hideVideoProgress()
      showToast(
        "未检测到完整字幕轨道。视频可能没有字幕，或页面数据还未加载完成，请稍后重试",
        "error"
      )
      console.log("[Memflow YouTube] 未找到完整字幕轨道")
      return
    }

    console.log("[Memflow YouTube] 字幕获取成功，长度:", subtitles.length)

    const isLocalProvider = initialAiConfig?.provider === "local"
    if (!initialAiConfig?.enabled) {
      hideVideoProgress()
      showToast("请在设置中启用 AI API", "error")
      return
    }
    if (!isLocalProvider && !initialAiConfig?.apiKey) {
      hideVideoProgress()
      showToast("请在设置中配置 AI API Key", "error")
      return
    }

    showVideoProgress(2, "发送请求...")

    const [aiApiConfigResult, templateConfigResult] = await Promise.all([
      chrome.storage.sync.get("aiApiConfig"),
      chrome.storage.sync.get("templateConfig")
    ])
    const aiApiConfig = aiApiConfigResult.aiApiConfig
    const templateConfig = templateConfigResult.templateConfig
    const templateType = templateConfig?.bilibili?.templateType || "tech"

    const aiConfig: AIApiConfig = {
      enabled: aiApiConfig.enabled,
      provider: aiApiConfig.provider || "deepseek",
      apiKey: aiApiConfig.apiKey,
      baseUrl: aiApiConfig.baseUrl || "",
      model: aiApiConfig.model || "",
      bilibiliPromptTemplate: templateType as any
    }

    const aiResult = await AIService.summarize({
      subtitles,
      videoInfo: {
        title: videoInfo.title,
        uploader: videoInfo.channelName,
        description: videoInfo.description,
        tags: []
      },
      config: aiConfig
    })

    console.log("[Memflow YouTube] AI 总结完成:", aiResult)

    const finalTitle = aiResult.title || videoInfo.title
    const date = new Date().toISOString().split("T")[0]
    const tags = ["YouTube视频", ...aiResult.keywords]
      .filter((t) => t)
      .join(", ")

    const yaml = `---
created: ${date}
source: [[YouTube视频]]
original_url: "${window.location.href}"
tags: [${tags}]
category: ${aiResult.category as any}
status: 待整理
---`

    let content = ""

    content += `# ${videoInfo.title}\n\n`
    content += `> 由 Memflow AI 总结\n\n`

    const videoEmbed = buildYouTubeEmbed(window.location.href, videoInfo.title)
    if (videoEmbed) {
      content += `${videoEmbed}\n\n`
    }

    content += `## 视频信息\n\n`
    content += `- **频道**: [${videoInfo.channelName}](${videoInfo.channelUrl})\n`
    if (videoInfo.publishDate) {
      content += `- **发布时间**: ${videoInfo.publishDate}\n`
    }
    content += `- **播放量**: ${videoInfo.viewCount}\n`
    if (videoInfo.likeCount) {
      content += `- **点赞**: ${videoInfo.likeCount}\n`
    }
    if (videoInfo.duration) {
      content += `- **时长**: ${videoInfo.duration}\n`
    }

    content += `---\n\n`
    content += `## 视频简介\n\n`
    content += `${videoInfo.description || "无简介"}\n\n`

    content += `---\n\n`
    content += `## AI 总结\n\n`
    content += `${aiResult.summary}\n\n`

    content += `---\n\n`
    content += `## 关键词\n\n`
    content += aiResult.keywords.join(", ") + "\n\n"

    if (aiConfig.bilibiliPromptTemplate === "english") {
      if (aiResult.highFrequencyWords && aiResult.highFrequencyWords.length > 0) {
        content += `---\n\n`
        content += `## 高频词汇\n\n`
        aiResult.highFrequencyWords.forEach((item) => {
          content += `* **${item.word}** - ${item.translation}\n`
          if (item.example) {
            content += `  > 例句: ${item.example}\n`
          }
        })
        content += "\n"
      }

      if (aiResult.commonPhrases && aiResult.commonPhrases.length > 0) {
        content += `---\n\n`
        content += `## 常用短语\n\n`
        aiResult.commonPhrases.forEach((item) => {
          content += `* **${item.phrase}** - ${item.translation}\n`
          if (item.example) {
            content += `  > 例句: ${item.example}\n`
          }
        })
        content += "\n"
      }

      if (aiResult.idioms && aiResult.idioms.length > 0) {
        content += `---\n\n`
        content += `## 英文俗语\n\n`
        aiResult.idioms.forEach((item) => {
          content += `* **${item.idiom}** - ${item.meaning}\n`
          if (item.origin) {
            content += `  > 来源: ${item.origin}\n`
          }
        })
        content += "\n"
      }

      if (aiResult.trendingPhrases && aiResult.trendingPhrases.length > 0) {
        content += `---\n\n`
        content += `## 流行语解释\n\n`
        aiResult.trendingPhrases.forEach((item) => {
          content += `* **${item.phrase}** - ${item.meaning}\n`
          if (item.context) {
            content += `  > 场景: ${item.context}\n`
          }
        })
        content += "\n"
      }
    }

    if (topConfig?.saveSubtitles !== false && subtitles) {
      content += `---\n\n`
      content += `## 字幕原文\n\n`
      const subtitleText = aiConfig.bilibiliPromptTemplate === "english" && aiResult.originalTextWithBold
        ? aiResult.originalTextWithBold
        : subtitles
      content += `${subtitleText}\n\n`
    }

    content += `---\n\n`
    content += `## 相关信息\n\n`
    content += `- **视频地址**: ${window.location.href}\n`
    content += `- **导出时间**: ${new Date().toLocaleString("zh-CN")}\n`

    const markdownContent = yaml + "\n\n" + content

    showVideoProgress(3)

    if (!chrome.runtime?.id || !chrome.storage) {
      hideVideoProgress()
      downloadMarkdown(markdownContent, finalTitle)
      showToast("已导出为文件", "success")
      return
    }

    const { obsidianConfig } = await chrome.storage.sync.get("obsidianConfig")

    if (!obsidianConfig || !obsidianConfig.vaultName) {
      hideVideoProgress()
      downloadMarkdown(markdownContent, finalTitle)
      showToast("请在扩展设置中配置 Obsidian", "warning")
      return
    }

    if (obsidianConfig.exportMethod === "uri") {
      const handler = new ObsidianURIHandler(obsidianConfig)
      const result = await handler.exportToObsidian(markdownContent, {
        title: finalTitle,
        summary: aiResult.summary,
        keywords: aiResult.keywords,
        category: aiResult.category as any,
        platform: "YouTube",
        url: window.location.href
      })
      hideVideoProgress()
      if (result.success) {
        showToast(result.message, "success")
      } else {
        downloadMarkdown(markdownContent, finalTitle)
        showToast("URI调用失败，已下载文件", "warning")
      }
    } else {
      hideVideoProgress()
      downloadMarkdown(markdownContent, finalTitle)
      showToast("导出成功", "success")
    }
  } catch (error) {
    hideVideoProgress()
    console.error("[Memflow YouTube] 智能导出失败:", error)
    showToast(`智能导出失败: ${error.message}`, "error")
  }
}

async function exportSmartClipSmart() {
  try {
    if (!(currentAdapter instanceof SmartClipAdapter)) {
      showToast("当前页面不是通用网页", "error")
      return
    }

    const smartClipAdapter = currentAdapter as SmartClipAdapter

    // 1. 确认提示
    const confirmed = await showMemflowConfirm({
      title: "SmartClip 智能剪藏",
      description: "将使用 AI 分析当前网页，生成结构化摘要、关键信息和分类。",
      icon: "sparkles",
      confirmText: "开始剪藏"
    })
    if (!confirmed) return

    showToast("正在提取网页内容...", "warning")
    console.log("[Memflow SmartClip] 开始智能分析...")

    // 2. 提取网页内容
    const conversation = smartClipAdapter.extractConversation()
    const metadata = smartClipAdapter.getMetadata()

    if (!conversation.messages.length) {
      showToast("未找到网页内容", "warning")
      return
    }

    // 3. 检查 API 配置
    const { aiApiConfig } = await chrome.storage.sync.get("aiApiConfig")
    const isLocalProvider = aiApiConfig?.provider === "local"
    if (!aiApiConfig?.enabled) {
      showToast("请在设置中启用 AI API", "error")
      return
    }
    if (!isLocalProvider && !aiApiConfig?.apiKey) {
      showToast("请在设置中配置 AI API Key", "error")
      return
    }

    showToast("AI 分析中...", "warning", {
      duration: LONG_AI_TOAST_DURATION
    })

    // 4. 使用 AI 生成元数据
    const aiConfig: AIApiConfig = {
      enabled: aiApiConfig.enabled,
      provider: aiApiConfig.provider || "deepseek",
      apiKey: aiApiConfig.apiKey,
      baseUrl: aiApiConfig.baseUrl || "",
      model: aiApiConfig.model || ""
    }

    const metadataGen = createMetadataGenerator()
    const aiMetadata = await metadataGen.generateWithAI(
      conversation,
      currentAdapter
    )

    console.log("[Memflow SmartClip] AI 元数据生成完成:", aiMetadata)

    // 5. 构建 Markdown 内容
    const date = new Date().toISOString().split("T")[0]
    const tags = ["SmartClip", ...aiMetadata.keywords]
      .filter((t) => t)
      .join(", ")

    const yaml = `---
created: ${date}
source: [[网页剪藏]]
original_url: "${window.location.href}"
tags: [${tags}]
category: ${aiMetadata.category}
status: 待整理
---`

    let content = ""

    // 标题
    content += `# ${aiMetadata.title}\n\n`
    content += `> 由 SmartClip AI 智能剪藏\n\n`

    // 元数据信息
    content += `---\n\n`
    content += `## 网页信息\n\n`
    if (metadata.author) {
      content += `- **作者**: ${metadata.author}\n`
    }
    if (metadata.siteName) {
      content += `- **来源网站**: ${metadata.siteName}\n`
    }
    if (metadata.publishDate) {
      content += `- **发布时间**: ${metadata.publishDate}\n`
    }
    if (metadata.description) {
      content += `- **原文描述**: ${metadata.description}\n`
    }

    // 封面图
    if (metadata.coverImage) {
      content += `\n![cover](${metadata.coverImage})\n`
    }

    // AI 摘要
    content += `---\n\n`
    content += `## AI 摘要\n\n`
    content += `${aiMetadata.summary}\n\n`

    // 关键词
    content += `---\n\n`
    content += `## 关键词\n\n`
    content += aiMetadata.keywords.join(", ") + "\n\n"

    // 高亮内容
    const aiHighlights =
      currentAdapter instanceof SmartClipAdapter
        ? (currentAdapter as SmartClipAdapter).getHighlights()
        : []

    if (aiHighlights.length > 0) {
      content += `---\n\n`
      content += `## 高亮内容\n\n`
      aiHighlights.forEach((h: any, i) => {
        content += `${i + 1}. ${h.text}\n`
        if (h.note) {
          content += `   > 想法: ${h.note}\n`
        }
      })
      content += "\n"
    }

    // 网页正文
    content += `---\n\n`
    content += `## 网页正文\n\n`

    const rawContent = conversation.messages[0]?.content || ""
    content += rawContent + "\n"

    // 底部信息
    content += `---\n\n`
    content += `## 相关信息\n\n`
    content += `- **原文链接**: ${window.location.href}\n`
    content += `- **剪藏时间**: ${new Date().toLocaleString("zh-CN")}\n`

    const markdownContent = yaml + "\n\n" + content

    // 6. 导出
    showToast("正在保存...", "warning")

    if (!chrome.runtime?.id || !chrome.storage) {
      downloadMarkdown(markdownContent, aiMetadata.title)
      showToast("已导出为文件", "success")
      return
    }

    const { obsidianConfig } = await chrome.storage.sync.get("obsidianConfig")

    if (!obsidianConfig || !obsidianConfig.vaultName) {
      downloadMarkdown(markdownContent, aiMetadata.title)
      showToast("请在扩展设置中配置 Obsidian", "warning")
      return
    }

    if (obsidianConfig.exportMethod === "uri") {
      const handler = new ObsidianURIHandler(obsidianConfig)
      const result = await handler.exportToObsidian(markdownContent, {
        title: aiMetadata.title,
        summary: aiMetadata.summary,
        keywords: aiMetadata.keywords,
        category: aiMetadata.category,
        platform: "SmartClip",
        url: window.location.href
      })
      if (result.success) {
        showToast(result.message, "success")
      } else {
        downloadMarkdown(markdownContent, aiMetadata.title)
        showToast("URI调用失败，已下载文件", "warning")
      }
    } else {
      downloadMarkdown(markdownContent, aiMetadata.title)
      showToast("导出成功", "success")
    }
  } catch (error) {
    console.error("[Memflow SmartClip] 智能导出失败:", error)
    showToast(`智能导出失败: ${error.message}`, "error")
  }
}

async function exportSmart() {
  try {
    if (!currentAdapter) {
      showToast("当前页面不支持导出", "error")
      return
    }

    if (currentAdapter instanceof SmartClipAdapter) {
      await exportSmartClipSmart()
      return
    }

    // B 站视频的智能导出特殊处理
    if (isBiliBiliVideo()) {
      await exportBiliBiliSmart()
      return
    }

    // YouTube 视频的智能导出特殊处理
    if (isYouTubeVideo()) {
      await exportYouTubeSmart()
      return
    }

    // 1. 确认提示
    const confirmed = await showMemflowConfirm({
      title: "智能导出模式",
      description: "将通过已配置的大语言模型接口生成当前内容的标题、摘要和分类。",
      icon: "sparkles",
      confirmText: "开始分析"
    })
    if (!confirmed) return

    showToast("正在请求 AI 分析对话...", "warning", {
      duration: LONG_AI_TOAST_DURATION
    })
    console.log("[Memflow] 开始调用外部大模型...")

    // 2. 提取当前对话
    const conversation = currentAdapter.extractConversation()
    if (conversation.messages.length === 0) {
      showToast("没有找到对话内容", "warning")
      return
    }

    // 3. 生成智能元数据
    const metadataGen = createMetadataGenerator()
    const metadata = await metadataGen.generateWithAI(
      conversation,
      currentAdapter
    )

    console.log("[Memflow] 智能元数据生成完成:", metadata)
    showToast("AI 分析完成，正在导出...", "success")

    // 4. 后续导出流程与普通模式一致
    // 重新提取对话（因为可能包含 AI 分析的临时消息，虽然 generateWithAI 内部可能已经清理，但为了保险最好重新提取一次或过滤）
    // 4. 后续导出流程与普通模式一致
    // 检查扩展连接
    if (!chrome.runtime?.id || !chrome.storage) {
      const markdownBuilder = createMarkdownBuilder()
      const markdown = markdownBuilder.build(conversation, metadata, {
        contentFormat: "web"
      })
      downloadMarkdown(markdown, metadata.title)
      return
    }

    const { obsidianConfig } = await chrome.storage.sync.get("obsidianConfig")
    const markdownBuilder = createMarkdownBuilder()
    const markdown = markdownBuilder.build(conversation, metadata, {
      contentFormat: obsidianConfig?.contentFormat || "web"
    })

    if (!obsidianConfig || !obsidianConfig.vaultName) {
      downloadMarkdown(markdown, metadata.title)
      return
    }

    if (obsidianConfig.exportMethod === "uri") {
      const handler = new ObsidianURIHandler(obsidianConfig)
      const result = await handler.exportToObsidian(markdown, metadata)
      showToast(result.message, result.success ? "success" : "warning")
    } else {
      downloadMarkdown(markdown, metadata.title)
      showToast("导出成功", "success")
    }
  } catch (error) {
    console.error("智能导出失败:", error)
    showToast(`智能导出失败: ${error.message}`, "error")
  }
}

function downloadMarkdown(content: string, filename: string) {
  const safeFilename = Array.from(filename.replace(/[<>:"/\\|?*]/g, "-"))
    .slice(0, 50)
    .join("")

  // 使用 TextEncoder 构建安全可控的 UTF-8 字节流并手动压入 BOM 头，防止 Windows 解析错 Emoji
  const encoder = new TextEncoder()
  const contentBytes = encoder.encode(content)
  const bomBytes = new Uint8Array([0xef, 0xbb, 0xbf])
  const blob = new Blob([bomBytes, contentBytes], {
    type: "text/markdown;charset=utf-8"
  })
  const url = URL.createObjectURL(blob)

  const a = document.createElement("a")
  a.href = url
  a.download = `${safeFilename}.md`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

const DEFAULT_TOAST_DURATION = 3000
const LONG_AI_TOAST_DURATION = 60000

interface ToastOptions {
  duration?: number
}

function showToast(
  message: string,
  type: "success" | "error" | "warning" = "success",
  options: ToastOptions = {}
) {
  const existingToast = document.querySelector(".memflow-toast")
  if (existingToast) {
    existingToast.remove()
  }

  const toast = document.createElement("div")
  toast.className = `memflow-toast memflow-toast-${type}`
  toast.textContent = message

  document.body.appendChild(toast)

  const duration = options.duration ?? DEFAULT_TOAST_DURATION

  setTimeout(() => {
    toast.style.animation = "memflow-toast-slide-out 0.3s ease-out forwards"
    setTimeout(() => toast.remove(), 300)
  }, duration)
}

type MemflowConfirmIcon = "captions" | "sparkles"

interface MemflowConfirmOptions {
  title: string
  description: string
  details?: string
  question?: string
  icon?: MemflowConfirmIcon
  confirmText?: string
  cancelText?: string
}

function createMemflowIcon(icon: MemflowConfirmIcon = "sparkles"): string {
  const icons: Record<MemflowConfirmIcon, string> = {
    captions: `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <rect x="3" y="5" width="18" height="14" rx="3"></rect>
        <path d="M7 10h4"></path>
        <path d="M13 10h4"></path>
        <path d="M7 14h7"></path>
        <path d="M16 14h1"></path>
      </svg>
    `,
    sparkles: `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M12 3l1.7 4.6L18 9.2l-4.3 1.7L12 15l-1.7-4.1L6 9.2l4.3-1.6L12 3z"></path>
        <path d="M19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8L19 14z"></path>
        <path d="M5 13l.7 1.8L8 15.5l-2.3.7L5 18l-.7-1.8L2 15.5l2.3-.7L5 13z"></path>
      </svg>
    `
  }

  return icons[icon]
}

function showMemflowConfirm(options: MemflowConfirmOptions): Promise<boolean> {
  injectStyles()

  const existingDialog = document.querySelector(".memflow-confirm-backdrop")
  if (existingDialog) {
    existingDialog.remove()
  }

  return new Promise((resolve) => {
    const backdrop = document.createElement("div")
    backdrop.className = "memflow-confirm-backdrop"

    const dialog = document.createElement("div")
    dialog.className = "memflow-confirm"
    dialog.setAttribute("role", "dialog")
    dialog.setAttribute("aria-modal", "true")
    dialog.setAttribute("aria-labelledby", "memflow-confirm-title")

    const header = document.createElement("div")
    header.className = "memflow-confirm-header"

    const iconWrap = document.createElement("div")
    iconWrap.className = "memflow-confirm-icon"
    iconWrap.innerHTML = createMemflowIcon(options.icon)

    const title = document.createElement("div")
    title.id = "memflow-confirm-title"
    title.className = "memflow-confirm-title"
    title.textContent = options.title

    header.appendChild(iconWrap)
    header.appendChild(title)

    const description = document.createElement("p")
    description.className = "memflow-confirm-description"
    description.textContent = options.description

    dialog.appendChild(header)
    dialog.appendChild(description)

    if (options.details) {
      const details = document.createElement("div")
      details.className = "memflow-confirm-details"

      const detailsIcon = document.createElement("span")
      detailsIcon.className = "memflow-confirm-details-icon"
      detailsIcon.innerHTML = createMemflowIcon("captions")

      const detailsText = document.createElement("span")
      detailsText.textContent = options.details

      details.appendChild(detailsIcon)
      details.appendChild(detailsText)
      dialog.appendChild(details)
    }

    if (options.question) {
      const question = document.createElement("p")
      question.className = "memflow-confirm-question"
      question.textContent = options.question
      dialog.appendChild(question)
    }

    const actions = document.createElement("div")
    actions.className = "memflow-confirm-actions"

    const cancelButton = document.createElement("button")
    cancelButton.type = "button"
    cancelButton.className = "memflow-confirm-button memflow-confirm-cancel"
    cancelButton.textContent = options.cancelText || "取消"

    const confirmButton = document.createElement("button")
    confirmButton.type = "button"
    confirmButton.className = "memflow-confirm-button memflow-confirm-primary"
    confirmButton.textContent = options.confirmText || "确定"

    actions.appendChild(cancelButton)
    actions.appendChild(confirmButton)
    dialog.appendChild(actions)
    backdrop.appendChild(dialog)
    document.body.appendChild(backdrop)

    const finish = (confirmed: boolean) => {
      document.removeEventListener("keydown", handleKeyDown)
      backdrop.remove()
      resolve(confirmed)
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        finish(false)
      }
      if (event.key === "Enter") {
        finish(true)
      }
    }

    cancelButton.addEventListener("click", () => finish(false))
    confirmButton.addEventListener("click", () => finish(true))
    backdrop.addEventListener("click", (event) => {
      if (event.target === backdrop) {
        finish(false)
      }
    })
    document.addEventListener("keydown", handleKeyDown)

    requestAnimationFrame(() => confirmButton.focus())
  })
}

function showVideoProgress(step: 1 | 2 | 3, extraMessage?: string) {
  console.log("[Memflow] 进度: 步骤", step)

  const stepMessages = [
    "提取字幕中...",
    "AI 分析中..." + (extraMessage ? ` ${extraMessage}` : ""),
    "导出文件中..."
  ]

  const currentMessage = stepMessages[step - 1] || `步骤 ${step}`

  showToast(currentMessage, "warning", {
    duration: step === 2 ? LONG_AI_TOAST_DURATION : DEFAULT_TOAST_DURATION
  })
}

function hideVideoProgress() {}

function injectStyles() {
  if (document.getElementById("memflow-styles")) return

  const style = document.createElement("style")
  style.id = "memflow-styles"
  style.textContent = `
    .memflow-toast {
      position: fixed !important;
      top: 24px !important;
      right: 24px !important;
      padding: 14px 20px !important;
      background: rgba(10, 10, 15, 0.95) !important;
      border: 1px solid rgba(255, 255, 255, 0.1) !important;
      border-radius: 8px !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      font-size: 13px !important;
      font-weight: 500 !important;
      color: #e5e5e5 !important;
      z-index: 2147483647 !important;
      max-width: 360px !important;
      line-height: 1.5 !important;
      backdrop-filter: blur(20px) !important;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4) !important;
      animation: memflow-toast-slide-in 0.3s ease-out !important;
    }

    @keyframes memflow-toast-slide-in {
      from { opacity: 0; transform: translateX(20px); }
      to { opacity: 1; transform: translateX(0); }
    }

    @keyframes memflow-toast-slide-out {
      to { opacity: 0; transform: translateX(20px); }
    }

    .memflow-toast-success { border-left: 3px solid #10b981 !important; }
    .memflow-toast-error { border-left: 3px solid #ef4444 !important; }
    .memflow-toast-warning { border-left: 3px solid #f59e0b !important; }

    .memflow-confirm-backdrop {
      position: fixed !important;
      inset: 0 !important;
      z-index: 2147483647 !important;
      display: flex !important;
      align-items: flex-start !important;
      justify-content: center !important;
      padding: 104px 24px 24px !important;
      background: rgba(0, 0, 0, 0.48) !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
    }

    .memflow-confirm {
      width: min(520px, calc(100vw - 48px)) !important;
      padding: 22px !important;
      color: #f5f5f4 !important;
      background: #1f1f1f !important;
      border: 1px solid rgba(255, 255, 255, 0.14) !important;
      border-radius: 10px !important;
      box-shadow: 0 24px 60px rgba(0, 0, 0, 0.45) !important;
    }

    .memflow-confirm-header {
      display: flex !important;
      align-items: center !important;
      gap: 12px !important;
      margin-bottom: 16px !important;
    }

    .memflow-confirm-icon {
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      width: 34px !important;
      height: 34px !important;
      flex: 0 0 34px !important;
      color: #f59e0b !important;
      background: rgba(245, 158, 11, 0.12) !important;
      border: 1px solid rgba(245, 158, 11, 0.28) !important;
      border-radius: 8px !important;
    }

    .memflow-confirm-icon svg,
    .memflow-confirm-details-icon svg {
      width: 20px !important;
      height: 20px !important;
      fill: none !important;
      stroke: currentColor !important;
      stroke-width: 1.8 !important;
      stroke-linecap: round !important;
      stroke-linejoin: round !important;
    }

    .memflow-confirm-title {
      font-size: 17px !important;
      line-height: 1.35 !important;
      font-weight: 650 !important;
      letter-spacing: 0 !important;
    }

    .memflow-confirm-description {
      margin: 0 0 14px !important;
      color: #e7e5e4 !important;
      font-size: 14px !important;
      line-height: 1.7 !important;
    }

    .memflow-confirm-details {
      display: flex !important;
      gap: 10px !important;
      align-items: flex-start !important;
      margin-top: 14px !important;
      padding: 12px !important;
      color: #d6d3d1 !important;
      background: rgba(255, 255, 255, 0.06) !important;
      border: 1px solid rgba(255, 255, 255, 0.1) !important;
      border-radius: 8px !important;
      font-size: 13px !important;
      line-height: 1.65 !important;
    }

    .memflow-confirm-question {
      margin: 16px 0 0 !important;
      color: #f5f5f4 !important;
      font-size: 14px !important;
      line-height: 1.6 !important;
      font-weight: 520 !important;
    }

    .memflow-confirm-details-icon {
      display: inline-flex !important;
      color: #fbbf24 !important;
      flex: 0 0 auto !important;
      margin-top: 1px !important;
    }

    .memflow-confirm-details-icon svg {
      width: 18px !important;
      height: 18px !important;
    }

    .memflow-confirm-actions {
      display: flex !important;
      justify-content: flex-end !important;
      gap: 10px !important;
      margin-top: 22px !important;
    }

    .memflow-confirm-button {
      min-width: 82px !important;
      height: 36px !important;
      padding: 0 14px !important;
      border-radius: 8px !important;
      font-size: 14px !important;
      font-weight: 520 !important;
      cursor: pointer !important;
      outline: none !important;
      transition: background 0.15s ease, border-color 0.15s ease, transform 0.15s ease !important;
    }

    .memflow-confirm-button:focus-visible {
      box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.24) !important;
    }

    .memflow-confirm-button:hover {
      transform: translateY(-1px) !important;
    }

    .memflow-confirm-cancel {
      color: #e7e5e4 !important;
      background: rgba(255, 255, 255, 0.08) !important;
      border: 1px solid rgba(255, 255, 255, 0.16) !important;
    }

    .memflow-confirm-primary {
      color: #1c1917 !important;
      background: #f59e0b !important;
      border: 1px solid #f59e0b !important;
    }
  `
  document.head.appendChild(style)
  console.log("[Memflow] CSS 样式已注入")
}

function initMemflow() {
  console.log("[Memflow] 初始化开始...")

  injectStyles()

  if (isSmartClip()) {
    initHighlightFeature()
    return
  }

  if (isBiliBiliVideo()) {
    return
  }
}

// 延迟初始化，确保目标网站有机会渲染
if (document.readyState === "complete") {
  setTimeout(initMemflow, 500)
} else {
  window.addEventListener("load", () => {
    setTimeout(initMemflow, 500)
  })
}

// 监听来自 popup 的消息
chrome.runtime?.onMessage?.addListener((message, _sender, sendResponse) => {
  if (message.action === "triggerExport") {
    console.log("[Memflow] 收到 popup 导出请求")

    // 重新检测平台（页面可能已经变化）
    if (!currentAdapter) {
      console.log("[Memflow] 重新检测适配器...")
      reDetectPlatform()
    }

    // 如果是 B 站页面，直接调用导出函数
    if (currentAdapter instanceof BiliBiliAdapter) {
      console.log("[Memflow] B 站页面，直接调用导出")
      exportDirect()
      sendResponse({ success: true })
      return true
    }

    // 如果是 YouTube 页面，直接调用导出函数
    if (currentAdapter instanceof YouTubeAdapter) {
      console.log("[Memflow] YouTube 页面，直接调用导出")
      exportDirect()
      sendResponse({ success: true })
      return true
    }

    // 如果是豆包页面，直接调用导出函数
    if (currentAdapter instanceof DoubaoAdapter) {
      console.log("[Memflow] 豆包页面，直接调用导出")
      exportDirect()
      sendResponse({ success: true })
      return true
    }

    exportDirect()
    sendResponse({ success: true })
    return true
  }

  if (message.action === "triggerExportSmart") {
    console.log("[Memflow] 收到智能导出请求（快捷键）")
    // 重新检测适配器
    if (!currentAdapter) {
      reDetectPlatform()
    }
    exportSmart()
    sendResponse({ success: true })
    return true
  }
})

async function initHighlightFeature() {
  const { obsidianConfig } = await chrome.storage.sync.get("obsidianConfig")
  if (obsidianConfig?.enableHighlight !== true) {
    console.log("[SmartClip] 高亮功能未启用，跳过初始化")
    return
  }

  console.log("[SmartClip] 初始化高亮功能...")

  document.addEventListener("mouseup", handleTextSelection)
  document.addEventListener("click", handleHighlightClick)

  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === "H") {
      e.preventDefault()
      const selection = window.getSelection()
      if (selection && selection.toString().trim()) {
        createHighlightPopup(selection.toString().trim())
      }
    }
  })

  if (currentAdapter instanceof SmartClipAdapter) {
    ;(currentAdapter as SmartClipAdapter).renderHighlightsOnPage()
  }
}

let highlightPopup: HTMLElement | null = null
let highlightActionPopup: HTMLElement | null = null

function handleTextSelection() {
  const selection = window.getSelection()
  if (!selection || !selection.toString().trim()) {
    if (highlightPopup) {
      highlightPopup.remove()
      highlightPopup = null
    }
    return
  }

  const selectedText = selection.toString().trim()
  if (selectedText.length < 2) return

  // 显示高亮按钮
  setTimeout(() => {
    const range = selection.getRangeAt(0)
    if (range.collapsed) return

    const rect = range.getBoundingClientRect()
    showHighlightButton(rect, selectedText)
  }, 100)
}

function handleHighlightClick(e: MouseEvent) {
  const target = e.target as HTMLElement
  const highlightEl = target.closest("[data-highlight-id]")

  if (highlightEl && currentAdapter instanceof SmartClipAdapter) {
    e.preventDefault()
    e.stopPropagation()

    const highlightId = (highlightEl as HTMLElement).dataset.highlightId
    if (highlightId) {
      showHighlightActionMenu(highlightEl as HTMLElement, highlightId)
    }
    return
  }

  // 点击其他地方关闭菜单
  if (highlightActionPopup) {
    highlightActionPopup.remove()
    highlightActionPopup = null
  }
}

function showHighlightActionMenu(el: HTMLElement, highlightId: string) {
  if (highlightActionPopup) {
    highlightActionPopup.remove()
  }

  const rect = el.getBoundingClientRect()

  highlightActionPopup = document.createElement("div")
  highlightActionPopup.id = "memflow-highlight-action"
  highlightActionPopup.style.cssText = `
    position: fixed;
    top: ${rect.bottom + 8}px;
    left: ${rect.left}px;
    z-index: 2147483647;
    display: flex;
    gap: 8px;
    background: #fdfbf7;
    border: 1px solid rgba(0,0,0,0.06);
    border-radius: 20px;
    padding: 6px 12px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12), 0 0 4px rgba(0,0,0,0.04);
  `

  // 删除按钮
  const deleteBtn = document.createElement("button")
  deleteBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>`
  deleteBtn.style.cssText = `
    width: 22px;
    height: 22px;
    background: transparent;
    border: none;
    cursor: pointer;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
  `
  deleteBtn.onmouseover = () =>
    (deleteBtn.style.background = "rgba(0,0,0,0.06)")
  deleteBtn.onmouseout = () => (deleteBtn.style.background = "transparent")
  deleteBtn.onclick = (e) => {
    e.stopPropagation()
    deleteHighlight(highlightId, el)
    highlightActionPopup?.remove()
    highlightActionPopup = null
  }

  // 想法按钮
  const noteBtn = document.createElement("button")
  noteBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>`
  noteBtn.style.cssText = `
    width: 22px;
    height: 22px;
    background: transparent;
    border: none;
    cursor: pointer;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
  `
  noteBtn.onmouseover = () => (noteBtn.style.background = "rgba(0,0,0,0.06)")
  noteBtn.onmouseout = () => (noteBtn.style.background = "transparent")
  noteBtn.onclick = (e) => {
    e.stopPropagation()
    showNotePopup(highlightId, rect)
    highlightActionPopup?.remove()
    highlightActionPopup = null
  }

  // 颜色选择器
  const colors = ["#fef08a", "#86efac", "#60a5fa", "#f472b6"]
  colors.forEach((c) => {
    const colorBtn = document.createElement("button")
    colorBtn.style.cssText = `
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: ${c};
      border: 1px solid rgba(0,0,0,0.1);
      cursor: pointer;
      transition: all 0.2s;
      box-shadow: 0 1px 3px rgba(0,0,0,0.2);
    `
    colorBtn.onclick = (e) => {
      e.stopPropagation()
      changeHighlightColor(highlightId, el, c)
      highlightActionPopup?.remove()
      highlightActionPopup = null
    }
    highlightActionPopup.appendChild(colorBtn)
  })

  highlightActionPopup.appendChild(deleteBtn)
  highlightActionPopup.appendChild(noteBtn)
  document.body.appendChild(highlightActionPopup)
}

function deleteHighlight(id: string, el: HTMLElement) {
  if (currentAdapter instanceof SmartClipAdapter) {
    ;(currentAdapter as SmartClipAdapter).removeHighlight(id)
    // 移除高亮样式
    el.style.backgroundColor = ""
    delete el.dataset.highlightId
    showToast("已删除高亮", "success")
  }
}

function changeHighlightColor(id: string, el: HTMLElement, color: string) {
  const colorMap: Record<string, string> = {
    "#fef08a": "rgba(255,255,0,0.4)",
    "#86efac": "rgba(0,255,0,0.3)",
    "#60a5fa": "rgba(0,0,255,0.2)",
    "#f472b6": "rgba(255,192,203,0.4)"
  }
  el.style.backgroundColor = colorMap[color] || colorMap["#fef08a"]
  showToast("已更改颜色", "success")
}

function showNotePopup(id: string, rect: DOMRect) {
  const existing = document.getElementById("memflow-note-popup")
  if (existing) existing.remove()

  const popup = document.createElement("div")
  popup.id = "memflow-note-popup"

  let left = rect.left
  let top = rect.bottom + 8
  if (left + 260 > window.innerWidth) left = window.innerWidth - 280
  if (top + 160 > window.innerHeight) top = rect.top - 168
  if (left < 0) left = 16
  if (top < 0) top = 16

  popup.style.cssText = `
    position: fixed;
    top: ${top}px;
    left: ${left}px;
    z-index: 2147483647;
    background: #ffffff;
    border-radius: 8px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
    width: 260px;
    padding: 12px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    color: #333;
    display: flex;
    flex-direction: column;
    gap: 8px;
  `

  const header = document.createElement("div")
  header.style.cssText =
    "display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;"

  const title = document.createElement("div")
  title.textContent = "写想法"
  title.style.cssText = "font-weight: 600; font-size: 14px; color: #1f2937;"

  const closeBtn = document.createElement("button")
  closeBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>`
  closeBtn.style.cssText =
    "background: transparent; border: none; cursor: pointer; padding: 0; display: flex; align-items: center; justify-content: center;"

  header.appendChild(title)
  header.appendChild(closeBtn)

  const textarea = document.createElement("textarea")
  textarea.placeholder = "写想法"
  textarea.style.cssText = `
    width: 100%;
    min-height: 80px;
    border: none;
    outline: none;
    resize: none;
    font-size: 13px;
    color: #4b5563;
    background: transparent;
    padding: 0;
    box-sizing: border-box;
  `

  const footer = document.createElement("div")
  footer.style.cssText =
    "display: flex; justify-content: flex-end; align-items: center;"

  const sendBtn = document.createElement("button")
  sendBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>`
  sendBtn.style.cssText =
    "background: transparent; border: none; cursor: pointer; padding: 4px; display: flex; align-items: center; justify-content: center; transition: all 0.2s;"

  const saveNote = () => {
    const note = textarea.value.trim()
    if (note && currentAdapter instanceof SmartClipAdapter) {
      const highlights = (currentAdapter as SmartClipAdapter).getHighlights()
      const h = highlights.find((h) => h.id === id)
      if (h) {
        ;(h as any).note = note
        const all = getAllHighlights()
        const idx = all.findIndex((x) => x.id === id)
        if (idx >= 0) all[idx] = h
        saveAllHighlights(all)
        showToast("已添加笔记", "success")
      }
    }
    removePopup()
  }

  const removePopup = () => {
    popup.remove()
    document.removeEventListener("mousedown", clickOutsideHandler)
  }

  const clickOutsideHandler = (e: MouseEvent) => {
    if (!popup.contains(e.target as Node)) {
      removePopup()
    }
  }

  closeBtn.onclick = (e) => {
    e.stopPropagation()
    removePopup()
  }

  sendBtn.onclick = (e) => {
    e.stopPropagation()
    saveNote()
  }

  textarea.onkeydown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      saveNote()
    }
  }

  // sendBtn hover
  sendBtn.onmouseover = () => (sendBtn.style.stroke = "#3b82f6")
  sendBtn.onmouseout = () => (sendBtn.style.stroke = "#6b7280")

  footer.appendChild(sendBtn)

  popup.appendChild(header)
  popup.appendChild(textarea)
  popup.appendChild(footer)

  document.body.appendChild(popup)

  setTimeout(() => {
    textarea.focus()
    document.addEventListener("mousedown", clickOutsideHandler)
  }, 100)
}

function getAllHighlights(): any[] {
  try {
    const key = "memflow_highlights_" + window.location.href
    return JSON.parse(localStorage.getItem(key) || "[]")
  } catch {
    return []
  }
}

function saveAllHighlights(highlights: any[]) {
  const key = "memflow_highlights_" + window.location.href
  localStorage.setItem(key, JSON.stringify(highlights))
}

function showHighlightButton(rect: DOMRect, text: string) {
  if (highlightPopup) {
    highlightPopup.remove()
  }

  highlightPopup = document.createElement("div")
  highlightPopup.id = "memflow-highlight-popup"
  highlightPopup.style.cssText = `
    position: fixed;
    top: ${rect.top - 40}px;
    left: ${rect.left + rect.width / 2 - 40}px;
    z-index: 2147483647;
    display: flex;
    gap: 6px;
    background: #fdfbf7;
    border: 1px solid rgba(0,0,0,0.06);
    border-radius: 16px;
    padding: 6px 8px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12), 0 0 4px rgba(0,0,0,0.04);
  `

  const colors = [
    { name: "黄", color: "#fef08a" },
    { name: "绿", color: "#86efac" },
    { name: "蓝", color: "#60a5fa" },
    { name: "粉", color: "#f472b6" }
  ]

  colors.forEach((c) => {
    const btn = document.createElement("button")
    btn.style.cssText = `
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: ${c.color};
      border: 1px solid rgba(0,0,0,0.1);
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 1px 3px rgba(0,0,0,0.2);
    `
    btn.onmouseover = () => {
      btn.style.transform = "scale(1.15)"
    }
    btn.onmouseout = () => {
      btn.style.transform = "scale(1)"
    }
    btn.onclick = (e) => {
      e.stopPropagation()
      addHighlight(
        text,
        c.color === "#fef08a"
          ? "yellow"
          : c.color === "#86efac"
            ? "green"
            : c.color === "#60a5fa"
              ? "blue"
              : "pink"
      )
      highlightPopup?.remove()
      highlightPopup = null
    }
    highlightPopup.appendChild(btn)
  })

  document.body.appendChild(highlightPopup)
}

function addHighlight(text: string, color: string) {
  if (currentAdapter instanceof SmartClipAdapter) {
    const highlight = (currentAdapter as SmartClipAdapter).addHighlight(
      text,
      color
    )

    // 在选中文本上添加背景色
    const selection = window.getSelection()
    if (selection) {
      try {
        const range = selection.getRangeAt(0)
        const span = document.createElement("span")
        span.style.backgroundColor =
          color === "yellow"
            ? "rgba(255,255,0,0.4)"
            : color === "green"
              ? "rgba(0,255,0,0.3)"
              : color === "blue"
                ? "rgba(0,0,255,0.2)"
                : "rgba(255,192,203,0.4)"
        span.dataset.highlightId = highlight.id
        range.surroundContents(span)
      } catch (e) {
        console.log("[SmartClip] 无法高亮复杂选择")
      }
    }

    showToast(`已添加高亮: "${text.slice(0, 20)}..."`, "success")
  }
}

function createHighlightPopup(text: string) {
  const colors = ["yellow", "green", "blue", "pink"]
  const color = colors[Math.floor(Math.random() * colors.length)]
  addHighlight(text, color)
}
