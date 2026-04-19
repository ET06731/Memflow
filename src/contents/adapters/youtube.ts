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

    const videoEmbed = videoInfo.videoId
      ? `<iframe width="560" height="315" src="https://www.youtube.com/embed/${videoInfo.videoId}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`
      : ""

    const videoMeta = [
      `# ${videoInfo.title}`,
      "",
      "---",
      "",
      videoEmbed ? videoEmbed + "\n" : "",
      "**频道**: " + videoInfo.channelName,
      "**发布时间**: " + (videoInfo.publishDate || "未知"),
      "**播放量**: " + videoInfo.viewCount,
      "**点赞数**: " + videoInfo.likeCount,
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

    // 方法1: 从 ytInitialPlayerResponse 获取（最可靠，包含未展开的完整简介）
    const playerResponse = this.getPlayerResponse()
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
      const fullDescription = this.extractDescriptionFromInitialData(initialData)
      if (fullDescription && fullDescription.length > info.description.length) {
        info.description = fullDescription
      }

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
      this.expandDescriptionIfNeeded()

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
          const cleaned = text
            .replace(/\n?\s*(更多|Show more)\s*$/i, "")
            .trim()
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

  private expandDescriptionIfNeeded(): void {
    const expandSelectors = [
      "#description-inline-expander #expand",
      "ytd-text-inline-expander #expand",
      "#snippet #expand",
      "tp-yt-paper-button#expand",
      "button[aria-label*='Show more']",
      "button[aria-label*='更多']"
    ]

    for (const selector of expandSelectors) {
      const expandButton = document.querySelector(selector) as HTMLElement | null
      if (!expandButton) continue

      const text = expandButton.textContent?.trim() || ""
      const ariaLabel = expandButton.getAttribute("aria-label") || ""
      if (
        text.includes("更多") ||
        /show more/i.test(text) ||
        ariaLabel.includes("更多") ||
        /show more/i.test(ariaLabel) ||
        expandButton.id === "expand"
      ) {
        expandButton.click()
        console.log("[Memflow YouTube] 已尝试展开视频简介")
        return
      }
    }
  }

  private extractDescriptionFromInitialData(initialData: any): string {
    const candidates: string[] = []

    const collectText = (value: any): string => {
      if (!value) return ""
      if (typeof value === "string") return value
      if (typeof value.simpleText === "string") return value.simpleText
      if (typeof value.content === "string") return value.content
      if (Array.isArray(value.runs)) {
        return value.runs.map((run: any) => run.text || "").join("")
      }
      return ""
    }

    const visit = (value: any, depth = 0) => {
      if (!value || typeof value !== "object" || depth > 12) return

      if (value.expandableVideoDescriptionBodyRenderer) {
        const renderer = value.expandableVideoDescriptionBodyRenderer
        const text =
          collectText(renderer.attributedDescriptionBodyText) ||
          collectText(renderer.descriptionBodyText) ||
          collectText(renderer.descriptionText)
        if (text) candidates.push(text)
      }

      if (value.videoSecondaryInfoRenderer) {
        const renderer = value.videoSecondaryInfoRenderer
        const text =
          collectText(renderer.attributedDescription) ||
          collectText(renderer.description)
        if (text) candidates.push(text)
      }

      if (Array.isArray(value)) {
        value.forEach((item) => visit(item, depth + 1))
        return
      }

      Object.values(value).forEach((child) => visit(child, depth + 1))
    }

    visit(initialData)

    return candidates
      .map((text) => text.trim())
      .filter((text) => text.length > 10)
      .sort((a, b) => b.length - a.length)[0] || ""
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
    // 方案1: 从完整字幕轨道 URL 拉取。不要依赖播放器是否开启 CC。
    const playerResponse = this.getPlayerResponse()
    const tracks = this.getCaptionTracks(playerResponse)
    let hasPoTokenTrack = false

    if (tracks.length > 0) {
      console.log(
        "[Memflow YouTube] 从 playerResponse 获取到字幕轨道:",
        tracks.length
      )

      const preferredTrack = this.selectPreferredCaptionTrack(tracks)

      if (preferredTrack?.baseUrl) {
        console.log(
          "[Memflow YouTube] 找到字幕轨道:",
          preferredTrack.languageName || preferredTrack.languageCode
        )

        if (this.requiresPoToken(preferredTrack.baseUrl)) {
          hasPoTokenTrack = true
          console.log(
            "[Memflow YouTube] 当前字幕 URL 需要 PO token，等待 YouTube 生成带 pot 的字幕请求"
          )
        } else {
          const fetchedSubtitles = await this.fetchSubtitleFromUrl(
            preferredTrack.baseUrl,
            withTimestamp,
            videoUrl
          )
          if (fetchedSubtitles) return fetchedSubtitles
        }
      }
    } else {
      console.log("[Memflow YouTube] playerResponse 中没有字幕轨道")
    }

    // 方案2: 检查缓存
    const cachedSubtitle = (window as any).__memflowYouTubeSubtitleCache
    if (cachedSubtitle) {
      console.log("[Memflow YouTube] 从缓存获取字幕")
      return this.formatSubtitleText(cachedSubtitle, withTimestamp, videoUrl)
    }

    // 方案3: 从 Performance API 读取 YouTube 已发出的带 pot 的 timedtext 请求。
    const performanceSubtitles = await this.fetchSubtitlesFromPerformance(
      withTimestamp,
      videoUrl,
      hasPoTokenTrack ? 15000 : 3000
    )
    if (performanceSubtitles) return performanceSubtitles

    // xpe 字幕必须依赖 YouTube 页面生成 pot。这里继续试 Android/transcript 基本只会增加等待和噪音。
    if (hasPoTokenTrack) {
      console.log("[Memflow YouTube] 等待 pot 字幕 URL 超时，停止无效 fallback")
      return ""
    }

    // 方案4: 参考 youtube-transcript-api，用 Android Innertube player 重新获取非 xpe 字幕 URL。
    const androidSubtitles = await this.fetchSubtitlesFromAndroidPlayer(
      withTimestamp,
      videoUrl
    )
    if (androidSubtitles) return androidSubtitles

    // 方案5: YouTube 新页面常把转录文本放在 get_transcript 接口，而不是 captionTracks。
    const transcriptSubtitles = await this.fetchTranscriptFromInnertube(
      withTimestamp,
      videoUrl
    )
    if (transcriptSubtitles) return transcriptSubtitles

    // 方案6: 自动打开 YouTube transcript 面板再读取完整列表。
    const transcriptPanelSubtitles = await this.openTranscriptPanelAndExtract(
      withTimestamp,
      videoUrl
    )
    if (transcriptPanelSubtitles) return transcriptPanelSubtitles

    // 方案7: 尝试从 DOM 提取（最后兜底，只能拿到当前屏幕片段）
    const domSubtitles = this.extractSubtitlesFromDOM()
    if (domSubtitles) {
      console.log("[Memflow YouTube] 从 DOM 提取字幕成功（可能不完整）")
      return domSubtitles
    }

    console.log("[Memflow YouTube] 未找到完整字幕轨道，视频可能没有字幕或页面数据未加载完成")
    return ""
  }

  private getPlayerResponse(): any | null {
    const fromWindow = (window as any).ytInitialPlayerResponse
    if (fromWindow?.videoDetails || fromWindow?.captions) {
      return fromWindow
    }

    const scripts = Array.from(document.querySelectorAll("script"))
    for (const script of scripts) {
      const text = script.textContent || ""
      const marker = "ytInitialPlayerResponse"
      const markerIndex = text.indexOf(marker)
      if (markerIndex === -1) continue

      const assignmentIndex = text.indexOf("=", markerIndex)
      if (assignmentIndex === -1) continue

      const jsonStart = text.indexOf("{", assignmentIndex)
      if (jsonStart === -1) continue

      const jsonText = this.extractBalancedJson(text, jsonStart)
      if (!jsonText) continue

      try {
        return JSON.parse(jsonText)
      } catch (_error) {
        // continue
      }
    }

    return null
  }

  private getInitialData(): any | null {
    const fromWindow = (window as any).ytInitialData
    if (fromWindow) return fromWindow

    const scripts = Array.from(document.querySelectorAll("script"))
    for (const script of scripts) {
      const text = script.textContent || ""
      const marker = "ytInitialData"
      const markerIndex = text.indexOf(marker)
      if (markerIndex === -1) continue

      const assignmentIndex = text.indexOf("=", markerIndex)
      if (assignmentIndex === -1) continue

      const jsonStart = text.indexOf("{", assignmentIndex)
      if (jsonStart === -1) continue

      const jsonText = this.extractBalancedJson(text, jsonStart)
      if (!jsonText) continue

      try {
        return JSON.parse(jsonText)
      } catch (_error) {
        // continue
      }
    }

    return null
  }

  private getYouTubeConfig(): {
    apiKey: string
    clientVersion: string
    clientName: string
    visitorData: string
    hl: string
    gl: string
    appInstallData: string
  } | null {
    const ytcfg = (window as any).ytcfg
    const fromYtcfg = (name: string): string => {
      try {
        const value = ytcfg?.get?.(name) || ytcfg?.data_?.[name]
        if (typeof value === "string") return value
        if (typeof value === "number") return String(value)
      } catch (_error) {
        // fall through to script parsing
      }
      return ""
    }

    const scriptsText = Array.from(document.querySelectorAll("script"))
      .map((script) => script.textContent || "")
      .join("\n")

    const fromScripts = (name: string): string => {
      const match = scriptsText.match(
        new RegExp(`"${name}"\\s*:\\s*"((?:\\\\.|[^"])*)"`)
      )
      if (!match?.[1]) return ""

      try {
        return JSON.parse(`"${match[1]}"`)
      } catch (_error) {
        return match[1]
      }
    }

    const getValue = (name: string, fallback = "") =>
      fromYtcfg(name) || fromScripts(name) || fallback

    const apiKey = getValue("INNERTUBE_API_KEY")
    const clientVersion = getValue("INNERTUBE_CLIENT_VERSION")
    if (!apiKey || !clientVersion) return null

    return {
      apiKey,
      clientVersion,
      clientName: getValue("INNERTUBE_CONTEXT_CLIENT_NAME", "WEB"),
      visitorData: getValue("VISITOR_DATA"),
      hl: getValue("INNERTUBE_CONTEXT_HL", "en"),
      gl: getValue("INNERTUBE_CONTEXT_GL", "US"),
      appInstallData: getValue("SERIALIZED_CLIENT_CONFIG_DATA")
    }
  }

  private extractBalancedJson(text: string, startIndex: number): string {
    let depth = 0
    let inString = false
    let escaped = false

    for (let i = startIndex; i < text.length; i++) {
      const char = text[i]

      if (escaped) {
        escaped = false
        continue
      }

      if (char === "\\") {
        escaped = true
        continue
      }

      if (char === '"') {
        inString = !inString
        continue
      }

      if (inString) continue

      if (char === "{") depth++
      if (char === "}") {
        depth--
        if (depth === 0) {
          return text.slice(startIndex, i + 1)
        }
      }
    }

    return ""
  }

  private getCaptionTracks(playerResponse: any | null): any[] {
    return (
      playerResponse?.captions?.playerCaptionsTracklistRenderer
        ?.captionTracks || []
    )
  }

  private selectPreferredCaptionTrack(tracks: any[]): any {
    const preferredLanguageCodes = [
      "zh-Hans",
      "zh-CN",
      "zh",
      "zh-Hant",
      "en"
    ]

    return (
      preferredLanguageCodes
        .map((code) => tracks.find((track) => track.languageCode === code))
        .find(Boolean) ||
      tracks.find((track) => track.kind !== "asr") ||
      tracks[0]
    )
  }

  private requiresPoToken(url: string): boolean {
    try {
      const subtitleUrl = new URL(url)
      return (
        subtitleUrl.searchParams.get("exp") === "xpe" &&
        !subtitleUrl.searchParams.has("pot")
      )
    } catch (_error) {
      return /[?&]exp=xpe(?:&|$)/.test(url) && !/[?&]pot=/.test(url)
    }
  }

  private async fetchSubtitlesFromPerformance(
    withTimestamp: boolean,
    videoUrl?: string,
    waitMs: number = 3000
  ): Promise<string> {
    const urls = await this.waitForSubtitleUrlsFromPerformance(waitMs)
    if (urls.length === 0) {
      console.log("[Memflow YouTube] Performance API 未发现可用字幕 URL")
      return ""
    }

    console.log(
      "[Memflow YouTube] Performance API 发现字幕 URL:",
      urls.length
    )

    for (const url of urls) {
      const subtitles = await this.fetchSubtitleFromUrl(
        url,
        withTimestamp,
        videoUrl
      )
      if (subtitles) {
        console.log("[Memflow YouTube] 从 Performance 字幕 URL 获取成功")
        return subtitles
      }
    }

    return ""
  }

  private async waitForSubtitleUrlsFromPerformance(
    waitMs: number
  ): Promise<string[]> {
    const startedAt = Date.now()
    let loggedWaiting = false

    while (Date.now() - startedAt <= waitMs) {
      const urls = this.getSubtitleUrlsFromPerformance()
      if (urls.length > 0) return urls

      if (!loggedWaiting) {
        console.log("[Memflow YouTube] 等待 Performance 字幕 URL...")
        loggedWaiting = true
      }

      await this.delay(300)
    }

    return this.getSubtitleUrlsFromPerformance()
  }

  private getSubtitleUrlsFromPerformance(): string[] {
    try {
      const entries = performance.getEntriesByType("resource")
      const urls = entries
        .map((entry) => entry.name)
        .filter((url) => {
          if (!url.includes("/api/timedtext")) return false
          try {
            const parsedUrl = new URL(url)
            const videoId = this.extractVideoId()
            if (videoId && parsedUrl.searchParams.get("v") !== videoId) {
              return false
            }
            return (
              parsedUrl.searchParams.has("pot") ||
              parsedUrl.searchParams.has("fmt") ||
              parsedUrl.searchParams.has("lang")
            )
          } catch (_error) {
            return false
          }
        })

      return Array.from(new Set(urls)).reverse()
    } catch (error) {
      console.log("[Memflow YouTube] 读取 Performance 字幕 URL 失败:", error)
      return []
    }
  }

  private async fetchSubtitlesFromAndroidPlayer(
    withTimestamp: boolean,
    videoUrl?: string
  ): Promise<string> {
    const videoId = this.extractVideoId()
    const config = this.getYouTubeConfig()
    if (!videoId || !config?.apiKey) return ""

    try {
      const response = await fetch(
        `https://www.youtube.com/youtubei/v1/player?key=${config.apiKey}&prettyPrint=false`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "X-YouTube-Client-Name": "3",
            "X-YouTube-Client-Version": "20.10.38"
          },
          body: JSON.stringify({
            context: {
              client: {
                clientName: "ANDROID",
                clientVersion: "20.10.38",
                hl: config.hl,
                gl: config.gl
              }
            },
            videoId
          })
        }
      )

      if (!response.ok) {
        console.log(
          "[Memflow YouTube] Android player API 返回异常:",
          response.status
        )
        return ""
      }

      const data = await response.json()
      const tracks = this.getCaptionTracks(data)
      if (tracks.length === 0) {
        console.log("[Memflow YouTube] Android player API 未返回字幕轨道")
        return ""
      }

      console.log(
        "[Memflow YouTube] Android player API 获取到字幕轨道:",
        tracks.length
      )

      const usableTracks = tracks.filter(
        (track) => track.baseUrl && !this.requiresPoToken(track.baseUrl)
      )
      const preferredTrack = this.selectPreferredCaptionTrack(
        usableTracks.length > 0 ? usableTracks : tracks
      )
      if (!preferredTrack?.baseUrl || this.requiresPoToken(preferredTrack.baseUrl)) {
        console.log("[Memflow YouTube] Android 字幕轨道仍需要 PO token")
        return ""
      }

      return this.fetchSubtitleFromUrl(
        preferredTrack.baseUrl,
        withTimestamp,
        videoUrl
      )
    } catch (error) {
      console.error("[Memflow YouTube] Android player API 获取字幕失败:", error)
      return ""
    }
  }

  private async fetchTranscriptFromInnertube(
    withTimestamp: boolean,
    videoUrl?: string
  ): Promise<string> {
    const initialData = this.getInitialData()
    const params = this.findTranscriptParams(initialData)
    if (!params) {
      console.log("[Memflow YouTube] ytInitialData 中未找到 transcript 参数")
      return ""
    }

    const config = this.getYouTubeConfig()
    if (!config) {
      console.log("[Memflow YouTube] 未找到 Innertube 配置，无法调用 transcript API")
      return ""
    }

    try {
      const client: Record<string, any> = {
        clientName: config.clientName,
        clientVersion: config.clientVersion,
        hl: config.hl,
        gl: config.gl,
        visitorData: config.visitorData,
        userAgent: navigator.userAgent
      }

      if (config.appInstallData) {
        client.configInfo = {
          appInstallData: config.appInstallData
        }
      }

      const response = await fetch(
        `https://www.youtube.com/youtubei/v1/get_transcript?key=${config.apiKey}&prettyPrint=false`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Visitor-Id": config.visitorData,
            "X-YouTube-Client-Name": "1",
            "X-YouTube-Client-Version": config.clientVersion
          },
          body: JSON.stringify({
            context: {
              client
            },
            params
          })
        }
      )

      if (!response.ok) {
        console.log(
          "[Memflow YouTube] transcript API 返回异常:",
          response.status
        )
        return ""
      }

      const data = await response.json()
      const subtitles = this.parseTranscriptResponse(
        data,
        withTimestamp,
        videoUrl
      )
      if (subtitles) {
        console.log(
          "[Memflow YouTube] 从 transcript API 获取字幕成功，长度:",
          subtitles.length
        )
      }
      return subtitles
    } catch (error) {
      console.error("[Memflow YouTube] transcript API 获取失败:", error)
      return ""
    }
  }

  private findTranscriptParams(initialData: any): string {
    let found = ""

    const visit = (value: any, depth = 0) => {
      if (found || !value || typeof value !== "object" || depth > 18) return

      const params = value.getTranscriptEndpoint?.params
      if (typeof params === "string" && params) {
        found = params
        return
      }

      if (Array.isArray(value)) {
        value.forEach((item) => visit(item, depth + 1))
        return
      }

      Object.values(value).forEach((child) => visit(child, depth + 1))
    }

    visit(initialData)
    return found
  }

  private parseTranscriptResponse(
    data: any,
    withTimestamp: boolean,
    videoUrl?: string
  ): string {
    const segments: any[] = []

    const visit = (value: any, depth = 0) => {
      if (!value || typeof value !== "object" || depth > 24) return

      if (value.transcriptSegmentRenderer) {
        segments.push(value.transcriptSegmentRenderer)
      }

      if (Array.isArray(value)) {
        value.forEach((item) => visit(item, depth + 1))
        return
      }

      Object.values(value).forEach((child) => visit(child, depth + 1))
    }

    visit(data)

    return segments
      .map((segment) => {
        const text = Array.isArray(segment.snippet?.runs)
          ? segment.snippet.runs.map((run: any) => run.text || "").join("")
          : segment.snippet?.simpleText || ""
        const normalizedText = text.replace(/\s+/g, " ").trim()
        if (!normalizedText) return ""

        if (withTimestamp && segment.startMs && videoUrl) {
          const seconds = Math.floor(parseInt(segment.startMs) / 1000)
          return `${this.formatTimestampWithLink(seconds, videoUrl)} ${normalizedText}`
        }

        return normalizedText
      })
      .filter(Boolean)
      .join("\n")
  }

  private async openTranscriptPanelAndExtract(
    withTimestamp: boolean,
    videoUrl?: string
  ): Promise<string> {
    const existingTranscript = this.extractTranscriptPanelFromDOM(
      withTimestamp,
      videoUrl
    )
    if (existingTranscript) {
      console.log("[Memflow YouTube] 从 transcript 面板提取字幕成功")
      return existingTranscript
    }

    const buttons = Array.from(
      document.querySelectorAll("button, yt-button-shape button, a")
    ) as HTMLElement[]

    const transcriptButton = buttons.find((button) => {
      const text = button.textContent?.replace(/\s+/g, " ").trim() || ""
      const ariaLabel = button.getAttribute("aria-label") || ""
      return (
        /show transcript/i.test(text) ||
        /show transcript/i.test(ariaLabel) ||
        text.includes("显示文字稿") ||
        text.includes("显示转录") ||
        text.includes("文字稿")
      )
    })

    if (!transcriptButton) {
      console.log("[Memflow YouTube] 页面中未找到 transcript 打开按钮")
      return ""
    }

    transcriptButton.click()
    await this.delay(1200)

    const transcript = this.extractTranscriptPanelFromDOM(
      withTimestamp,
      videoUrl
    )
    if (transcript) {
      console.log("[Memflow YouTube] 自动打开 transcript 面板并提取成功")
    }
    return transcript
  }

  private extractTranscriptPanelFromDOM(
    withTimestamp: boolean,
    videoUrl?: string
  ): string {
    const segmentSelectors = [
      "ytd-transcript-segment-renderer",
      "yt-transcript-segment-renderer",
      "[class*='transcript-segment-renderer']"
    ]

    for (const selector of segmentSelectors) {
      const segments = Array.from(document.querySelectorAll(selector))
      if (segments.length === 0) continue

      const lines = segments
        .map((segment) => {
          const timestampText =
            segment.querySelector(".segment-timestamp")?.textContent?.trim() ||
            segment
              .querySelector("[class*='timestamp']")
              ?.textContent?.trim() ||
            ""
          const text =
            segment.querySelector(".segment-text")?.textContent?.trim() ||
            segment.querySelector("yt-formatted-string")?.textContent?.trim() ||
            segment.textContent?.replace(timestampText, "").trim() ||
            ""
          const normalizedText = text.replace(/\s+/g, " ").trim()
          if (!normalizedText) return ""

          if (withTimestamp && timestampText && videoUrl) {
            const seconds = this.parseTimeToSeconds(timestampText)
            return `${this.formatTimestampWithLink(seconds, videoUrl)} ${normalizedText}`
          }

          return normalizedText
        })
        .filter(Boolean)

      if (lines.length > 0) return lines.join("\n")
    }

    return ""
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
      window.setTimeout(resolve, ms)
    })
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
      const subtitleUrls = this.buildSubtitleUrlCandidates(url)

      for (const subtitleUrl of subtitleUrls) {
        console.log("[Memflow YouTube] 获取字幕 URL:", subtitleUrl)
        const response = await fetch(subtitleUrl, {
          credentials: "include"
        })
        const subtitleText = await response.text()

        if (!response.ok || !subtitleText.trim()) {
          console.log(
            "[Memflow YouTube] 字幕 URL 返回为空或异常:",
            response.status,
            subtitleText.length
          )
          continue
        }

        const jsonSubtitles = this.parseJson3Subtitles(
          subtitleText,
          withTimestamp,
          videoUrl
        )
        if (jsonSubtitles) {
          console.log(
            "[Memflow YouTube] JSON 字幕获取成功，长度:",
            jsonSubtitles.length
          )
          return jsonSubtitles
        }

        const vttSubtitles = this.parseVttSubtitles(
          subtitleText,
          withTimestamp,
          videoUrl
        )
        if (vttSubtitles) {
          console.log("[Memflow YouTube] VTT 字幕获取成功，长度:", vttSubtitles.length)
          return vttSubtitles
        }

        // 解析 TTML/XML 格式字幕
        const subtitles = this.parseTTMLSubtitles(
          subtitleText,
          withTimestamp,
          videoUrl
        )
        if (subtitles) {
          console.log("[Memflow YouTube] 字幕获取成功，长度:", subtitles.length)
          return subtitles
        }
      }
    } catch (error) {
      console.error("[Memflow YouTube] 获取字幕失败:", error)
    }
    return ""
  }

  private buildSubtitleUrlCandidates(url: string): string[] {
    const variants = [url]

    try {
      const baseUrl = new URL(url)
      baseUrl.searchParams.delete("fmt")
      variants.push(baseUrl.toString())

      ;["json3", "srv3", "ttml", "vtt"].forEach((format) => {
        const formattedUrl = new URL(baseUrl.toString())
        formattedUrl.searchParams.set("fmt", format)
        variants.push(formattedUrl.toString())
      })
    } catch (_error) {
      // keep original url only
    }

    return Array.from(new Set(variants))
  }

  private parseVttSubtitles(
    vttText: string,
    withTimestamp: boolean,
    videoUrl?: string
  ): string {
    if (!vttText.includes("WEBVTT")) return ""

    const lines: string[] = []
    const blocks = vttText.split(/\n\s*\n/)

    blocks.forEach((block) => {
      const blockLines = block
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
      const timeLine = blockLines.find((line) => line.includes("-->"))
      if (!timeLine) return

      const text = blockLines
        .filter((line) => !line.includes("-->") && !/^\d+$/.test(line))
        .join(" ")
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim()
      if (!text) return

      if (withTimestamp && videoUrl) {
        const seconds = this.parseTimeToSeconds(timeLine.split("-->")[0].trim())
        lines.push(`${this.formatTimestampWithLink(seconds, videoUrl)} ${text}`)
      } else {
        lines.push(text)
      }
    })

    return lines.join("\n")
  }

  private parseJson3Subtitles(
    rawText: string,
    withTimestamp: boolean,
    videoUrl?: string
  ): string {
    try {
      const data = JSON.parse(rawText)
      const events = Array.isArray(data?.events) ? data.events : []
      const lines = events
        .map((event: any) => {
          const text = Array.isArray(event.segs)
            ? event.segs.map((seg: any) => seg.utf8 || "").join("")
            : ""
          const normalizedText = text.replace(/\s+/g, " ").trim()
          if (!normalizedText) return ""

          if (withTimestamp && typeof event.tStartMs === "number" && videoUrl) {
            const seconds = Math.floor(event.tStartMs / 1000)
            return `${this.formatTimestampWithLink(seconds, videoUrl)} ${normalizedText}`
          }

          return normalizedText
        })
        .filter(Boolean)

      return lines.join("\n")
    } catch (_error) {
      return ""
    }
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
    const timestampUrl = this.buildTimestampUrl(videoUrl, seconds)
    return `[${timeStr}](${timestampUrl})`
  }

  private buildTimestampUrl(videoUrl: string, seconds: number): string {
    try {
      const url = new URL(videoUrl, window.location.href)
      const currentVideoId = this.extractVideoId()

      if (
        currentVideoId &&
        (url.hostname.includes("youtube.com") || url.hostname.includes("youtu.be"))
      ) {
        if (url.pathname.startsWith("/shorts/")) {
          url.pathname = "/watch"
          url.search = ""
          url.searchParams.set("v", currentVideoId)
        } else if (url.hostname.includes("youtu.be")) {
          url.hostname = "www.youtube.com"
          url.pathname = "/watch"
          url.search = ""
          url.searchParams.set("v", currentVideoId)
        } else if (!url.searchParams.get("v")) {
          url.searchParams.set("v", currentVideoId)
        }
      }

      url.searchParams.delete("time_continue")
      url.searchParams.delete("start")
      url.searchParams.set("t", `${Math.floor(seconds)}s`)
      return url.toString()
    } catch (_error) {
      const separator = videoUrl.includes("?") ? "&" : "?"
      return `${videoUrl}${separator}t=${Math.floor(seconds)}s`
    }
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

    if (typeof subtitles === "string") {
      const jsonSubtitles = this.parseJson3Subtitles(
        subtitles,
        withTimestamp,
        videoUrl
      )
      if (jsonSubtitles) return jsonSubtitles

      const vttSubtitles = this.parseVttSubtitles(
        subtitles,
        withTimestamp,
        videoUrl
      )
      if (vttSubtitles) return vttSubtitles

      const xmlSubtitles = this.parseTTMLSubtitles(
        subtitles,
        withTimestamp,
        videoUrl
      )
      if (xmlSubtitles) return xmlSubtitles
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

          if (
            contentType.includes("xml") ||
            contentType.includes("text") ||
            contentType.includes("json") ||
            url.includes("/api/timedtext")
          ) {
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
              if (text && text.length > 0 && !store.__memflowYouTubeSubtitleCache) {
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
