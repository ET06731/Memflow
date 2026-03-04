import type { PlasmoCSConfig } from "plasmo"

import { ObsidianURIHandler } from "../obsidian/uri-handler"
import { createMarkdownBuilder, createMetadataGenerator } from "../processing"
import { AIService } from "../services/ai-api"
import type { AIApiConfig, Conversation } from "../types"
import { BiliBiliAdapter, detectPlatformAdapter } from "./adapters"

/**
 * 构建 B 站视频的 Markdown 内容
 */
function buildBilibiliMarkdown(
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
status: 🟢 待整理
---`

  let content = ""

  // 标题
  content += `# ${videoInfo.title}\n\n`

  // 视频信息
  content += `## 📺 视频信息\n\n`
  content += `- **UP主**: [${videoInfo.uploader}](${videoInfo.uploaderUrl})\n`
  content += `- **发布时间**: ${videoInfo.publishDate}\n`
  content += `- **播放量**: ${videoInfo.views}\n`
  content += `- **点赞**: ${videoInfo.likes}\n`
  content += `- **投币**: ${videoInfo.coins}\n`
  content += `- **收藏**: ${videoInfo.favorites}\n`
  content += `- **标签**: ${videoInfo.tags.join(", ")}\n\n`

  // 简介
  content += `---\n\n`
  content += `## 📝 视频简介\n\n`
  content += `${videoInfo.description || "无简介"}\n\n`

  // 字幕
  if (subtitles) {
    content += `---\n\n`
    content += `## 📄 字幕内容\n\n`
    // 限制字幕长度，避免太长
    const truncatedSubtitles =
      subtitles.length > 50000
        ? subtitles.slice(0, 50000) + "\n\n...（字幕过长，已截断）"
        : subtitles
    content += truncatedSubtitles + "\n"
  }

  // 底部信息
  content += `---\n\n`
  content += `## 📎 相关信息\n\n`
  content += `- **视频地址**: ${window.location.href}\n`
  content += `- **导出时间**: ${new Date().toLocaleString("zh-CN")}\n`

  return yaml + "\n\n" + content
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
status: 🟢 待整理
---`

  let content = ""

  // 标题
  content += `# ${conversation.title}\n\n`
  content += `> 🤖 由 Memflow 导出\n\n`

  // 视频列表内容（从 messages 中提取）
  if (conversation.messages.length > 0) {
    content += conversation.messages[0].content + "\n"
  }

  // 底部信息
  content += `---\n\n`
  content += `## 📎 相关信息\n\n`
  content += `- **列表地址**: ${window.location.href}\n`
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
    "https://bilibili.com/list/*"
  ]
}

// 初始检测平台（页面加载时）
let currentAdapter = detectPlatformAdapter()
console.log("[Memflow] 初始适配器:", currentAdapter?.platformName || "未检测到")

// 如果是 B 站页面（视频或列表），立即安装字幕拦截器
if (currentAdapter instanceof BiliBiliAdapter && (currentAdapter.isVideoPage() || currentAdapter.isListPage())) {
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
        const { obsidianConfig: videoConfig } = await chrome.storage.sync.get("obsidianConfig")

        if (videoConfig?.saveSubtitles !== false) {
          showToast("正在获取字幕...", "warning")
          console.log("[Memflow Bilibili] 正在获取字幕...")

          subtitles = await bilibiliAdapter.getSubtitles(!!videoConfig?.saveSubtitlesWithTimestamp)
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

    // 非 B 站平台的原有逻辑
    const conversation = currentAdapter.extractConversation()
    if (!conversation || conversation.messages.length === 0) {
      showToast("没有找到对话内容", "warning")
      return
    }

    const metadataGen = createMetadataGenerator()
    const metadata = metadataGen.generateLocal(conversation)

    console.log("[Memflow] 元数据生成完成:", metadata)

    // 检查扩展连接是否可用
    if (!chrome.runtime?.id || !chrome.storage) {
      console.warn("[Memflow] 扩展 API 不可用，使用降级方案直接下载")
      const markdownBuilder = createMarkdownBuilder()
      const markdown = markdownBuilder.build(conversation, metadata, {
        contentFormat: "web"
      })
      downloadMarkdown(markdown, metadata.title)
      showToast("已导出为文件", "success")
      return
    }

    const { obsidianConfig } = await chrome.storage.sync.get("obsidianConfig")

    const markdownBuilder = createMarkdownBuilder()
    const markdown = markdownBuilder.build(conversation, metadata, {
      contentFormat: obsidianConfig?.contentFormat || "web"
    })

    console.log("[Memflow] Markdown 构建完成")

    if (!obsidianConfig || !obsidianConfig.vaultName) {
      downloadMarkdown(markdown, metadata.title)
      showToast("请在扩展设置中配置 Obsidian", "warning")
      return
    }

    if (obsidianConfig.exportMethod === "uri") {
      const handler = new ObsidianURIHandler(obsidianConfig)
      const result = await handler.exportToObsidian(markdown, metadata)

      if (result.success) {
        showToast(result.message, "success")
      } else {
        downloadMarkdown(markdown, metadata.title)
        showToast("URI调用失败，已下载文件", "warning")
      }
    } else {
      downloadMarkdown(markdown, metadata.title)
      showToast("导出成功", "success")
    }
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

    // 1. 获取 AI API 配置
    const { aiApiConfig } = await chrome.storage.sync.get("aiApiConfig")

    // 2. 确认提示
    const confirmed = window.confirm(
      "🤖 B 站视频智能导出\n\n插件将提取视频字幕并使用 AI 生成深度结构化长文总结。\n\n💡 请确保视频已开启字幕功能（点击播放器底部控制栏的「字幕」或「AI 字幕」按钮）\n\n是否继续？"
    )
    if (!confirmed) return

    showToast("正在获取字幕...", "warning")
    console.log("[Memflow Bilibili] 开始智能导出...")

    // 3. 获取视频信息和字幕
    const bilibiliAdapter = currentAdapter as BiliBiliAdapter
    const videoInfo = bilibiliAdapter.getVideoInfo()

    const { obsidianConfig: topConfig } = await chrome.storage.sync.get("obsidianConfig")
    let subtitles = ""

    // 默认给 AI 发送的字幕不带时间戳也可以，但如果用户开启了时间戳并保存字幕，
    // 我们为了统一就把带时间戳的字幕发给 AI 并且保存。
    // 当然也可以获取两次分离，这里按最简单方式复用。
    const withTimestamp = topConfig?.saveSubtitles !== false && !!topConfig?.saveSubtitlesWithTimestamp

    subtitles = await bilibiliAdapter.getSubtitles(withTimestamp)

    if (!subtitles || subtitles.length === 0) {
      showToast(
        "❌ 未检测到字幕！请在视频播放器下方点击「字幕」或「AI 字幕」按钮开启控制后重试",
        "error"
      )
      console.log("[Memflow Bilibili] 未找到字幕，视频可能没有开启字幕")
      return
    }

    console.log("[Memflow Bilibili] 字幕获取成功，长度:", subtitles.length)

    // 4. 检查 API 配置
    if (!aiApiConfig?.enabled || !aiApiConfig?.apiKey) {
      showToast("请在设置中配置 AI API", "error")
      return
    }

    showToast("正在请求 AI 分析...", "warning")

    // 5. 使用真实 API 生成总结
    const aiConfig: AIApiConfig = {
      enabled: aiApiConfig.enabled,
      provider: aiApiConfig.provider || "deepseek",
      apiKey: aiApiConfig.apiKey,
      baseUrl: aiApiConfig.baseUrl || "",
      model: aiApiConfig.model || ""
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
status: 🟢 待整理
---`

    let content = ""

    // 标题 (🤖)
    content += `# ${videoInfo.title}\n\n`
    content += `> \u{1F916} 由 Memflow AI 总结\n\n`

    // 视频信息 (📺)
    content += `## \u{1F4FA} 视频信息\n\n`
    content += `- **UP主**: [${videoInfo.uploader}](${videoInfo.uploaderUrl})\n`
    content += `- **发布时间**: ${videoInfo.publishDate}\n`
    content += `- **播放量**: ${videoInfo.views}\n`
    content += `- **点赞**: ${videoInfo.likes}\n`
    content += `- **投币**: ${videoInfo.coins}\n`
    content += `- **收藏**: ${videoInfo.favorites}\n`
    content += `- **标签**: ${videoInfo.tags.join(", ")}\n\n`

    // 简介 (📝)
    content += `---\n\n`
    content += `## \u{1F4DD} 视频简介\n\n`
    content += `${videoInfo.description || "无简介"}\n\n`

    // AI 总结 (💡)
    content += `---\n\n`
    content += `## \u{1F4A1} AI 总结\n\n`
    content += `${aiResult.summary}\n\n`

    // 关键词 (🏷️)
    content += `---\n\n`
    content += `## \u{1F3F7}\u{FE0F} 关键词\n\n`
    content += aiResult.keywords.join(", ") + "\n\n"

    // 如果用户开启了保存原文字幕，则追加
    // 原文字幕 (📑)
    if (topConfig?.saveSubtitles !== false && subtitles) {
      content += `---\n\n`
      content += `## \u{1F4D1} 字幕原文\n\n`
      content += `${subtitles}\n\n`
    }

    // 底部信息 (📎)
    content += `---\n\n`
    content += `## \u{1F4CE} 相关信息\n\n`
    content += `- **视频地址**: ${window.location.href}\n`
    content += `- **导出时间**: ${new Date().toLocaleString("zh-CN")}\n`

    const markdownContent = yaml + "\n\n" + content

    // 7. 导出
    if (!chrome.runtime?.id || !chrome.storage) {
      downloadMarkdown(markdownContent, finalTitle)
      showToast("已导出为文件", "success")
      return
    }

    const { obsidianConfig } = await chrome.storage.sync.get("obsidianConfig")

    if (!obsidianConfig || !obsidianConfig.vaultName) {
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
      if (result.success) {
        showToast(result.message, "success")
      } else {
        downloadMarkdown(markdownContent, finalTitle)
        showToast("URI调用失败，已下载文件", "warning")
      }
    } else {
      downloadMarkdown(markdownContent, finalTitle)
      showToast("导出成功", "success")
    }
  } catch (error) {
    console.error("[Memflow Bilibili] 智能导出失败:", error)
    showToast(`智能导出失败: ${error.message}`, "error")
  }
}

async function exportSmart() {
  try {
    if (!currentAdapter) {
      showToast("当前页面不支持导出", "error")
      return
    }

    // B 站视频的智能导出特殊处理
    if (isBiliBiliVideo()) {
      await exportBiliBiliSmart()
      return
    }

    // 1. 确认提示
    const confirmed = window.confirm(
      "🤖 智能导出模式\n\n插件将通过你配置的第三方大语言模型接口来生成当前网页上记录的标题、摘要和分类。\n\n是否继续？"
    )
    if (!confirmed) return

    showToast("正在请求 AI 分析对话...", "warning")
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
  const safeFilename = Array.from(filename.replace(/[<>:"/\\|?*]/g, "-")).slice(0, 50).join("")

  // 使用 TextEncoder 构建安全可控的 UTF-8 字节流并手动压入 BOM 头，防止 Windows 解析错 Emoji
  const encoder = new TextEncoder()
  const contentBytes = encoder.encode(content)
  const bomBytes = new Uint8Array([0xEF, 0xBB, 0xBF])
  const blob = new Blob([bomBytes, contentBytes], { type: "text/markdown;charset=utf-8" })
  const url = URL.createObjectURL(blob)

  const a = document.createElement("a")
  a.href = url
  a.download = `${safeFilename}.md`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function createToolbarButton() {
  if (document.getElementById("memflow-export-btn")) {
    return
  }

  console.log("🎯 尝试创建导出按钮...")

  const toolbar = findToolbarLocation()
  if (!toolbar) {
    console.error("[Memflow] 无法找到工具栏位置")
    return
  }

  // 判断是否为 DeepSeek 网站，使用原生 DOM 结构复刻
  const isDeepSeek = window.location.host.includes("deepseek.com")

  let button: HTMLElement

  if (isDeepSeek) {
    // DeepSeek: 复刻原生按钮结构
    button = document.createElement("div")
    button.id = "memflow-export-btn"
    button.setAttribute("role", "button")
    button.setAttribute("tabindex", "0")
    button.setAttribute("aria-label", "导出到 Obsidian")
    button.title = "导出到 Obsidian"

    // 使用 DeepSeek 原生类名
    button.className =
      "ds-icon-button ds-icon-button--xl ds-icon-button--sizing-container"

    button.innerHTML = `
      <div class="ds-icon-button__hover-bg"></div>
      <div class="ds-icon" style="display: flex; align-items: center; justify-content: center;">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
      </div>
    `
  } else {
    // 其他网站: 使用普通 button
    button = document.createElement("button")
    button.id = "memflow-export-btn"
    button.setAttribute("type", "button")
    button.setAttribute("aria-label", "导出到 Obsidian")
    button.title = "导出到 Obsidian"

    button.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="7 10 12 15 17 10"/>
        <line x1="12" y1="15" x2="12" y2="3"/>
      </svg>
    `

    button.className = "memflow-toolbar-btn"
  }

  const style = document.createElement("style")
  style.textContent = `
    .memflow-toolbar-btn {
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      width: 2em !important;
      height: 2em !important;
      padding: 0.25em !important;
      margin: 0 0.25em !important;
      background: transparent !important;
      border: none !important;
      border-radius: 0.5em !important;
      cursor: pointer !important;
      color: rgba(255, 255, 255, 0.9) !important;
      opacity: 1 !important;
      transition: all 0.2s ease !important;
      position: relative !important;
      z-index: 9999 !important;
      font-size: 16px !important;
    }

    .memflow-toolbar-btn:hover {
      background-color: rgba(255, 255, 255, 0.15) !important;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15) !important;
    }

    .memflow-toolbar-btn svg {
      width: 1.25em !important;
      height: 1.25em !important;
      pointer-events: none !important;
    }

    .memflow-toolbar-btn.exporting {
      pointer-events: none !important;
      opacity: 0.5 !important;
    }

    .memflow-toolbar-btn.exporting svg {
      animation: memflow-pulse 1.5s ease-in-out infinite !important;
    }

    @keyframes memflow-pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }

    /* 备用容器样式 */
    #memflow-fallback-container {
      animation: memflow-fade-in 0.3s ease-out !important;
      padding: 8px !important;
      background: rgba(255, 255, 255, 0.1) !important;
      border-radius: 8px !important;
      backdrop-filter: blur(10px) !important;
    }

    @keyframes memflow-fade-in {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* Toast 通知样式 */
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
      display: flex !important;
      align-items: center !important;
      gap: 10px !important;
    }

    .memflow-toast::before {
      content: '';
      width: 4px;
      height: 4px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .memflow-toast-success {
      border-left: 3px solid #10b981 !important;
    }

    .memflow-toast-success::before {
      background: #10b981;
      box-shadow: 0 0 8px #10b981;
    }

    .memflow-toast-error {
      border-left: 3px solid #ef4444 !important;
    }

    .memflow-toast-error::before {
      background: #ef4444;
      box-shadow: 0 0 8px #ef4444;
    }

    .memflow-toast-warning {
      border-left: 3px solid #f59e0b !important;
    }

    .memflow-toast-warning::before {
      background: #f59e0b;
      box-shadow: 0 0 8px #f59e0b;
    }

    @keyframes memflow-toast-slide-in {
      from { 
        opacity: 0; 
        transform: translateX(20px);
      }
      to { 
        opacity: 1; 
        transform: translateX(0);
      }
    }

    @keyframes memflow-toast-slide-out {
      from { 
        opacity: 1; 
        transform: translateX(0);
      }
      to { 
        opacity: 0; 
        transform: translateX(20px);
      }
    }
  `
  document.head.appendChild(style)

  button.addEventListener("click", async (e) => {
    // 如果按住了 Shift 键，或者在设置中默认开启了智能模式（后续实现），则触发智能导出
    // 这里暂时使用 Shift+Click 或 右键 作为快捷方式
    if (e.shiftKey) {
      button.classList.add("exporting")
      try {
        await exportSmart()
      } finally {
        button.classList.remove("exporting")
      }
      return
    }

    button.classList.add("exporting")
    try {
      await exportDirect()
    } finally {
      button.classList.remove("exporting")
    }
  })

  // 添加右键菜单触发智能导出
  button.addEventListener("contextmenu", async (e) => {
    e.preventDefault() // 阻止默认右键菜单
    button.classList.add("exporting")
    try {
      await exportSmart()
    } finally {
      button.classList.remove("exporting")
    }
  })

  // 更新 Tooltip 提示
  button.title = "左键: 直接导出 | 右键/Shift+左键: 智能导出 (AI生成标题摘要)"

  // 如果有标记的分享按钮，作为同级元素插入到它前面
  const shareBtn = (toolbar as any).__memflowShareButton
  if (shareBtn && shareBtn.parentNode) {
    // 将按钮插入为分享按钮的同级元素，在它之前
    shareBtn.parentNode.insertBefore(button, shareBtn)

    // 设置适当的间距 - 根据不同网站微调
    if (window.location.host.includes("deepseek.com")) {
      // DeepSeek 微调：距离分享按钮更近，垂直居中
      button.style.marginRight = "4px" // 水平间距（右侧）
      button.style.marginLeft = "0px" // 水平间距（左侧）- 向右移动
      button.style.marginTop = "8px" // 垂直位置（上）- 向上移动
      button.style.marginBottom = "0px" // 垂直位置（下）
    } else if (window.location.host.includes("doubao.com")) {
      button.style.marginRight = "30px"
    } else {
      button.style.marginRight = "8px"
    }

    console.log("[Memflow] Memflow 工具栏按钮已创建（在分享按钮旁）")
  } else if (toolbar) {
    toolbar.appendChild(button)
    console.log("[Memflow] Memflow 工具栏按钮已创建")
  }
}

function findToolbarLocation(): HTMLElement | null {
  console.log("[Memflow] 开始查找工具栏位置...", window.location.host)

  // 策略 1: 寻找"分享"按钮 (Share Button) 并创建 flex 容器插入到它左边
  // 使用 Material Design 最佳实践：在同一 flex 容器中水平排列
  const shareButtonSelectors = [
    // ChatGPT - 最新界面 (优先级最高)
    "button[data-testid='share-chat-button']", // 标准测试ID
    "[data-testid='share-chat-button']", // 属性选择器
    "button[aria-label='分享']", // 中文标签
    "button.btn-ghost:has(svg)", // Ghost按钮包含SVG
    "button:has(svg use[href*='sprites-core'])", // ChatGPT特定sprite图标
    "button:has(svg[width='20'][height='20'])", // 分享图标尺寸
    "button:has-text('分享')", // 包含"分享"文本
    // 豆包 (Doubao)
    "[data-testid='thread_share_btn_right_side']",
    // 通用选择器
    "button[aria-label*='Share']", // 通用英文
    "button[aria-label*='分享']", // 通用中文
    "button[class*='share']", // 通用分享按钮类名
    "[data-testid='share-button']", // 一些网站的测试ID
    // Kimi 特定的分享按钮
    ".header-right button[class*='share']",
    ".chat-header button[class*='share']",
    "button svg[class*='share']", // 包含分享图标的按钮
    "button:has(svg[data-icon='share'])", // 通过图标查找
    // DeepSeek Share Button - 基于建议的稳健选择器
    // 通过SVG路径特征识别分享按钮（最可靠）
    "svg path[d*='M7.95889 1.52285']", // DeepSeek分享图标SVG路径特征
    "[class*='ds-icon']:has(svg path[d*='M7.95889'])", // 包含特定SVG的ds-icon
    // 排除内部元素（hover-bg, focus-ring等），只匹配按钮容器
    "[class*='ds-icon-button']:not([class*='hover-bg']):not([class*='focus-ring']):not([class*='icon'])",
    "div[role='button'].ds-icon-button--xl:last-child", // 最稳健：大号按钮的最后一个
    "div._2be88ba > div:last-child[role='button']", // 父容器最后一个按钮
    //"div[role='button'].ds-icon-button--sizing-container",  // 尺寸容器
    // "div._57370c5.ds-icon-button",  // 精确类名组合（可能变动）
    // ".ds-icon-button--xl[role='button']",  // 大号按钮且带 role，匹配到左侧新建对话
    // Gemini / Google Share Button
    "button:has(mat-icon[fonticon='share'])",
    "button:has(mat-icon[data-mat-icon-name='share'])",
    "mat-icon[fonticon='share']", // Fallback to find parent
    "mat-icon[data-mat-icon-name='share']",
    "[fonticon='share']", // 更通用的选择器
    "mat-icon[class*='share']" // 通过 class 匹配
  ]

  for (const selector of shareButtonSelectors) {
    try {
      // 获取所有匹配的元素
      const matches = document.querySelectorAll(selector)

      for (const shareBtn of matches) {
        // 如果找到的是 icon 或其他内部元素，向上查找 button 或 role="button" 元素
        let targetBtn: Element | null = shareBtn

        // 如果当前元素不是交互按钮，向上查找
        const tagName = shareBtn.tagName.toLowerCase()
        const role = shareBtn.getAttribute("role")

        if (tagName !== "button" && role !== "button") {
          // 先尝试查找 button
          targetBtn = shareBtn.closest("button")
          // 如果没找到，尝试查找 role="button" 的元素（如 DeepSeek）
          if (!targetBtn) {
            targetBtn = shareBtn.closest('[role="button"]')
          }
        }

        if (targetBtn && targetBtn.parentNode) {
          // 对于 DeepSeek 和 ChatGPT，需要额外验证：确保是最后一个按钮（分享按钮通常在右侧最后）
          const parent = targetBtn.parentElement
          if (parent) {
            const siblings = Array.from(parent.children).filter(
              (el) =>
                el.matches('[role="button"], button') ||
                el.querySelector('[role="button"], button')
            )
            const isLastButton =
              siblings.indexOf(targetBtn) === siblings.length - 1

            // 放宽限制：主要平台都接受，不强制要求最后一个按钮
            const isChatGPT =
              window.location.host.includes("chatgpt") ||
              window.location.host.includes("openai")
            const isDeepSeek = window.location.host.includes("deepseek")
            const isGemini =
              window.location.host.includes("gemini") ||
              window.location.host.includes("google")

            if (isLastButton || isDeepSeek || isChatGPT || isGemini) {
              console.log(
                "[Memflow] 已定位到分享按钮:",
                selector,
                isChatGPT
                  ? "(ChatGPT)"
                  : isDeepSeek
                    ? "(DeepSeek)"
                    : isGemini
                      ? "(Gemini)"
                      : "(最后一个)"
              )
                ; (targetBtn as any).__memflowShareButton = targetBtn
              return targetBtn as HTMLElement
            }
          }
        }
      }
    } catch (e) {
      // 某些选择器可能不被支持，忽略错误
    }
  }

  // 策略 2: 常见的顶部右侧容器 (Header Right)
  const headerRightSelectors = [
    // ChatGPT
    ".sticky.top-0 .flex.items-center:last-child",
    ".sticky.top-0 .flex.gap-2", // ChatGPT 新的顶部栏结构
    "[data-testid='header-user-menu-button']",
    "nav[aria-label='Chat history'] + div", // ChatGPT 新界面

    // Kimi
    ".header-right .action-group",
    ".header-right",
    ".chat-header .action-group",
    ".chat-header .header-actions",
    "[class*='chat-header'] [class*='action']",
    ".toolbar",
    ".chat-toolbar",
    "[class*='Toolbar']",
    ".kimi-header .actions",
    "[data-testid='chat-toolbar']",

    // Gemini
    ".gb_Ld", // Google 顶部栏类名
    "header div[role='toolbar']",
    "[data-test-id='header-actions']",
    ".gemini-header .actions",
    "[class*='gemini'] [class*='header'] [class*='action']",

    // DeepSeek
    "header .header-right",
    "header .header-actions",

    // 通用
    "header .actions",
    "header [role='toolbar']",
    "header > div:last-child",
    ".app-header > div:last-child",
    "[class*='Header'] > div:last-child",
    "#page-header > div:last-child",
    ".top-bar .actions",
    "[class*='topbar'] [class*='action']"
  ]

  for (const selector of headerRightSelectors) {
    try {
      const element = document.querySelector(selector)
      if (element) {
        const wrapper = document.createElement("div")
        wrapper.style.cssText =
          "display: inline-flex; align-items: center; margin: 0 8px;"

        // 既然是右上角，通常插入到最前面比较合适
        if (element.firstChild) {
          element.insertBefore(wrapper, element.firstChild)
        } else {
          element.appendChild(wrapper)
        }
        console.log("[Memflow] 已定位到 Header Right:", selector)
        return wrapper
      }
    } catch (e) {
      // 忽略错误
    }
  }

  // 策略 3: 查找顶部导航栏
  const headerSelectors = [
    "header",
    ".header",
    "[class*='Header']",
    "[class*='header']",
    "#header",
    "nav[role='navigation']",
    ".app-header",
    ".page-header"
  ]

  for (const selector of headerSelectors) {
    try {
      const header = document.querySelector(selector)
      if (header instanceof HTMLElement) {
        const container = document.createElement("div")
        container.style.cssText = `
          display: inline-flex;
          align-items: center;
          position: absolute;
          right: 20px;
          top: 50%;
          transform: translateY(-50%);
          z-index: 100;
        `.trim()

        // 确保 header 有定位上下文
        const style = window.getComputedStyle(header)
        if (style.position === "static") {
          header.style.position = "relative"
        }

        header.appendChild(container)
        console.log("[Memflow] 已挂载到 Header:", selector)
        return container
      }
    } catch (e) {
      // 忽略错误
    }
  }

  // 策略 4: 最后的保底 - 页面右上角固定悬浮
  console.log("[Memflow] 使用备用策略：页面右上角固定位置")
  const container = document.createElement("div")
  container.id = "memflow-fallback-container"
  container.style.cssText = `
    position: fixed !important;
    top: 100px !important;
    right: 20px !important;
    z-index: 2147483647 !important;
  `.trim()

  document.body.appendChild(container)
  console.log("[Memflow] 已创建备用容器")
  return container
}

function showToast(
  message: string,
  type: "success" | "error" | "warning" = "success"
) {
  const existingToast = document.querySelector(".memflow-toast")
  if (existingToast) {
    existingToast.remove()
  }

  const toast = document.createElement("div")
  toast.className = `memflow-toast memflow-toast-${type}`
  toast.textContent = message

  document.body.appendChild(toast)

  setTimeout(() => {
    toast.style.animation = "memflow-toast-slide-out 0.3s ease-out forwards"
    setTimeout(() => toast.remove(), 300)
  }, 3000)
}

function initMemflow() {
  console.log("[Memflow] 初始化开始...")

  // B 站视频页面不创建工具栏按钮，只通过 popup 触发导出
  if (isBiliBiliVideo()) {
    console.log("[Memflow] B站视频页面，跳过工具栏按钮创建")
    return
  }

  // 尝试创建按钮，如果失败则重试
  let retryCount = 0
  const maxRetries = 10
  const retryInterval = 1000 // 1秒

  function tryCreateButton() {
    if (document.getElementById("memflow-export-btn")) {
      console.log("[Memflow] 按钮已存在，跳过创建")
      return true
    }

    createToolbarButton()

    // 检查是否成功创建
    if (document.getElementById("memflow-export-btn")) {
      console.log("[Memflow] 按钮创建成功")
      return true
    }

    return false
  }

  function attemptCreation() {
    if (tryCreateButton()) {
      return
    }

    retryCount++
    if (retryCount < maxRetries) {
      console.log(`[Memflow] 第 ${retryCount} 次重试...`)
      setTimeout(attemptCreation, retryInterval)
    } else {
      console.error("[Memflow] 按钮创建失败，已达到最大重试次数")
    }
  }

  // 页面加载完成后开始尝试
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      console.log("📄 DOMContentLoaded 触发")
      attemptCreation()
    })
  } else {
    attemptCreation()
  }

  // 使用 MutationObserver 监视 DOM 变化
  let debounceTimer: ReturnType<typeof setTimeout> | null = null
  const observer = new MutationObserver(() => {
    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }
    debounceTimer = setTimeout(() => {
      if (!document.getElementById("memflow-export-btn")) {
        console.log("🔄 DOM 变化，尝试重新创建按钮...")
        tryCreateButton()
      }
    }, 500)
  })

  // 等待 body 存在后再观察
  function startObserver() {
    if (document.body) {
      observer.observe(document.body, {
        childList: true,
        subtree: true
      })
      console.log("[Memflow] MutationObserver 开始监视")
    } else {
      setTimeout(startObserver, 100)
    }
  }
  startObserver()
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

    // 非 B 站页面：尝试点击或创建按钮
    const existingBtn = document.getElementById("memflow-export-btn")
    if (existingBtn) {
      existingBtn.click()
      sendResponse({ success: true })
    } else {
      // 尝试重新创建按钮并导出
      initMemflow()
      setTimeout(() => {
        const btn = document.getElementById("memflow-export-btn")
        if (btn) {
          btn.click()
          sendResponse({ success: true })
        } else {
          sendResponse({ success: false, error: "按钮未找到" })
        }
      }, 1500)
    }
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
