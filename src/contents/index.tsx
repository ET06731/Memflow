import type { PlasmoCSConfig } from "plasmo"

import { ObsidianURIHandler } from "../obsidian/uri-handler"
import { createMarkdownBuilder, createMetadataGenerator } from "../processing"
import { detectPlatformAdapter } from "./adapters"

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
    "https://www.doubao.com/*"
  ]
}

let currentAdapter = detectPlatformAdapter()

async function exportDirect() {
  try {
    if (!currentAdapter) {
      showToast("当前页面不支持导出", "error")
      return
    }

    console.log("[Memflow] 开始提取对话...")

    const conversation = currentAdapter.extractConversation()

    if (conversation.messages.length === 0) {
      showToast("没有找到对话内容", "warning")
      return
    }

    console.log(`[Memflow] 提取到 ${conversation.messages.length} 条消息`)

    const metadataGen = createMetadataGenerator()
    const metadata = metadataGen.generateLocal(conversation)

    console.log("[Memflow] 元数据生成完成:", metadata)

    const { obsidianConfig } = await chrome.storage.sync.get("obsidianConfig")

    const markdownBuilder = createMarkdownBuilder()
    const markdown = markdownBuilder.build(conversation, metadata, {
      contentFormat: obsidianConfig?.contentFormat || "web"
    })

    console.log("[Memflow] Markdown 构建完成")

    if (!chrome.runtime?.id || !chrome.storage) {
      throw new Error("扩展连接已断开，请刷新页面后重试")
    }

    if (!obsidianConfig || !obsidianConfig.vaultName) {
      downloadMarkdown(markdown, metadata.title)
      showToast("请在扩展设置中配置 Obsidian", "warning")
      return
    }

    if (obsidianConfig.exportMethod === "uri") {
      const handler = new ObsidianURIHandler(obsidianConfig)
      const result = await handler.exportToObsidian(markdown, metadata)

      if (result.success) {
        showToast(
          result.message,
          result.method === "direct" ? "success" : "warning"
        )
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

function downloadMarkdown(content: string, filename: string) {
  const safeFilename = filename.replace(/[<>:"/\|?*]/g, "-").slice(0, 50)
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" })
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

  const button = document.createElement("button")
  button.id = "memflow-export-btn"
  button.type = "button"
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

  button.addEventListener("click", async () => {
    button.classList.add("exporting")
    try {
      await exportDirect()
    } finally {
      button.classList.remove("exporting")
    }
  })

  // 如果有标记的分享按钮，插入到它前面
  const shareBtn = (toolbar as any).__memflowShareButton
  if (shareBtn && shareBtn.parentElement === toolbar) {
    toolbar.insertBefore(button, shareBtn)

    // 豆包网站：增加与分享按钮的距离
    if (window.location.host.includes("doubao.com")) {
      button.style.marginRight = "30px"
    }

    console.log("[Memflow] Memflow 工具栏按钮已创建（在分享按钮旁）")
  } else {
    toolbar.appendChild(button)
    console.log("[Memflow] Memflow 工具栏按钮已创建")
  }
}

function findToolbarLocation(): HTMLElement | null {
  console.log("🔍 开始查找工具栏位置...", window.location.host)

  // 策略 1: 寻找"分享"按钮 (Share Button) 并插入到它左边
  // 这是一个非常通用的策略，适用于 ChatGPT, Kimi 等大多数 AI 网页
  const shareButtonSelectors = [
    "[data-testid='share-chat-button']", // ChatGPT
    "button[aria-label*='Share']", // 通用英文
    "button[aria-label*='分享']", // 通用中文
    "button[class*='share']", // 通用分享按钮类名
    "[data-testid='share-button']", // 一些网站的测试ID
    // Kimi 特定的分享按钮
    ".header-right button[class*='share']",
    ".chat-header button[class*='share']",
    "button svg[class*='share']", // 包含分享图标的按钮
    "button:has(svg[data-icon='share'])" // 通过图标查找
  ]

  for (const selector of shareButtonSelectors) {
    try {
      const shareBtn = document.querySelector(selector)
      if (shareBtn && shareBtn.parentElement) {
        // 直接返回分享按钮的父元素，让按钮插入到其中
        console.log("[Memflow] 已定位到分享按钮旁:", selector)
        // 为了确保按钮在分享按钮左边，我们需要在插入时处理
        // 这里返回父元素，后续会在按钮创建后使用 insertBefore
        const parent = shareBtn.parentElement
          // 在父元素上标记分享按钮的位置
          ; (parent as any).__memflowShareButton = shareBtn
        return parent
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
      if (header) {
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
