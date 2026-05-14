import type { Conversation, Message } from "../../types"
import { BaseAdapter } from "./base-adapter"
import type { SelectorConfig } from "./base-adapter"

export interface WebPageMetadata {
  title: string
  author: string
  description: string
  coverImage: string
  publishDate: string
  siteName: string
  url: string
}

export interface Highlight {
  id: string
  text: string
  note?: string
  timestamp: Date
  color: string
}

interface CandidateScore {
  element: Element
  score: number
}

interface JsonLdMetadata {
  title?: string
  description?: string
  image?: string
  siteName?: string
  publishDate?: string
  author?: string
}

const HIGHLIGHT_COLORS = [
  { name: "黄色", value: "yellow", bg: "rgba(255, 255, 0, 0.3)" },
  { name: "绿色", value: "green", bg: "rgba(0, 255, 0, 0.3)" },
  { name: "蓝色", value: "blue", bg: "rgba(0, 0, 255, 0.3)" },
  { name: "粉色", value: "pink", bg: "rgba(255, 192, 203, 0.3)" },
  { name: "橙色", value: "orange", bg: "rgba(255, 165, 0, 0.3)" }
]

const STORAGE_KEY = "memflow_highlights"
const MAX_CONTENT_LENGTH = 100000

const NOISE_SELECTORS = [
  "script",
  "style",
  "noscript",
  "nav",
  "header",
  "footer",
  "aside",
  "form",
  "button",
  "iframe",
  "dialog",
  "[role='navigation']",
  "[role='banner']",
  "[role='complementary']",
  "[role='search']",
  "[role='dialog']",
  ".sidebar",
  ".advertisement",
  ".ad",
  ".ads",
  ".comments",
  ".comment",
  ".social-share",
  ".share",
  ".popup",
  ".modal",
  ".dialog",
  ".toc",
  ".table-of-contents",
  ".author-card",
  ".author-bio",
  ".subscription",
  ".newsletter",
  ".reaction",
  "[class*='reaction']",
  ".like-button",
  "[class*='like-btn']",
  ".vote",
  ".emotion",
  "[class*='emoji']",
  "[class*='icon-reward']",
  "[data-type='like']",
  "[data-type='reward']",
  ".fixed-bar",
  ".float-bar",
  "[class*='fixed-']",
  "[class*='float-']",
  "#comments",
  ".comments-area",
  "[class*='comment-area']",
  ".recommended",
  "[class*='recommend']",
  ".related",
  ".relevant",
  ".pagination",
  ".post-navigation",
  ".nav-links",
  ".prev-next",
  ".entry-footer",
  ".post-footer",
  ".article-footer",
  ".read-more",
  ".more-link"
]

const NOISE_TEXT_PATTERNS = [
  /上一篇/,
  /下一篇/,
  /上一篇.*下一篇/s,
  /喜欢作者/,
  /祝你每天好心情/,
  /推荐阅读/,
  /相关阅读/,
  /相关文章/,
  /更多推荐/,
  /继续阅读/,
  /目录\s*≡?/,
  /评论区?/,
  /点赞/,
  /打赏/,
  /分享本文/,
  /继续访问/,
  /知道了/,
  /微信扫一扫/,
  /使用小程序/,
  /当前内容可能存在未经审核的第三方商业营销信息/,
  /微信公众平台广告规范指引/,
  /向上滑动看下一个/,
  /允许/,
  /取消/,
  /空格的键盘/
]

function getHighlights(): Highlight[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY + "_" + window.location.href)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function saveHighlights(highlights: Highlight[]): void {
  try {
    localStorage.setItem(STORAGE_KEY + "_" + window.location.href, JSON.stringify(highlights))
  } catch (e) {
    console.error("[SmartClip] Failed to save highlights:", e)
  }
}

/**
 * SmartClip 通用网页适配器
 * 支持从任意网页提取内容保存到笔记
 */
export class SmartClipAdapter extends BaseAdapter {
  platformName = "SmartClip"
  selectors: SelectorConfig = {
    inputBox: "",
    sendButton: "",
    messageContainer: "article, main, [role='main'], .content, #content, .post-content, .article-content, .entry-content",
    userMessage: "",
    aiMessage: ""
  }

  detectPlatform(): boolean {
    return true
  }

  private extractMetadata(): WebPageMetadata {
    const jsonLd = this.extractJsonLdMetadata()

    const metadata: WebPageMetadata = {
      title: this.extractTitle(jsonLd),
      author: this.extractAuthor(jsonLd),
      description: this.extractDescription(jsonLd),
      coverImage: this.extractCoverImage(jsonLd),
      publishDate: this.extractPublishDate(jsonLd),
      siteName: this.extractSiteName(jsonLd),
      url: window.location.href
    }
    return metadata
  }

  private getMetaContent(selectors: string[]): string {
    for (const selector of selectors) {
      const content = document
        .querySelector(selector)
        ?.getAttribute("content")
        ?.trim()

      if (content) {
        return content
      }
    }

    return ""
  }

  private toAbsoluteUrl(url: string): string {
    if (!url) {
      return ""
    }

    try {
      return new URL(url, window.location.href).toString()
    } catch {
      return url
    }
  }

  private extractTitle(jsonLd: JsonLdMetadata = {}): string {
    const metaTitle = this.getMetaContent([
      "meta[property='og:title']",
      "meta[name='twitter:title']"
    ])
    if (metaTitle) {
      return metaTitle
    }

    if (jsonLd.title) {
      return jsonLd.title
    }

    const selectors = [
      "h1",
      "[itemprop='headline']",
      "article h1",
      ".post-title",
      ".entry-title",
      ".article-title",
      "title"
    ]
    
    for (const selector of selectors) {
      const el = document.querySelector(selector)
      if (el) {
        const text = el.textContent?.trim()
        if (text) return text
      }
    }
    return document.title || "未命名"
  }

  private extractAuthor(jsonLd: JsonLdMetadata = {}): string {
    const metaAuthor = this.getMetaContent([
      "meta[name='author']",
      "meta[property='article:author']"
    ])
    if (metaAuthor) {
      return metaAuthor
    }

    if (jsonLd.author) {
      return jsonLd.author
    }

    const selectors = [
      "[itemprop='author']",
      "[rel='author']",
      ".author",
      ".byline",
      "[class*='author']"
    ]
    
    for (const selector of selectors) {
      const el = document.querySelector(selector)
      if (el) {
        const text = el.textContent?.trim()
        if (text) return text.replace(/^by\s+/i, "")
      }
    }
    return ""
  }

  private extractDescription(jsonLd: JsonLdMetadata = {}): string {
    const metaDescription = this.getMetaContent([
      "meta[property='og:description']",
      "meta[name='twitter:description']",
      "meta[name='description']"
    ])
    if (metaDescription) {
      return metaDescription
    }

    if (jsonLd.description) {
      return jsonLd.description
    }

    const selectors = [
      "[itemprop='description']",
      ".description",
      ".excerpt",
      ".summary"
    ]
    
    for (const selector of selectors) {
      const el = document.querySelector(selector)
      if (el) {
        const text = el.textContent?.trim()
        if (text) return text.slice(0, 500)
      }
    }
    return ""
  }

  private extractCoverImage(jsonLd: JsonLdMetadata = {}): string {
    const metaImage = this.getMetaContent([
      "meta[property='og:image']",
      "meta[name='twitter:image']"
    ])
    if (metaImage) {
      return this.toAbsoluteUrl(metaImage)
    }

    if (jsonLd.image) {
      return this.toAbsoluteUrl(jsonLd.image)
    }

    const selectors = [
      "[itemprop='image']",
      "article img",
      ".featured-image img",
      ".post-thumbnail img"
    ]
    
    for (const selector of selectors) {
      const el = document.querySelector(selector)
      if (el) {
        const src = el.getAttribute("src") || el.getAttribute("data-src")
        if (src) return this.toAbsoluteUrl(src)
      }
    }
    return ""
  }

  private extractPublishDate(jsonLd: JsonLdMetadata = {}): string {
    const metaDate = this.getMetaContent([
      "meta[property='article:published_time']",
      "meta[name='article:published_time']"
    ])
    if (metaDate) {
      return metaDate
    }

    if (jsonLd.publishDate) {
      return jsonLd.publishDate
    }

    const selectors = [
      "time[datetime]",
      "[itemprop='datePublished']",
      "article time",
      ".publish-date",
      ".post-date",
      ".date"
    ]
    
    for (const selector of selectors) {
      const el = document.querySelector(selector)
      if (el) {
        if (el.hasAttribute("datetime")) {
          return el.getAttribute("datetime") || ""
        }
        const text = el.textContent?.trim()
        if (text) return text
      }
    }
    return new Date().toISOString()
  }

  private extractSiteName(jsonLd: JsonLdMetadata = {}): string {
    const metaSiteName = this.getMetaContent(["meta[property='og:site_name']"])
    if (metaSiteName) {
      return metaSiteName
    }

    if (jsonLd.siteName) {
      return jsonLd.siteName
    }

    return window.location.hostname.replace("www.", "")
  }

  extractConversation(): Conversation {
    const metadata = this.extractMetadata()
    const messages: Message[] = []

    const content = this.extractMainContent()
    
    if (content) {
      messages.push({
        role: "assistant",
        content,
        timestamp: new Date()
      })
    }

    return {
      id: crypto.randomUUID(),
      platform: this.platformName,
      url: window.location.href,
      title: metadata.title,
      messages,
      createdAt: new Date()
    }
  }

  private extractMainContent(): string {
    const bestRoot = this.findBestContentRoot()
    const contentRoot = bestRoot || document.body

    if (!contentRoot) {
      return ""
    }

    const structuredContent = this.extractStructuredContent(contentRoot)
    if (structuredContent.length >= 200) {
      return structuredContent.slice(0, MAX_CONTENT_LENGTH)
    }

    return this.cleanContent(contentRoot).slice(0, MAX_CONTENT_LENGTH)
  }

  private findBestContentRoot(): Element | null {
    const candidateSelectors = [
      { selector: "article", priority: 120 },
      { selector: "main", priority: 100 },
      { selector: "[role='main']", priority: 90 },
      {
        selector:
          ".post-content, .article-content, .entry-content, .article-body, .article__content, #content, .main-content",
        priority: 75
      }
    ]

    const candidates: CandidateScore[] = []
    const seen = new Set<Element>()

    candidateSelectors.forEach(({ selector, priority }) => {
      document.querySelectorAll(selector).forEach((element) => {
        if (seen.has(element)) {
          return
        }

        const score = this.scoreContentCandidate(element, priority)
        if (score > 0) {
          candidates.push({ element, score })
          seen.add(element)
        }
      })
    })

    this.collectHeuristicCandidates(seen).forEach((candidate) => {
      candidates.push(candidate)
    })

    candidates.sort((first, second) => second.score - first.score)
    return candidates[0]?.element || null
  }

  private collectHeuristicCandidates(seen: Set<Element>): CandidateScore[] {
    const heuristicCandidates: CandidateScore[] = []
    const elements = Array.from(
      document.querySelectorAll("section, div, article, main")
    )

    elements.forEach((element) => {
      if (seen.has(element)) {
        return
      }

      const score = this.scoreContentCandidate(element, 0)
      if (score > 120) {
        heuristicCandidates.push({ element, score })
      }
    })

    return heuristicCandidates
  }

  private scoreContentCandidate(element: Element, priorityBoost: number): number {
    if (this.isLikelyNoiseElement(element)) {
      return 0
    }

    const text = this.normalizeTextContent(element.textContent || "")
    if (text.length < 120) {
      return 0
    }

    const htmlLength = element.innerHTML.length || 1
    const density = text.length / htmlLength
    const paragraphCount = element.querySelectorAll("p").length
    const headingCount = element.querySelectorAll("h1, h2, h3, h4, h5, h6").length
    const articleNodes = element.querySelectorAll("article").length
    const mediaCount = element.querySelectorAll("img, figure, video").length
    const linkTextLength = Array.from(element.querySelectorAll("a")).reduce(
      (total, anchor) => total + this.normalizeTextContent(anchor.textContent || "").length,
      0
    )
    const linkPenaltyRatio = text.length > 0 ? linkTextLength / text.length : 0

    let score = priorityBoost
    score += text.length * 0.12
    score += density * 120
    score += paragraphCount * 18
    score += headingCount * 14
    score += mediaCount * 4
    score += articleNodes * 10
    score -= Math.max(0, linkPenaltyRatio - 0.45) * 180

    if (this.containsNoisePattern(text)) {
      score -= 120
    }

    return score
  }

  private cleanContent(element: Element): string {
    const clone = element.cloneNode(true) as Element

    NOISE_SELECTORS.forEach(selector => {
      try {
        clone.querySelectorAll(selector).forEach(el => el.remove())
      } catch (e) {}
    })

    this.pruneNoiseSubtrees(clone)

    return this.processElementToMarkdown(clone)
  }

  private normalizeTextContent(text: string): string {
    return text.replace(/\s+/g, " ").trim()
  }

  private containsNoisePattern(text: string): boolean {
    return NOISE_TEXT_PATTERNS.some((pattern) => pattern.test(text))
  }

  private isLikelyNoiseElement(element: Element): boolean {
    if (
      element.matches(NOISE_SELECTORS.join(", ")) ||
      element.getAttribute("aria-hidden") === "true"
    ) {
      return true
    }

    const className = (element.getAttribute("class") || "").toLowerCase()
    const id = (element.getAttribute("id") || "").toLowerCase()
    const marker = `${className} ${id}`
    const role = (element.getAttribute("role") || "").toLowerCase()
    const text = this.normalizeTextContent(element.textContent || "")
    const anchors = Array.from(element.querySelectorAll("a"))
    const javascriptLinks = anchors.filter((anchor) => {
      const href = (anchor.getAttribute("href") || "").trim().toLowerCase()
      return href.startsWith("javascript:")
    }).length

    if (role === "dialog" || role === "alertdialog") {
      return true
    }

    if (
      javascriptLinks >= 2 &&
      text.length < 240 &&
      this.containsNoisePattern(text) &&
      element.querySelectorAll("p").length <= 1 &&
      element.querySelectorAll("h1, h2, h3, h4, h5, h6").length <= 1
    ) {
      return true
    }

    if (
      text.length < 180 &&
      this.containsNoisePattern(text) &&
      element.querySelectorAll("button").length + anchors.length >= 2
    ) {
      return true
    }

    return [
      "comment",
      "recommend",
      "related",
      "share",
      "footer",
      "sidebar",
      "pager",
      "nav",
      "subscribe",
      "author-card",
      "overlay",
      "modal",
      "dialog",
      "popup",
      "mask"
    ].some((keyword) => marker.includes(keyword))
  }

  private pruneNoiseSubtrees(root: Element): void {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT)
    const nodes: Element[] = []

    while (walker.nextNode()) {
      nodes.push(walker.currentNode as Element)
    }

    nodes.forEach((node) => {
      if (!node.parentElement) {
        return
      }

      if (this.isLikelyNoiseElement(node)) {
        node.remove()
        return
      }

      const text = this.normalizeTextContent(node.textContent || "")
      if (!text) {
        return
      }

      const anchors = Array.from(node.querySelectorAll("a"))
      const javascriptLinkCount = anchors.filter((anchor) => {
        const href = (anchor.getAttribute("href") || "").trim().toLowerCase()
        return href.startsWith("javascript:") || href.startsWith("void(")
      }).length

      const childCount = node.children.length
      const paragraphCount = node.querySelectorAll("p").length
      const headingCount = node.querySelectorAll("h1, h2, h3, h4, h5, h6").length

      if (
        javascriptLinkCount >= 2 &&
        text.length < 300 &&
        this.containsNoisePattern(text) &&
        paragraphCount <= 1 &&
        headingCount <= 1
      ) {
        node.remove()
        return
      }

      if (
        this.containsNoisePattern(text) &&
        text.length < 500 &&
        paragraphCount <= 1 &&
        headingCount <= 1 &&
        childCount <= 12
      ) {
        node.remove()
      }
    })
  }

  private extractStructuredContent(root: Element): string {
    const headings = Array.from(root.querySelectorAll("h1, h2, h3, h4, h5, h6"))
    if (headings.length === 0) {
      return ""
    }

    const lines: string[] = []

    headings.forEach((heading) => {
      const level = Math.min(Number.parseInt(heading.tagName.slice(1), 10), 4)
      const title = this.normalizeTextContent(heading.textContent || "")

      if (!title || this.containsNoisePattern(title)) {
        return
      }

      lines.push(`${"#".repeat(level)} ${title}`)

      const sectionParts: string[] = []
      let sibling = heading.nextElementSibling

      while (sibling && !/^H[1-6]$/.test(sibling.tagName)) {
        const text = this.cleanContent(sibling)
        if (text && !this.containsNoisePattern(text)) {
          sectionParts.push(text)
        }
        sibling = sibling.nextElementSibling
      }

      if (sectionParts.length > 0) {
        lines.push(sectionParts.join("\n\n"))
      }
    })

    return lines.join("\n\n").trim()
  }

  private extractJsonLdMetadata(): JsonLdMetadata {
    const result: JsonLdMetadata = {}
    const scripts = Array.from(
      document.querySelectorAll("script[type='application/ld+json']")
    )

    const collect = (value: unknown) => {
      if (!value || typeof value !== "object") {
        return
      }

      if (Array.isArray(value)) {
        value.forEach(collect)
        return
      }

      const record = value as Record<string, unknown>

      if (Array.isArray(record["@graph"])) {
        record["@graph"].forEach(collect)
      }

      const type = String(record["@type"] || "").toLowerCase()
      const isContentLike =
        type.includes("article") ||
        type.includes("newsarticle") ||
        type.includes("blogposting") ||
        type.includes("webpage")

      if (isContentLike || !type) {
        const title = typeof record.headline === "string"
          ? record.headline
          : typeof record.name === "string"
            ? record.name
            : ""
        const description =
          typeof record.description === "string" ? record.description : ""
        const publishDate =
          typeof record.datePublished === "string" ? record.datePublished : ""
        const siteName =
          typeof record.publisher === "object" &&
          record.publisher &&
          typeof (record.publisher as Record<string, unknown>).name === "string"
            ? String((record.publisher as Record<string, unknown>).name)
            : ""

        const image = this.extractJsonLdImage(record.image)
        const author = this.extractJsonLdAuthor(record.author)

        if (title && !result.title) result.title = title
        if (description && !result.description) result.description = description
        if (publishDate && !result.publishDate) result.publishDate = publishDate
        if (siteName && !result.siteName) result.siteName = siteName
        if (image && !result.image) result.image = image
        if (author && !result.author) result.author = author
      }
    }

    scripts.forEach((script) => {
      const rawText = script.textContent?.trim()
      if (!rawText) {
        return
      }

      try {
        collect(JSON.parse(rawText))
      } catch (error) {
        console.warn("⚠️ JSON-LD 解析失败:", error)
      }
    })

    return result
  }

  private extractJsonLdImage(imageValue: unknown): string {
    if (typeof imageValue === "string") {
      return imageValue
    }

    if (Array.isArray(imageValue)) {
      const firstImage = imageValue.find((item) => typeof item === "string")
      return typeof firstImage === "string" ? firstImage : ""
    }

    if (imageValue && typeof imageValue === "object") {
      const url = (imageValue as Record<string, unknown>).url
      return typeof url === "string" ? url : ""
    }

    return ""
  }

  private extractJsonLdAuthor(authorValue: unknown): string {
    if (typeof authorValue === "string") {
      return authorValue
    }

    if (Array.isArray(authorValue)) {
      const names = authorValue
        .map((author) => this.extractJsonLdAuthor(author))
        .filter(Boolean)
      return names.join(", ")
    }

    if (authorValue && typeof authorValue === "object") {
      const author = authorValue as Record<string, unknown>
      return typeof author.name === "string" ? author.name : ""
    }

    return ""
  }

  private processElementToMarkdown(element: Element): string {
    const lines: string[] = []
    
    const traverse = (node: Node, inList = false, listType: string = "") => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent?.replace(/\s+/g, " ").trim()
        if (text && !this.shouldIgnoreTextNode(text)) {
          if (inList) {
            lines.push(text)
          } else {
            lines.push(text)
          }
        }
        return
      }
      
      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as Element
        const tagName = el.tagName.toLowerCase()
        
        switch (tagName) {
          case "h1":
            lines.push(`\n\n# ${el.textContent?.trim() || ""}\n\n`)
            break
          case "h2":
            lines.push(`\n\n## ${el.textContent?.trim() || ""}\n\n`)
            break
          case "h3":
            lines.push(`\n\n### ${el.textContent?.trim() || ""}\n\n`)
            break
          case "h4":
          case "h5":
          case "h6":
            lines.push(`\n\n#### ${el.textContent?.trim() || ""}\n\n`)
            break
          case "p":
            const pText = el.textContent?.trim()
            if (pText) {
              lines.push(`\n${pText}\n`)
            }
            break
          case "br":
            lines.push("\n")
            break
          case "hr":
            lines.push("\n---\n")
            break
          case "img":
            const src = el.getAttribute("src") || el.getAttribute("data-src") || el.getAttribute("data-lazy-src")
            const alt = el.getAttribute("alt") || ""
            
            // 过滤掉点赞图标等冗余图片
            const excludePatterns = [
              "reaction", "emoji", "icon-", "like", "vote", "emotion",
              "reward", "thanks", "douyin", "bilibili", "avatar", "头像"
            ]
            const srcLower = src?.toLowerCase() || ""
            const altLower = alt?.toLowerCase() || ""
            const isExcluded = excludePatterns.some(p => 
              srcLower.includes(p.toLowerCase()) || altLower.includes(p.toLowerCase())
            )
            
            if (src && !src.startsWith("data:") && !isExcluded) {
              lines.push(`\n![${alt}](${src})\n`)
            }
            break
          case "a":
            const href = el.getAttribute("href")
            const linkText = el.textContent?.trim() || ""
            if (href?.toLowerCase().startsWith("javascript:")) {
              break
            }
            if (href && linkText && !this.shouldIgnoreTextNode(linkText)) {
              lines.push(`[${linkText}](${href})`)
            } else if (linkText && !this.shouldIgnoreTextNode(linkText)) {
              lines.push(linkText)
            }
            break
          case "strong":
          case "b":
            if (el.textContent?.trim() && !this.shouldIgnoreTextNode(el.textContent.trim())) {
              lines.push(`**${el.textContent.trim()}**`)
            }
            break
          case "em":
          case "i":
            if (el.textContent?.trim() && !this.shouldIgnoreTextNode(el.textContent.trim())) {
              lines.push(`*${el.textContent.trim()}*`)
            }
            break
          case "code":
            if (el.parentElement?.tagName.toLowerCase() === "pre") {
              lines.push(el.textContent || "")
            } else {
              lines.push(`\`${el.textContent?.trim() || ""}\``)
            }
            break
          case "pre":
            const code = el.textContent || ""
            lines.push(`\n\`\`\`\n${code}\n\`\`\`\n`)
            break
          case "blockquote":
            const bqText = el.textContent?.trim().replace(/\n/g, "\n> ") || ""
            lines.push(`\n> ${bqText}\n`)
            break
          case "ul":
            Array.from(el.children).forEach(li => {
              if (li.tagName.toLowerCase() === "li") {
                lines.push(`- ${li.textContent?.trim() || ""}`)
              }
            })
            lines.push("")
            break
          case "ol":
            Array.from(el.children).forEach((li, index) => {
              if (li.tagName.toLowerCase() === "li") {
                lines.push(`${index + 1}. ${li.textContent?.trim() || ""}`)
              }
            })
            lines.push("")
            break
          case "li":
            break
          case "table":
            const rows: string[] = []
            el.querySelectorAll("tr").forEach(tr => {
              const cells: string[] = []
              tr.querySelectorAll("th, td").forEach(cell => {
                cells.push(cell.textContent?.trim() || "")
              })
              if (cells.length > 0) {
                rows.push(cells.join(" | "))
              }
            })
            if (rows.length > 0) {
              lines.push("\n" + rows.join("\n") + "\n")
            }
            break
          case "figure":
            const img = el.querySelector("img")
            if (img) {
              const src = img.getAttribute("src") || img.getAttribute("data-src")
              const alt = img.getAttribute("alt") || el.textContent?.trim() || ""
              if (src && !src.startsWith("data:")) {
                lines.push(`\n![${alt}](${src})\n`)
              }
            }
            break
          case "video":
            const videoSrc = el.getAttribute("src") || el.querySelector("source")?.getAttribute("src")
            if (videoSrc) {
              lines.push(`\n[视频](${videoSrc})\n`)
            }
            break
          case "section":
          case "div":
          case "span":
          case "article":
            Array.from(el.childNodes).forEach(child => traverse(child, inList, listType))
            break
          default:
            Array.from(el.childNodes).forEach(child => traverse(child, inList, listType))
        }
      }
    }

    traverse(element)
    
    let result = lines.join("\n")
    result = result.replace(/\n{3,}/g, "\n\n")
    return result.trim()
  }

  private shouldIgnoreTextNode(text: string): boolean {
    if (!text) {
      return true
    }

    if (/^[*x×#|>_\-]+$/i.test(text)) {
      return true
    }

    return this.containsNoisePattern(text)
  }

  getMetadata(): WebPageMetadata {
    return this.extractMetadata()
  }

  async injectPrompt(_prompt: string): Promise<void> {
    throw new Error("SmartClip does not support prompt injection")
  }

  async waitForResponse(_timeout?: number): Promise<string> {
    throw new Error("SmartClip does not support waiting for response")
  }

  async deleteMessage(_messageId: string): Promise<void> {
    throw new Error("SmartClip does not support message deletion")
  }

  // ===== 高亮功能 =====
  
  getHighlights(): Highlight[] {
    return getHighlights()
  }

  addHighlight(text: string, color = "yellow"): Highlight {
    const highlights = getHighlights()
    const highlight: Highlight = {
      id: crypto.randomUUID(),
      text: text.slice(0, 1000),
      timestamp: new Date(),
      color
    }
    highlights.push(highlight)
    saveHighlights(highlights)
    console.log("[SmartClip] Added highlight:", highlight)
    return highlight
  }

  removeHighlight(id: string): void {
    const highlights = getHighlights().filter(h => h.id !== id)
    saveHighlights(highlights)
  }

  clearHighlights(): void {
    saveHighlights([])
  }

  renderHighlightsOnPage(): void {
    const highlights = getHighlights()
    if (highlights.length === 0) return

    const colorMap: Record<string, string> = {
      yellow: "rgba(255, 255, 0, 0.3)",
      green: "rgba(0, 255, 0, 0.3)",
      blue: "rgba(0, 0, 255, 0.3)",
      pink: "rgba(255, 192, 203, 0.3)",
      orange: "rgba(255, 165, 0, 0.3)"
    }

    highlights.forEach(h => {
      const found = findTextOnPage(h.text)
      if (found) {
        found.forEach(el => {
          el.style.backgroundColor = colorMap[h.color] || colorMap.yellow
          el.dataset.highlightId = h.id
        })
      }
    })
  }
}

function findTextOnPage(text: string): Element[] {
  const results: Element[] = []
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    null
  )
  
  const searchText = text.slice(0, 100)
  
  while (walker.nextNode()) {
    const node = walker.currentNode
    if (node.textContent?.includes(searchText)) {
      const parent = node.parentElement
      if (parent && !parent.dataset.highlightId) {
        results.push(parent)
      }
    }
  }
  
  return results
}

export function createSmartClipAdapter(): SmartClipAdapter {
  return new SmartClipAdapter()
}
