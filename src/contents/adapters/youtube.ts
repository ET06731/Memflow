import type { Conversation, Message } from "../../types"
import { BaseAdapter } from "./base-adapter"
import type { SelectorConfig } from "./base-adapter"

/**
 * YouTube 视频适配器
 * 提取视频基本信息、字幕内容，用于导出到 Obsidian
 */
export class YouTubeAdapter extends BaseAdapter {
  platformName = "YouTube"
  selectors: SelectorConfig = {
    inputBox: "",
    sendButton: "",
    messageContainer: "",
    userMessage: "",
    aiMessage: ""
  }

  /**
   * 检测是否为 YouTube 支持的页面
   */
  detectPlatform(): boolean {
    const hostname = window.location.hostname
    const pathname = window.location.pathname

    // 视频页面: /watch?v=... 或 /shorts/...
    const isVideoPage = pathname === "/watch" || pathname.startsWith("/shorts/")
    // YouTube Studio 等其他页面排除
    const isStudioPage = hostname.includes("studio.youtube.com")

    return (
      (hostname.includes("youtube.com") || hostname.includes("youtu.be")) &&
      isVideoPage &&
      !isStudioPage
    )
  }

  /**
   * 判断是否为视频详情页
   */
  isVideoPage(): boolean {
    const pathname = window.location.pathname
    return pathname === "/watch" || pathname.startsWith("/shorts/")
  }

  /**
   * 提取 YouTube 视频信息
   */
  extractConversation(): Conversation {
    const messages: Message[] = []
    const videoInfo = this.extractVideoInfo()

    if (!videoInfo.title) {
      console.warn("[Memflow YouTube] 无法获取视频信息")
    }

    console.log("[Memflow YouTube] 视频信息:", videoInfo)

    const videoMeta = [
      `# ${videoInfo.title}`,
      "",
      "---",
      "",
      `**频道**: ${videoInfo.channelName}`,
      `**发布时间**: ${videoInfo.publishDate || "未知"}`,
      `**播放量**: ${videoInfo.viewCount}`,
      `**点赞数**: ${videoInfo.likeCount}`,
      "",
      "---",
      "",
      "## 视频简介",
      "",
      videoInfo.description || "无简介"
    ].join("\n")

    messages.push({
      role: "user",
      content: videoMeta,
      timestamp: new Date()
    })

    return {
      id: crypto.randomUUID(),
      title: videoInfo.title,
      platform: this.platformName,
      url: window.location.href,
      messages,
      createdAt: new Date()
    }
  }

  /**
   * 从页面提取视频基本信息
   */
  private extractVideoInfo(): {
    title: string
    channelName: string
    channelUrl: string
    description: string
    viewCount: string
    likeCount: string
    publishDate: string
    videoId: string
    thumbnail: string
    duration: string
  } {
    const info = {
      title: "",
      channelName: "",
      channelUrl: "",
      description: "",
      viewCount: "",
      likeCount: "",
      publishDate: "",
      videoId: "",
      thumbnail: "",
      duration: ""
    }

    // 从 URL 获取 video ID
    const url = new URL(window.location.href)
    if (url.pathname === "/watch") {
      info.videoId = url.searchParams.get("v") || ""
    } else if (url.pathname.startsWith("/shorts/")) {
      info.videoId = url.pathname.split("/shorts/")[1]?.split("?")[0] || ""
    }

    // 方法1: 从 ytInitialPlayerResponse 获取（最可靠）
    const playerResponse = (window as any).ytInitialPlayerResponse
    if (playerResponse?.videoDetails) {
      const details = playerResponse.videoDetails
      info.title = details.title || ""
      info.description = details.shortDescription || ""
      info.videoId = details.videoId || info.videoId
      info.viewCount = this.formatViewCount(details.viewCount)
      info.likeCount = details.likesCount
        ? `${this.formatNumber(parseInt(details.likesCount))} 次点赞`
        : ""

      if (details.shortDescription) {
        // 从 description 中提取发布日期（格式: "发布时间：YYYY年MM月DD日" 或类似）
        const dateMatch = details.shortDescription.match(
          /(\d{4}年\d{1,2}月\d{1,2}日)/
        )
        if (dateMatch) {
          info.publishDate = dateMatch[1]
        }
      }
    }

    // 方法2: 从 ytInitialData 获取（页面结构数据）
    const initialData = (window as any).ytInitialData
    if (initialData) {
      // 尝试从视频页面结构中提取信息
      try {
        const videoRenderer =
          initialData.contents?.twoColumnWatchNextResults?.resultsResult?.results?.contents?.find(
            (c: any) => c.videoInfoRenderer || c.videoPrimaryInfoRenderer
          )

        if (videoRenderer?.videoInfoRenderer) {
          // 标题
          const titleRuns = videoRenderer.videoInfoRenderer.title?.runs
          if (titleRuns?.[0]?.text) {
            info.title = titleRuns[0].text
          }
        }

        if (videoRenderer?.videoPrimaryInfoRenderer) {
          // 观看数
          const viewLabel =
            videoRenderer.videoPrimaryInfoRenderer.viewCount
              ?.videoViewCountRenderer?.viewCount?.simpleText
          if (viewLabel) {
            info.viewCount = viewLabel.replace(/播放/g, "").trim()
          }

          // 点赞数
          const likeCount =
            videoRenderer.videoPrimaryInfoRenderer.videoActions?.menuRenderer?.topLevelButtons?.find(
              (b: any) => b.segmentedLikeDislikeButtonRenderer
            )?.segmentedLikeDislikeButtonRenderer?.likeCount
          if (likeCount) {
            info.likeCount = `${this.formatNumber(likeCount)} 次点赞`
          }
        }
      } catch (e) {
        console.log("[Memflow YouTube] 解析 ytInitialData 失败", e)
      }

      // 提取频道信息
      try {
        const channelRenderer =
          initialData.metadata?.channelMetadataRenderer ||
          initialData.contents?.twoColumnWatchNextResults?.secondaryResults?.secondaryResults?.contents?.find(
            (c: any) => c.channelRenderer
          )?.channelRenderer

        if (channelRenderer) {
          info.channelName =
            channelRenderer.title?.simpleText ||
            channelRenderer.title?.runs?.[0]?.text ||
            ""
          info.channelUrl =
            channelRenderer.navigationEndpoint?.commandMetadata
              ?.webCommandMetadata?.url ||
            `https://www.youtube.com/channel/${channelRenderer.channelId}`
        }
      } catch (e) {
        console.log("[Memflow YouTube] 解析频道信息失败", e)
      }
    }

    // 方法3: 从 DOM 提取（备用）
    if (!info.title) {
      const titleEl = document.querySelector(
        "h1.ytd-video-primary-info-renderer, h1.title, [class*='title']"
      )
      if (titleEl) {
        info.title = titleEl.textContent?.trim() || ""
      }
    }

    // 从页面 DOM 提取频道名
    if (!info.channelName) {
      const channelEl = document.querySelector(
        "#channel-name a, #owner-name a, [class*='owner'] a"
      )
      if (channelEl) {
        info.channelName = channelEl.textContent?.trim() || ""
        info.channelUrl = (channelEl as HTMLAnchorElement).href || ""
      }
    }

    // 从 DOM 提取描述
    if (!info.description) {
      // 尝试多种选择器获取描述
      const descSelectors = [
        "#description-inline-expander #expanded",
        "#description-inline-expander yt-attributed-string",
        "#description-inline-expander",
        "#snippet.ytd-text-inline-expander",
        "#description"
      ]

      for (const selector of descSelectors) {
        const descEl = document.querySelector(selector)
        if (descEl && descEl.textContent?.trim()) {
          // 清理 HTML 标签，只保留纯文本
          const tempDiv = document.createElement("div")
          tempDiv.innerHTML = descEl.innerHTML
          const text = tempDiv.textContent || tempDiv.innerText || ""
          const cleaned = text.trim().slice(0, 1000)
          if (cleaned.length > 10) {
            info.description = cleaned
            break
          }
        }
      }
    }

    // 提取封面图
    if (info.videoId) {
      info.thumbnail = `https://img.youtube.com/vi/${info.videoId}/maxresdefault.jpg`
    }

    // 提取时长
    const durationEl = document.querySelector(".ytp-time-duration")
    if (durationEl) {
      info.duration = durationEl.textContent || ""
    }

    return info
  }

  /**
   * 获取字幕内容
   * @param withTimestamp 是否包含时间戳
   * @param videoUrl 视频URL（可选）
   */
  async getSubtitles(
    withTimestamp: boolean = false,
    videoUrl?: string
  ): Promise<string> {
    // 方案1: 尝试从 ytInitialPlayerResponse 获取字幕轨道信息
    const playerResponse = (window as any).ytInitialPlayerResponse
    if (
      playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks
    ) {
      const tracks =
        playerResponse.captions.playerCaptionsTracklistRenderer.captionTracks
      console.log(
        "[Memflow YouTube] 从 playerResponse 获取到字幕轨道:",
        tracks.length
      )

      // 优先选择中文或英文字幕
      const preferredTrack =
        tracks.find(
          (t: any) =>
            t.languageCode === "zh-Hans" ||
            t.languageCode === "zh-CN" ||
            t.languageCode === "zh" ||
            t.languageCode === "en"
        ) || tracks[0]

      if (preferredTrack?.baseUrl) {
        console.log(
          "[Memflow YouTube] 找到字幕轨道:",
          preferredTrack.languageName || preferredTrack.languageCode
        )

        // 检查是否有缓存（通过拦截器获取）
        const cachedSubtitle = (window as any).__memflowYouTubeSubtitleCache
        if (cachedSubtitle) {
          console.log("[Memflow YouTube] 从拦截器缓存获取字幕")
          return this.formatSubtitleText(
            cachedSubtitle,
            withTimestamp,
            videoUrl
          )
        }

        // 尝试从缓存的 XML 获取字幕（如果有的话）
        const cachedXml = (window as any).__memflowYouTubeSubtitleXml
        if (cachedXml) {
          console.log("[Memflow YouTube] 从 XML 缓存获取字幕")
          return this.parseTTMLSubtitles(cachedXml, withTimestamp, videoUrl)
        }

        // 字幕 URL 存在但还没有加载，尝试使用 DOM 中已有的字幕
        const domSubtitles = this.extractSubtitlesFromDOM()
        if (domSubtitles) {
          console.log("[Memflow YouTube] 从 DOM 提取字幕成功")
          return domSubtitles
        }

        // 如果用户已经开启了字幕，字幕应该已经被拦截器捕获
        console.log(
          "[Memflow YouTube] 请确保视频已开启字幕（点击播放器底部的CC按钮或字幕按钮）"
        )
      }
    } else {
      console.log(
        "[Memflow YouTube] playerResponse 中没有字幕轨道，请确保视频已开启字幕功能"
      )
    }

    // 方案2: 检查缓存
    const cachedSubtitle = (window as any).__memflowYouTubeSubtitleCache
    if (cachedSubtitle) {
      console.log("[Memflow YouTube] 从缓存获取字幕")
      return this.formatSubtitleText(cachedSubtitle, withTimestamp, videoUrl)
    }

    // 方案3: 尝试从 DOM 提取（如果用户开启了实时字幕）
    const domSubtitles = this.extractSubtitlesFromDOM()
    if (domSubtitles) {
      console.log("[Memflow YouTube] 从 DOM 提取字幕成功")
      return domSubtitles
    }

    console.log("[Memflow YouTube] 未找到字幕 - 请确保视频已开启字幕功能")
    return ""
  }

  /**
   * 从页面 DOM 提取已显示的字幕
   */
  private extractSubtitlesFromDOM(): string | null {
    try {
      // 查找字幕文本元素 - YouTube 会将字幕渲染到页面上
      const subtitleSelectors = [
        ".ytp-caption-segment", // 播放器内的字幕段
        ".captions-text .ytp-caption-segment", // 字幕容器
        "span.ytp-caption-segment", // 备用选择器
        "[class*='caption-segment']"
      ]

      for (const selector of subtitleSelectors) {
        const elements = document.querySelectorAll(selector)
        if (elements.length > 0) {
          const subtitles = Array.from(elements)
            .map((el) => el.textContent?.trim())
            .filter(Boolean)

          if (subtitles.length > 0) {
            console.log(
              `[Memflow YouTube] 从 DOM 获取到 ${subtitles.length} 条字幕`
            )
            return subtitles.join("\n")
          }
        }
      }

      // 尝试从字幕面板获取
      const captionPanel = document.querySelector(
        ".ytp-caption-window-container"
      )
      if (captionPanel) {
        const segments = captionPanel.querySelectorAll(".ytp-caption-segment")
        if (segments.length > 0) {
          return Array.from(segments)
            .map((el) => el.textContent?.trim())
            .filter(Boolean)
            .join("\n")
        }
      }
    } catch (e) {
      console.log("[Memflow YouTube] DOM 字幕提取失败:", e)
    }

    return null
  }

  /**
   * 从 URL 获取字幕
   */
  private async fetchSubtitleFromUrl(
    url: string,
    withTimestamp: boolean,
    videoUrl?: string
  ): Promise<string> {
    try {
      console.log("[Memflow YouTube] 获取字幕 URL:", url)
      const response = await fetch(url)
      const xmlText = await response.text()

      // 解析 TTML/XML 格式字幕
      const subtitles = this.parseTTMLSubtitles(
        xmlText,
        withTimestamp,
        videoUrl
      )
      if (subtitles) {
        console.log("[Memflow YouTube] 字幕获取成功，长度:", subtitles.length)
        return subtitles
      }
    } catch (error) {
      console.error("[Memflow YouTube] 获取字幕失败:", error)
    }
    return ""
  }

  /**
   * 解析 TTML 格式字幕
   */
  private parseTTMLSubtitles(
    xmlText: string,
    withTimestamp: boolean,
    videoUrl?: string
  ): string {
    try {
      const parser = new DOMParser()
      const doc = parser.parseFromString(xmlText, "text/xml")

      // 查找所有 p 标签（字幕段落）
      const paragraphs = doc.querySelectorAll("p")

      if (paragraphs.length === 0) {
        // 尝试查找 tt:p 标签
        const ttParagraphs = doc.querySelectorAll("tt\\:p, p")
        if (ttParagraphs.length > 0) {
          return this.extractSubtitleFromElements(
            ttParagraphs,
            withTimestamp,
            videoUrl
          )
        }
        return ""
      }

      return this.extractSubtitleFromElements(
        paragraphs,
        withTimestamp,
        videoUrl
      )
    } catch (error) {
      console.error("[Memflow YouTube] 解析字幕 XML 失败:", error)
      return ""
    }
  }

  /**
   * 从 p 标签元素提取字幕文本
   */
  private extractSubtitleFromElements(
    elements: NodeListOf<Element>,
    withTimestamp: boolean,
    videoUrl?: string
  ): string {
    const lines: string[] = []

    elements.forEach((el) => {
      const textContent = el.textContent?.trim() || ""
      if (!textContent) return

      // 获取时间戳（如果可用）
      if (withTimestamp && videoUrl) {
        const begin = el.getAttribute("begin")
        const dur = el.getAttribute("dur")

        if (begin) {
          const seconds = this.parseTimeToSeconds(begin)
          const timeStr = this.formatTimestampWithLink(seconds, videoUrl)
          lines.push(`${timeStr} ${textContent}`)
          return
        }
      }

      lines.push(textContent)
    })

    return lines.join("\n")
  }

  /**
   * 将时间字符串解析为秒数
   */
  private parseTimeToSeconds(timeStr: string): number {
    // 格式可能是: 00:01:23.500 或 01:23.500 或 1:23.5
    const parts = timeStr.replace(",", ".").split(":")
    let seconds = 0

    if (parts.length === 3) {
      // HH:MM:SS.mmm
      seconds =
        parseInt(parts[0]) * 3600 +
        parseInt(parts[1]) * 60 +
        parseFloat(parts[2])
    } else if (parts.length === 2) {
      // MM:SS.mmm
      seconds = parseInt(parts[0]) * 60 + parseFloat(parts[1])
    } else {
      seconds = parseFloat(parts[0])
    }

    return isNaN(seconds) ? 0 : seconds
  }

  /**
   * 格式化时间戳为 [mm:ss] 格式
   */
  private formatTimestamp(seconds: number): string {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `[${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}]`
  }

  /**
   * 格式化时间戳为带链接的格式: [mm:ss](url?t=seconds)
   */
  private formatTimestampWithLink(seconds: number, videoUrl: string): string {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    const timeStr = `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
    const timestampUrl = `${videoUrl.split("?")[0]}?t=${seconds}`
    return `[${timeStr}](${timestampUrl})`
  }

  /**
   * 格式化字幕文本（处理各种格式）
   */
  private formatSubtitleText(
    subtitles: any,
    withTimestamp: boolean,
    videoUrl?: string
  ): string {
    if (Array.isArray(subtitles)) {
      return subtitles
        .map((s: any) => {
          const text = s.text || s.content || ""
          if (withTimestamp && s.start && videoUrl) {
            const seconds =
              typeof s.start === "number"
                ? s.start
                : this.parseTimeToSeconds(String(s.start))
            return `${this.formatTimestampWithLink(seconds, videoUrl)} ${text}`
          }
          return text
        })
        .filter(Boolean)
        .join("\n")
    }
    return String(subtitles)
  }

  /**
   * 从当前 URL 提取视频 ID
   */
  private extractVideoId(): string {
    const url = new URL(window.location.href)
    if (url.pathname === "/watch") {
      return url.searchParams.get("v") || ""
    } else if (url.pathname.startsWith("/shorts/")) {
      return url.pathname.split("/shorts/")[1]?.split("?")[0] || ""
    }
    return ""
  }

  /**
   * 格式化播放量
   */
  private formatViewCount(count: string | number): string {
    const num = typeof count === "string" ? parseInt(count) : count
    if (isNaN(num)) return String(count)
    return this.formatNumber(num)
  }

  /**
   * 格式化数字
   */
  private formatNumber(num: number): string {
    if (num >= 100000000) {
      return (num / 100000000).toFixed(1) + "亿"
    }
    if (num >= 10000) {
      return (num / 10000).toFixed(1) + "万"
    }
    return num.toString()
  }

  /**
   * 获取视频信息
   */
  getVideoInfo(): ReturnType<typeof this.extractVideoInfo> {
    return this.extractVideoInfo()
  }

  /**
   * 安装字幕拦截器（拦截页面加载的字幕请求）
   */
  installSubtitleHook(): void {
    if ((window as any).__memflowYouTubeSubtitleHookInstalled) return
    ;(window as any).__memflowYouTubeSubtitleHookInstalled = true
    ;(window as any).__memflowYouTubeSubtitleCache = null

    const store = window as any

    // 监听 URL 变化，清除缓存
    let lastUrl = location.href
    const checkUrlChange = () => {
      if (location.href !== lastUrl) {
        console.log("[Memflow YouTube Hook] URL 变化，清空字幕缓存")
        lastUrl = location.href
        store.__memflowYouTubeSubtitleCache = null
      }
    }

    // 拦截 history.pushState 和 history.replaceState
    const origPushState = history.pushState
    history.pushState = function (...args) {
      const ret = origPushState.apply(this, args)
      checkUrlChange()
      return ret
    }

    const origReplaceState = history.replaceState
    history.replaceState = function (...args) {
      const ret = origReplaceState.apply(this, args)
      checkUrlChange()
      return ret
    }

    window.addEventListener("popstate", checkUrlChange)

    // 拦截 fetch 请求（字幕请求）
    const origFetch = window.fetch.bind(window)
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : (input as Request).url

      const res = await origFetch(input, init)

      // 拦截字幕相关请求
      if (url && (url.includes("timedtext") || url.includes("caption"))) {
        try {
          const clone = res.clone()
          const contentType = clone.headers.get("content-type") || ""

          if (contentType.includes("xml") || contentType.includes("text")) {
            const text = await clone.text()
            if (
              text &&
              text.length > 0 &&
              !store.__memflowYouTubeSubtitleCache
            ) {
              console.log("[Memflow YouTube Hook] 拦截字幕请求:", url)
              store.__memflowYouTubeSubtitleCache = text
            }
          }
        } catch (e) {
          // ignore
        }
      }

      return res
    }

    // 拦截 XHR 请求
    const OrigXHR = window.XMLHttpRequest
    ;(window as any).XMLHttpRequest = function () {
      const xhr = new OrigXHR()
      let capturedUrl = ""

      const origOpen = xhr.open.bind(xhr)
      ;(xhr as any).open = function (
        method: string,
        url: string,
        async?: boolean,
        user?: string,
        password?: string
      ) {
        capturedUrl = url
        return origOpen(method, url, async, user, password)
      }

      const origSend = xhr.send.bind(xhr)
      ;(xhr as any).send = function (
        body?: Document | XMLHttpRequestBodyInit | null
      ) {
        if (
          capturedUrl &&
          (capturedUrl.includes("timedtext") || capturedUrl.includes("caption"))
        ) {
          xhr.addEventListener("load", () => {
            try {
              const text = xhr.responseText
              if (
                text &&
                text.length > 0 &&
                !store.__memflowYouTubeSubtitleCache
              ) {
                console.log("[Memflow YouTube Hook] XHR 拦截字幕:", capturedUrl)
                store.__memflowYouTubeSubtitleCache = text
              }
            } catch (e) {
              // ignore
            }
          })
        }
        return origSend(body)
      }

      return xhr
    } as any

    console.log("[Memflow YouTube] 字幕拦截器已安装")
  }
}

/**
 * 创建 YouTube 适配器实例
 */
export function createYouTubeAdapter(): YouTubeAdapter {
  return new YouTubeAdapter()
}
