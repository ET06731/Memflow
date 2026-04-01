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

const HIGHLIGHT_COLORS = [
  { name: "黄色", value: "yellow", bg: "rgba(255, 255, 0, 0.3)" },
  { name: "绿色", value: "green", bg: "rgba(0, 255, 0, 0.3)" },
  { name: "蓝色", value: "blue", bg: "rgba(0, 0, 255, 0.3)" },
  { name: "粉色", value: "pink", bg: "rgba(255, 192, 203, 0.3)" },
  { name: "橙色", value: "orange", bg: "rgba(255, 165, 0, 0.3)" }
]

const STORAGE_KEY = "memflow_highlights"

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
    const metadata: WebPageMetadata = {
      title: this.extractTitle(),
      author: this.extractAuthor(),
      description: this.extractDescription(),
      coverImage: this.extractCoverImage(),
      publishDate: this.extractPublishDate(),
      siteName: this.extractSiteName(),
      url: window.location.href
    }
    return metadata
  }

  private extractTitle(): string {
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

  private extractAuthor(): string {
    const selectors = [
      "[itemprop='author']",
      "[rel='author']",
      ".author",
      ".byline",
      "[class*='author']",
      "meta[name='author']"
    ]
    
    for (const selector of selectors) {
      const el = document.querySelector(selector)
      if (el) {
        if (selector === "meta[name='author']") {
          return el.getAttribute("content") || ""
        }
        const text = el.textContent?.trim()
        if (text) return text.replace(/^by\s+/i, "")
      }
    }
    return ""
  }

  private extractDescription(): string {
    const selectors = [
      "meta[name='description']",
      "meta[property='og:description']",
      "meta[name='twitter:description']",
      "[itemprop='description']",
      ".description",
      ".excerpt",
      ".summary"
    ]
    
    for (const selector of selectors) {
      const el = document.querySelector(selector)
      if (el) {
        if (selector.startsWith("meta")) {
          return el.getAttribute("content") || ""
        }
        const text = el.textContent?.trim()
        if (text) return text.slice(0, 500)
      }
    }
    return ""
  }

  private extractCoverImage(): string {
    const selectors = [
      "meta[property='og:image']",
      "meta[name='twitter:image']",
      "[itemprop='image']",
      "article img",
      ".featured-image img",
      ".post-thumbnail img"
    ]
    
    for (const selector of selectors) {
      const el = document.querySelector(selector)
      if (el) {
        if (selector.startsWith("meta")) {
          const content = el.getAttribute("content")
          if (content) return content
        }
        const src = el.getAttribute("src") || el.getAttribute("data-src")
        if (src) return src
      }
    }
    return ""
  }

  private extractPublishDate(): string {
    const selectors = [
      "time[datetime]",
      "[itemprop='datePublished']",
      "meta[property='article:published_time']",
      ".publish-date",
      ".post-date",
      ".date"
    ]
    
    for (const selector of selectors) {
      const el = document.querySelector(selector)
      if (el) {
        if (selector === "meta[property='article:published_time']") {
          return el.getAttribute("content") || ""
        }
        if (el.hasAttribute("datetime")) {
          return el.getAttribute("datetime") || ""
        }
        const text = el.textContent?.trim()
        if (text) return text
      }
    }
    return new Date().toISOString()
  }

  private extractSiteName(): string {
    const ogSiteName = document.querySelector("meta[property='og:site_name']")
    if (ogSiteName) {
      return ogSiteName.getAttribute("content") || ""
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
    const selectors = [
      "article",
      "[role='article']",
      ".post-content",
      ".article-content",
      ".entry-content",
      ".article-body",
      ".article__content",
      "main",
      "#content",
      ".main-content"
    ]

    let bestContent = ""
    let maxLength = 0
    let bestElement: Element | null = null

    for (const selector of selectors) {
      const el = document.querySelector(selector)
      if (el) {
        const text = this.cleanContent(el)
        if (text.length > maxLength) {
          maxLength = text.length
          bestContent = text
          bestElement = el
        }
      }
    }

    if (!bestContent && document.body) {
      bestContent = this.cleanContent(document.body)
    }

    return bestContent.slice(0, 100000)
  }

  private cleanContent(element: Element): string {
    const clone = element.cloneNode(true) as Element
    
    const removeSelectors = [
      "script",
      "style",
      "nav",
      "header",
      "footer",
      "aside",
      ".sidebar",
      ".advertisement",
      ".ad",
      ".ads",
      ".comments",
      ".comment",
      ".social-share",
      ".share",
      ".related-posts",
      ".popup",
      ".modal",
      ".dialog",
      "[role='navigation']",
      "[role='banner']",
      "[role='complementary']",
      "[role='feed']",
      ".toc",
      ".table-of-contents",
      ".author-card",
      ".author-bio",
      ".subscription",
      ".newsletter",
      // 点赞图标、反应图标
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
      // 悬浮按钮
      ".fixed-bar",
      ".float-bar",
      "[class*='fixed-']",
      "[class*='float-']",
      // 评论区
      "#comments",
      ".comments-area",
      "[id*='comment']",
      "[class*='comment-area']",
      // 右侧推荐
      ".recommended",
      "[class*='recommend']",
      ".related",
      ".relevant"
    ]
    
    removeSelectors.forEach(selector => {
      try {
        clone.querySelectorAll(selector).forEach(el => el.remove())
      } catch (e) {}
    })

    return this.processElementToMarkdown(clone)
  }

  private processElementToMarkdown(element: Element): string {
    const lines: string[] = []
    
    const traverse = (node: Node, inList = false, listType: string = "") => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent?.replace(/\s+/g, " ").trim()
        if (text) {
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
            if (href && linkText) {
              lines.push(`[${linkText}](${href})`)
            } else if (linkText) {
              lines.push(linkText)
            }
            break
          case "strong":
          case "b":
            lines.push(`**${el.textContent?.trim() || ""}**`)
            break
          case "em":
          case "i":
            lines.push(`*${el.textContent?.trim() || ""}*`)
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