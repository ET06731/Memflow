import type { Conversation, Message } from "../../types"
import { BaseAdapter } from "./base-adapter"
import type { SelectorConfig } from "./base-adapter"

/**
 * BiliBili 视频适配器
 * 提取视频基本信息、字幕内容，用于导出到 Obsidian
 */
export class BiliBiliAdapter extends BaseAdapter {
  platformName = "Bilibili"
  selectors: SelectorConfig = {
    inputBox: "",
    sendButton: "",
    messageContainer: "",
    userMessage: "",
    aiMessage: ""
  }

  /**
   * 检测是否为 B 站支持的页面
   */
  detectPlatform(): boolean {
    const hostname = window.location.host
    const pathname = window.location.pathname

    // 视频页面
    const isVideoPage = pathname.includes("/video/")
    // 稍后看列表
    const isWatchLater = pathname.includes("/list/watchlater")
    // 其他列表页
    const isListPage = pathname.includes("/list/")

    return (
      hostname.includes("bilibili.com") &&
      (isVideoPage || isWatchLater || isListPage)
    )
  }

  /**
   * 判断是否为视频详情页
   */
  isVideoPage(): boolean {
    return window.location.pathname.includes("/video/")
  }

  /**
   * 判断是否为列表页（稍后看等）
   */
  isListPage(): boolean {
    return window.location.pathname.includes("/list/")
  }

  /**
   * 提取 B 站视频/列表信息
   */
  extractConversation(): Conversation {
    const messages: Message[] = []

    // 判断页面类型
    if (this.isListPage()) {
      // 列表页（稍后看等）
      return this.extractListPage()
    } else {
      // 视频详情页
      return this.extractVideoPage()
    }
  }

  /**
   * 提取视频详情页
   */
  private extractVideoPage(): Conversation {
    const messages: Message[] = []

    const videoInfo = this.extractVideoInfo()

    if (!videoInfo.title) {
      console.warn("[Memflow Bilibili] 无法获取视频信息")
    }

    console.log("[Memflow Bilibili] 视频信息:", videoInfo)

    const videoEmbed = videoInfo.bvid
      ? `<iframe width="560" height="315" src="https://player.bilibili.com/player.html?bvid=${videoInfo.bvid}&page=1" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`
      : ""

    const videoMeta = [
      `# ${videoInfo.title}`,
      "",
      "---",
      "",
      videoEmbed ? videoEmbed + "\n" : "",
      "**UP 主**: " + (videoInfo.uploader || "未知"),
      "**发布时间**: " + (videoInfo.publishDate || "未知"),
      "**播放量**: " + videoInfo.views,
      "**点赞**: " + videoInfo.likes,
      "**投币**: " + videoInfo.coins,
      "**收藏**: " + videoInfo.favorites,
      "",
      "**标签**: " +
        (videoInfo.tags.length > 0 ? videoInfo.tags.join(", ") : "无"),
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
   * 提取列表页（稍后看等）
   */
  private extractListPage(): Conversation {
    console.log("[Memflow Bilibili] 检测到列表页，提取视频列表...")

    const videos = this.extractVideoList()

    let title = "B站视频列表"
    if (window.location.pathname.includes("/watchlater")) {
      title = "稍后看"
    }

    const listContent = [
      `# ${title}`,
      "",
      `共 ${videos.length} 个视频`,
      "",
      "---"
    ]

    videos.forEach((video, index) => {
      listContent.push("")
      listContent.push(`### ${index + 1}. ${video.title}`)
      listContent.push(`- **UP主**: ${video.uploader}`)
      listContent.push(`- **播放量**: ${video.views}`)
      listContent.push(`- **链接**: ${video.url}`)
      if (video.description) {
        listContent.push(`- **简介**: ${video.description.slice(0, 100)}...`)
      }
      listContent.push("")
    })

    const messages: Message[] = []
    messages.push({
      role: "user",
      content: listContent.join("\n"),
      timestamp: new Date()
    })

    return {
      id: crypto.randomUUID(),
      title,
      platform: this.platformName,
      url: window.location.href,
      messages,
      createdAt: new Date()
    }
  }

  /**
   * 从列表页提取视频信息
   */
  private extractVideoList(): Array<{
    title: string
    uploader: string
    views: string
    url: string
    description: string
  }> {
    const videos: Array<{
      title: string
      uploader: string
      views: string
      url: string
      description: string
    }> = []

    // 查找视频卡片容器
    const videoSelectors = [
      ".video-card",
      ".video-card-item",
      "[class*='video-card']",
      "[class*='video-list']",
      ".card",
      "[class*='card']",
      "li[data-id]",
      ".clearfix"
    ]

    let videoContainer: Element | null = null

    for (const selector of videoSelectors) {
      const elements = document.querySelectorAll(selector)
      if (elements.length > 0) {
        console.log(
          `[Memflow Bilibili] 找到视频容器: ${selector}, 数量: ${elements.length}`
        )
        videoContainer = elements[0].parentElement
        break
      }
    }

    if (!videoContainer) {
      console.log("[Memflow Bilibili] 未找到视频容器，尝试其他方法")
    }

    // 查找所有视频链接
    const videoLinks = document.querySelectorAll('a[href*="/video/"]')

    console.log(`[Memflow Bilibili] 找到 ${videoLinks.length} 个视频链接`)

    // 去重并提取信息
    const seenUrls = new Set<string>()

    videoLinks.forEach((link) => {
      const href = link.getAttribute("href")
      if (!href || seenUrls.has(href)) return

      seenUrls.add(href)

      const url = href.startsWith("http")
        ? href
        : `https://www.bilibili.com${href}`

      // 查找标题 - 通常在链接内或附近
      let title = ""
      const titleEl =
        link.querySelector("title") ||
        link.querySelector("[class*='title']") ||
        link.closest("[class*='card']")?.querySelector("[class*='title']")
      if (titleEl) {
        title = titleEl.textContent?.trim() || ""
      }

      // 如果没找到，尝试从链接本身获取
      if (!title) {
        title = link.textContent?.trim() || ""
      }

      if (title && title.length < 200) {
        videos.push({
          title: title.slice(0, 100),
          uploader: "未知",
          views: "0",
          url,
          description: ""
        })
      }
    })

    // 尝试获取更多信息（UP主、播放量等）
    videos.forEach((video, index) => {
      // 查找对应的卡片元素
      const linkEl = document.querySelector(
        `a[href*="${video.url.split("/video/")[1]}"]`
      )
      if (linkEl) {
        const card = linkEl.closest("[class*='card']") || linkEl.parentElement

        // UP主
        const upEl =
          card?.querySelector("[class*='up']") ||
          card?.querySelector("[class*='author']")
        if (upEl) {
          video.uploader = upEl.textContent?.trim() || "未知"
        }

        // 播放量
        const viewEl =
          card?.querySelector("[class*='view']") ||
          card?.querySelector("[class*='play']")
        if (viewEl) {
          video.views = viewEl.textContent?.trim() || "0"
        }
      }
    })

    console.log(`[Memflow Bilibili] 提取到 ${videos.length} 个视频`)
    return videos
  }

  /**
   * 提取视频基本信息
   */
  private extractVideoInfo(): {
    title: string
    uploader: string
    uploaderUrl: string
    description: string
    tags: string[]
    views: string
    likes: string
    coins: string
    favorites: string
    shares: string
    publishDate: string
    bvid: string
    aid: string
    cid: string
  } {
    const info = {
      title: "",
      uploader: "",
      uploaderUrl: "",
      description: "",
      tags: [] as string[],
      views: "",
      likes: "",
      coins: "",
      favorites: "",
      shares: "",
      publishDate: "",
      bvid: "",
      aid: "",
      cid: ""
    }

    const urlMatch = window.location.href.match(/\/video\/(BV[\w]+)/)
    if (urlMatch) {
      info.bvid = urlMatch[1]
    } else {
      const params = new URLSearchParams(window.location.search)
      if (params.get("bvid")) {
        info.bvid = params.get("bvid") || ""
      }
    }

    const playInfo = (window as any).__playinfo__
    if (playInfo?.data?.cid) {
      info.cid = playInfo.data.cid
    }

    const initialState = (window as any).__INITIAL_STATE__
    if (initialState?.videoData) {
      const videoData = initialState.videoData
      info.title = videoData.title || ""
      info.description = videoData.desc || ""
      info.aid = String(videoData.aid || "")

      // 处理多-part视频：获取当前part的CID
      const urlParams = new URLSearchParams(window.location.search)
      const currentPart = parseInt(urlParams.get("p") || "1", 10)
      
      // 如果有多个part，从pages数组中获取当前part的CID
      if (videoData.pages && Array.isArray(videoData.pages) && videoData.pages.length > 1) {
        const pageIndex = currentPart - 1
        if (pageIndex >= 0 && pageIndex < videoData.pages.length) {
          info.cid = String(videoData.pages[pageIndex].cid || videoData.cid)
        } else {
          info.cid = String(videoData.cid || "")
        }
      } else {
        info.cid = String(videoData.cid || "")
      }

      if (videoData.owner) {
        info.uploader = videoData.owner.name || ""
        info.uploaderUrl = `https://space.bilibili.com/${videoData.owner.mid || ""}`
      }

      if (videoData.stat) {
        info.views = this.formatNumber(videoData.stat.view || 0)
        info.likes = this.formatNumber(videoData.stat.like || 0)
        info.coins = this.formatNumber(videoData.stat.coin || 0)
        info.favorites = this.formatNumber(videoData.stat.favorite || 0)
        info.shares = this.formatNumber(videoData.stat.share || 0)
      }

      if (videoData.pubdate) {
        info.publishDate = new Date(videoData.pubdate * 1000).toLocaleString(
          "zh-CN"
        )
      }

      if (Array.isArray(videoData.tags)) {
        info.tags = videoData.tags
          .map((t: any) => t?.tag_name || t)
          .filter(Boolean)
      }
    }

    // 从页面 DOM 提取标题（备用方案）
    if (!info.title) {
      const titleSelectors = [
        "h1.video-title",
        "h1.title",
        "[class*='videoTitle']",
        "[class*='video-title']",
        "h1[class*='title']",
        ".bpx-player-title"
      ]

      for (const selector of titleSelectors) {
        const titleEl = document.querySelector(selector)
        if (titleEl) {
          info.title = titleEl.textContent?.trim() || ""
          if (info.title) {
            console.log("[Memflow Bilibili] 标题选择器:", selector)
            break
          }
        }
      }
    }

    // 从页面提取简介（备用方案）
    if (!info.description) {
      const descSelectors = [
        ".desc-info-text", // B站视频页面的简介
        ".video-desc",
        ".desc",
        "[class*='desc-info']",
        "[class*='video-desc']",
        "[data-testid='video-desc']",
        "span.desc-info-text"
      ]

      for (const selector of descSelectors) {
        const descEl = document.querySelector(selector)
        if (descEl) {
          info.description = descEl.textContent?.trim() || ""
          if (info.description) {
            console.log("[Memflow Bilibili] 简介选择器:", selector)
            break
          }
        }
      }
    }

    // 从页面提取 UP 主（备用方案）
    if (!info.uploader) {
      const uploaderSelectors = [
        ".up-name",
        ".upname",
        "[class*='upName']",
        "[class*='uploader-name']",
        "[class*='author-name']",
        ".bpx-player-author"
      ]

      for (const selector of uploaderSelectors) {
        const uploaderEl = document.querySelector(selector)
        if (uploaderEl) {
          info.uploader = uploaderEl.textContent?.trim() || ""
          if (info.uploader) {
            console.log("[Memflow Bilibili] UP主选择器:", selector)
            break
          }
        }
      }
    }

    // 从页面提取标签（备用方案）
    if (info.tags.length === 0) {
      const tagSelectors = [
        ".tag",
        ".video-tag",
        "[class*='tag']",
        ".bpx-player-tag"
      ]

      for (const selector of tagSelectors) {
        const tagEls = document.querySelectorAll(selector)
        if (tagEls.length > 0) {
          info.tags = Array.from(tagEls)
            .map((el) => el.textContent?.trim())
            .filter(Boolean)
          if (info.tags.length > 0) {
            console.log(
              "[Memflow Bilibili] 标签选择器:",
              selector,
              "数量:",
              info.tags.length
            )
            break
          }
        }
      }
    }

    const viewEl = document.querySelector(".view, [class*='view']")
    if (viewEl && !info.views) {
      info.views = viewEl.textContent?.trim() || ""
    }

    return info
  }

  /**
   * 方案 A：在页面内注入 XHR/fetch hook，拦截字幕 JSON 请求并缓存
   * 必须在页面加载早期调用
   */
  installSubtitleHook(): void {
    if ((window as any).__memflowSubtitleHookInstalled) return
    ;(window as any).__memflowSubtitleHookInstalled = true
    ;(window as any).__memflowSubtitleCache = null

    const store = window as any

    // 监听 URL 变化，清除缓存，避免 SPA 页面切换导致读取到上一个视频的字幕
    let lastUrl = location.href
    const checkUrlChange = () => {
      if (location.href !== lastUrl) {
        console.log("[Memflow Bilibili Hook] URL 发生变化，清空字幕缓存")
        lastUrl = location.href
        store.__memflowSubtitleCache = null
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

    // 拦截 XHR
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
          (capturedUrl.includes("/bfs/subtitle/") ||
            capturedUrl.includes("/bfs/ai_subtitle/"))
        ) {
          xhr.addEventListener("load", () => {
            try {
              const json = JSON.parse(xhr.responseText)
              if (json?.body?.length > 0 && !store.__memflowSubtitleCache) {
                console.log(
                  "[Memflow Bilibili Hook] XHR 拦截字幕:",
                  capturedUrl
                )
                store.__memflowSubtitleCache = json.body
              }
            } catch (e) {
              /* ignore */
            }
          })
        }
        return origSend(body)
      }

      return xhr
    } as any

    const origFetch = window.fetch.bind(window)
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : (input as Request).url
      const res = await origFetch(input, init)
      if (
        url &&
        (url.includes("/bfs/subtitle/") || url.includes("/bfs/ai_subtitle/"))
      ) {
        try {
          const clone = res.clone()
          const json = await clone.json()
          if (json?.body?.length > 0 && !store.__memflowSubtitleCache) {
            console.log("[Memflow Bilibili Hook] fetch 拦截字幕:", url)
            store.__memflowSubtitleCache = json.body
          }
        } catch (e) {
          /* ignore */
        }
      }
      return res
    }

    console.log("[Memflow Bilibili] 字幕拦截器已安装")
  }

  /**
   * 将秒数转换为 [mm:ss] 格式
   */
  private formatTimestamp(seconds: number): string {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `[${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}]`
  }

  /**
   * 将秒数转换为带链接的时间戳格式: [mm:ss](url?t=seconds)
   * B站支持 ?t=秒数 参数直接跳转到指定时间
   */
  private formatTimestampWithLink(seconds: number, videoUrl: string): string {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    const timeStr = `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
    const timestampUrl = `${videoUrl}?t=${seconds}`
    return `[${timeStr}](${timestampUrl})`
  }

  private formatSubtitleArray(
    body: any[],
    withTimestamp: boolean,
    videoUrl?: string
  ): string {
    if (!body || !body.length) return ""

    return body
      .map((item: any) => {
        const text = item.content || ""
        if (!text) return ""
        if (withTimestamp && typeof item.from === "number") {
          if (videoUrl) {
            return `${this.formatTimestampWithLink(item.from, videoUrl)} ${text}`
          }
          return `${this.formatTimestamp(item.from)} ${text}`
        }
        return text
      })
      .filter(Boolean)
      .join("\n")
  }

  async getSubtitles(
    withTimestamp: boolean = false,
    videoUrl?: string
  ): Promise<string> {
    const cached = (window as any).__memflowSubtitleCache
    if (cached && Array.isArray(cached) && cached.length > 0) {
      console.log(
        "[Memflow Bilibili] 方案A: 从 hook 缓存获取字幕，条数:",
        cached.length
      )
      return this.formatSubtitleArray(cached, withTimestamp, videoUrl)
    }

    console.log("[Memflow Bilibili] 方案A 未命中，尝试方案 B...")

    // 方案 B：带 Cookie 调用 wbi/v2 API
    const videoInfo = this.extractVideoInfo()
    let aid = videoInfo.aid
    let cid = videoInfo.cid
    const bvid = videoInfo.bvid

    // 如果无法直接获取到 aid / cid，但有 bvid (例如在 watchlater 列表页)，通过 API 兑换
    if ((!aid || !cid) && bvid) {
      try {
        console.log(
          "[Memflow Bilibili] 缺少 aid/cid，尝试通过 bvid 获取:",
          bvid
        )
        const infoRes = await fetch(
          `https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`
        )
        const infoData = await infoRes.json()
        if (infoData?.data?.aid && infoData?.data?.cid) {
          aid = String(infoData.data.aid)
          cid = String(infoData.data.cid)
        }
      } catch (err) {
        console.warn("[Memflow Bilibili] 通过 bvid 获取 aid/cid 失败", err)
      }
    }

    if (aid && cid) {
      console.log(
        "[Memflow Bilibili] 方案B: 尝试 wbi API, aid=",
        aid,
        "cid=",
        cid
      )
      const result = await this.fetchSubtitlesFromApi(
        aid,
        cid,
        withTimestamp,
        videoUrl
      )
      if (result) return result
    } else {
      console.warn("[Memflow Bilibili] 方案B: 无法获取 aid/cid")
    }

    console.log("[Memflow Bilibili] 双保险均未提取到字幕")
    return ""
  }

  /**
   * 从 AI 小助手获取字幕
   */
  private async getSubtitlesFromAIAssistant(): Promise<string> {
    return new Promise((resolve) => {
      console.log("[Memflow Bilibili] 寻找 AI 小助手按钮...")

      // 找到 AI 小助手按钮
      const aiAssistantBtn = this.findAIBotton()

      if (!aiAssistantBtn) {
        console.log("[Memflow Bilibili] 未找到 AI 小助手按钮")
        resolve("")
        return
      }

      console.log("[Memflow Bilibili] 找到 AI 小助手按钮，点击...")
      ;(aiAssistantBtn as HTMLElement).click()

      // 等待 AI 面板加载
      setTimeout(() => {
        const subtitleListBtn = this.findSubtitleListButton()

        if (!subtitleListBtn) {
          console.log("[Memflow Bilibili] 未找到字幕列表按钮")
          this.closeAIPanel()
          resolve("")
          return
        }

        console.log("[Memflow Bilibili] 找到字幕列表按钮，点击...")
        ;(subtitleListBtn as HTMLElement).click()

        // 等待字幕加载
        setTimeout(() => {
          const subtitles = this.extractSubtitlesFromDOM()

          if (subtitles.length > 0) {
            console.log(
              "[Memflow Bilibili] 从 DOM 提取到",
              subtitles.length,
              "条字幕"
            )
            this.closeAIPanel()
            resolve(subtitles.join("\n"))
          } else {
            console.log("[Memflow Bilibili] DOM 中未找到字幕")
            this.closeAIPanel()
            resolve("")
          }
        }, 2000)
      }, 2000)
    })
  }

  /**
   * 找到 AI 小助手按钮
   */
  private findAIBotton(): Element | null {
    // B站新版 AI 助手按钮选择器
    const selectors = [
      // 播放器内的 AI 按钮
      ".bpx-player-ai",
      '[class*="bpx-player-ai"]',
      // 页面上的 AI 小助手
      ".video-ai-assistant",
      '[class*="ai-assistant"]',
      '[class*="ai_assistant"]',
      '[class*="AIassistant"]',
      // 通用
      '[data-aid="ai-assistant"]',
      // 包含 AI 图标的按钮
      "button:has(svg *)",
      // 根据文字查找
      ...Array.from(document.querySelectorAll("span, div, button"))
        .filter((el) => {
          const text = el.textContent || ""
          return (
            text.includes("AI小助手") ||
            text.includes("AI助手") ||
            text.includes("小助手")
          )
        })
        .map((el) => {
          if (el.className && typeof el.className === "string") {
            return el.className
              .split(" ")
              .map((c) => `.${c}`)
              .join("")
          }
          return ""
        })
        .filter(Boolean)
    ]

    for (const selector of selectors) {
      try {
        const el = document.querySelector(selector)
        if (el) {
          console.log("[Memflow Bilibili] AI 按钮选择器:", selector)
          return el
        }
      } catch (e) {
        // ignore
      }
    }

    return null
  }

  /**
   * 找到字幕列表按钮
   */
  private findSubtitleListButton(): Element | null {
    // 等待面板加载完成后再查找
    // B站 AI 面板中的字幕列表按钮
    const selectors = [
      // 文本匹配
      'span:contains("字幕列表")',
      'div:contains("字幕列表")',
      'button:contains("字幕列表")',
      // 根据类名查找
      ...Array.from(document.querySelectorAll("*"))
        .filter((el) => {
          const text = el.textContent || ""
          return text.trim() === "字幕列表"
        })
        .map((el) => {
          if (el.className && typeof el.className === "string") {
            return el.className
              .split(" ")
              .map((c) => `.${c}`)
              .join("")
          }
          return ""
        })
        .filter(Boolean)
    ]

    for (const selector of selectors) {
      try {
        const el = document.querySelector(selector)
        if (el) {
          console.log("[Memflow Bilibili] 字幕列表按钮选择器:", selector)
          return el
        }
      } catch (e) {
        // ignore
      }
    }

    return null
  }

  /**
   * 从页面 DOM 提取字幕
   */
  private extractSubtitlesFromDOM(): string[] {
    const subtitles: string[] = []

    // 查找所有可能包含字幕的元素
    // B站 AI 字幕面板通常包含 时间 + 文本
    const allElements = document.querySelectorAll("*")

    // 匹配时间格式: 00:00 或 00:00:00
    const timeRegex = /(\d{1,2}:\d{2}(?::\d{2})?)\s*[:：]?\s*(.+)/g

    // 获取页面所有文本，查找时间+文本模式
    for (const el of allElements) {
      const text = el.textContent || ""
      const match = text.match(/^(\d{1,2}:\d{2}(?::\d{2})?)\s*[:：]?\s*(.+)$/)
      if (match && match[2].length < 200) {
        subtitles.push(`${match[1]}: ${match[2].trim()}`)
      }
    }

    // 去重并返回
    const unique = [...new Set(subtitles)]
    console.log("[Memflow Bilibili] 提取到候选字幕:", unique.length, "条")

    return unique
  }

  /**
   * 关闭 AI 面板
   */
  private closeAIPanel(): void {
    // 按 ESC 关闭
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }))
    setTimeout(() => {
      document.dispatchEvent(new KeyboardEvent("keyup", { key: "Escape" }))
    }, 100)
  }

  /**
   * 从 URL 获取字幕（方案 A 从 hook 缓存拿到 URL 后调用）
   */
  private async fetchSubtitle(
    url: string,
    withTimestamp: boolean,
    videoUrl?: string
  ): Promise<string> {
    try {
      const fullUrl = url.startsWith("http") ? url : `https:${url}`
      console.log("[Memflow Bilibili] 获取字幕 URL:", fullUrl)

      const response = await fetch(fullUrl)
      const data = await response.json()

      if (data.body && data.body.length > 0) {
        const text = this.formatSubtitleArray(
          data.body,
          withTimestamp,
          videoUrl
        )
        console.log("[Memflow Bilibili] 字幕获取成功，文本长度:", text.length)
        return text
      }
    } catch (error) {
      console.error("[Memflow Bilibili] 获取字幕失败:", error)
    }
    return ""
  }

  private async fetchSubtitlesFromApi(
    aid: string,
    cid: string,
    withTimestamp: boolean,
    videoUrl?: string
  ): Promise<string> {
    const apisToTry = [
      `https://api.bilibili.com/x/player/wbi/v2?cid=${cid}&aid=${aid}`,
      `https://api.bilibili.com/x/player/v2?cid=${cid}&aid=${aid}`
    ]

    for (const url of apisToTry) {
      try {
        console.log("[Memflow Bilibili] 方案B API:", url)
        const response = await fetch(url, {
          credentials: "include",
          headers: {
            Referer: "https://www.bilibili.com",
            "User-Agent": navigator.userAgent
          }
        })

        if (!response.ok) {
          console.warn("[Memflow Bilibili] API 返回非 200:", response.status)
          continue
        }

        const data = await response.json()
        const subtitleList = data.data?.subtitle?.subtitles

        if (!subtitleList || subtitleList.length === 0) {
          console.log("[Memflow Bilibili] API 未返回字幕列表")
          continue
        }

        console.log(
          "[Memflow Bilibili] API 返回字幕列表:",
          subtitleList.map((s: any) => s.lan_doc || s.lang)
        )

        const preferred =
          subtitleList.find(
            (s: any) =>
              s.lang === "zh-CN" ||
              s.lang === "zh" ||
              s.lang === "ai-zh" ||
              s.lan === "zh-CN" ||
              s.lan === "zh" ||
              s.lan === "ai-zh"
          ) || subtitleList[0]

        const subtitleUrl = preferred?.subtitle_url || preferred?.url
        if (subtitleUrl) {
          return await this.fetchSubtitle(subtitleUrl, withTimestamp, videoUrl)
        }
      } catch (error) {
        console.error("[Memflow Bilibili] API 请求失败:", url, error)
      }
    }

    return ""
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
}

/**
 * 创建 BiliBili 适配器实例
 */
export function createBiliBiliAdapter(): BiliBiliAdapter {
  return new BiliBiliAdapter()
}
