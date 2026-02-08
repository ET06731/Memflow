import type { PlasmoCSConfig } from "plasmo"

import { ObsidianURIHandler } from "../obsidian/uri-handler"
import { createMarkdownBuilder, createMetadataGenerator } from "../processing"
import { detectPlatformAdapter } from "./adapters"

export const config: PlasmoCSConfig = {
  matches: ["https://chat.deepseek.com/*", "https://*.deepseek.com/*"]
}

let currentAdapter = detectPlatformAdapter()

async function exportDirect() {
  try {
    if (!currentAdapter) {
      showToast("❌ 当前页面不支持导出", "error")
      return
    }

    console.log("📝 开始提取对话...")

    const conversation = currentAdapter.extractConversation()

    if (conversation.messages.length === 0) {
      showToast("⚠️ 没有找到对话内容", "warning")
      return
    }

    console.log(`✅ 提取到 ${conversation.messages.length} 条消息`)

    const metadataGen = createMetadataGenerator()
    const metadata = metadataGen.generateLocal(conversation)

    console.log("✅ 元数据生成完成:", metadata)

    const { obsidianConfig } = await chrome.storage.sync.get("obsidianConfig")

    const markdownBuilder = createMarkdownBuilder()
    const markdown = markdownBuilder.build(conversation, metadata, {
      contentFormat: obsidianConfig?.contentFormat || "web"
    })

    console.log("✅ Markdown 构建完成")

    if (!chrome.runtime?.id || !chrome.storage) {
      throw new Error("扩展连接已断开，请刷新页面后重试")
    }

    if (!obsidianConfig || !obsidianConfig.vaultName) {
      downloadMarkdown(markdown, metadata.title)
      showToast("💡 请在扩展设置中配置 Obsidian", "warning")
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
        showToast("⚠️ URI调用失败，已下载文件", "warning")
      }
    } else {
      downloadMarkdown(markdown, metadata.title)
      showToast("✅ 导出成功！", "success")
    }
  } catch (error) {
    console.error("导出失败:", error)
    showToast(`❌ 导出失败: ${error.message}`, "error")
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

  const toolbar = findToolbarLocation()
  if (!toolbar) {
    console.error("❌ 无法创建工具栏位置")
    return
  }

  const button = document.createElement("button")
  button.id = "memflow-export-btn"
  button.type = "button"
  button.setAttribute("aria-label", "导出到 Obsidian")

  button.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
      <polyline points="7 10 12 15 17 10"></polyline>
      <line x1="12" y1="15" x2="12" y2="3"></line>
    </svg>
  `

  button.className = "memflow-toolbar-btn"

  const style = document.createElement("style")
  style.textContent = `
    .memflow-toolbar-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      padding: 0;
      margin: 0 4px;
      background: transparent !important;
      border: none !important;
      box-shadow: none !important;
      cursor: pointer;
      color: inherit;
      opacity: 0.6;
      transition: opacity 0.2s ease;
      position: relative;
    }
    
    .memflow-toolbar-btn:hover {
      opacity: 1;
      background: transparent !important;
    }
    
    .memflow-toolbar-btn svg {
      width: 18px;
      height: 18px;
    }
    
    .memflow-toolbar-btn.exporting {
      pointer-events: none;
      opacity: 0.6;
    }
    
    .memflow-toolbar-btn.exporting svg {
      animation: memflow-pulse 1.5s ease-in-out infinite;
    }
    
    @keyframes memflow-pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }
    
    .memflow-toast {
      position: fixed;
      top: 24px;
      right: 24px;
      z-index: 10000;
      padding: 14px 24px;
      background: linear-gradient(135deg, #0a0a0f 0%, #12121a 50%, #0d0d12 100%);
      color: #e5e5e5;
      font-size: 13px;
      border-radius: 10px;
      border: 1px solid rgba(245, 158, 11, 0.3);
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.4), 0 0 20px rgba(245, 158, 11, 0.15);
      animation: memflow-toast-slide-in 0.3s ease-out;
      font-family: 'JetBrains Mono', monospace;
      max-width: 400px;
      line-height: 1.5;
      backdrop-filter: blur(10px);
    }

    .memflow-toast-success {
      border-color: rgba(16, 185, 129, 0.5);
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.4), 0 0 20px rgba(16, 185, 129, 0.2);
    }

    .memflow-toast-success::before {
      content: '✓';
      color: #10b981;
      margin-right: 10px;
      font-weight: bold;
    }

    .memflow-toast-error {
      border-color: rgba(239, 68, 68, 0.5);
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.4), 0 0 20px rgba(239, 68, 68, 0.2);
    }

    .memflow-toast-error::before {
      content: '✗';
      color: #ef4444;
      margin-right: 10px;
      font-weight: bold;
    }

    .memflow-toast-warning {
      border-color: rgba(245, 158, 11, 0.5);
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.4), 0 0 20px rgba(245, 158, 11, 0.2);
    }

    .memflow-toast-warning::before {
      content: '⚠';
      color: #f59e0b;
      margin-right: 10px;
      font-weight: bold;
    }

    @keyframes memflow-toast-slide-in {
      from {
        transform: translateX(400px);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    
    @keyframes memflow-toast-slide-out {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(400px);
        opacity: 0;
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

  toolbar.appendChild(button)
  console.log("✅ Memflow 工具栏按钮已创建")
}

function findToolbarLocation(): HTMLElement | null {
  // 策略 1: 寻找"分享"按钮 (Share Button) 并插入到它左边
  // 这是一个非常通用的策略，适用于 ChatGPT, Kimi 等大多数 AI 网页
  const shareButtonSelectors = [
    "[data-testid='share-chat-button']", // ChatGPT
    "button[aria-label*='Share']", // 通用英文
    "button[aria-label*='分享']", // 通用中文
    ".header-right button[class*='share']" // Kimi 可能的类名
  ]

  for (const selector of shareButtonSelectors) {
    const shareBtn = document.querySelector(selector)
    if (shareBtn && shareBtn.parentElement) {
      // 检查父容器是否即使 header 或 toolbar 相关的
      // 避免误判 (比如把某个普通按钮当成 header 分享按钮)
      // 但其实顶部右上角的分享按钮通常就是我们要找的

      const wrapper = document.createElement("div")
      wrapper.style.cssText =
        "display: inline-flex; align-items: center; margin-right: 8px;"

      // 插入到分享按钮之前
      shareBtn.parentElement.insertBefore(wrapper, shareBtn)
      console.log("✅ 已定位到分享按钮旁:", selector)
      return wrapper
    }
  }

  // 策略 2: 常见的顶部右侧容器 (Header Right)
  const headerRightSelectors = [
    // ChatGPT
    ".sticky.top-0 .flex.items-center:last-child",
    "[data-testid='header-user-menu-button']", // 用户头像旁边

    // Kimi
    ".header-right .action-group",
    ".header-right",

    // DeepSeek
    "header .header-right",
    "header .header-actions",

    // Fallback
    "header .actions",
    "header [role='toolbar']",
    "header > div:last-child"
  ]

  for (const selector of headerRightSelectors) {
    const element = document.querySelector(selector)
    if (element) {
      const wrapper = document.createElement("div")
      wrapper.style.cssText =
        "display: inline-flex; align-items: center; margin: 0 8px;"

      // 既然是右上角，通常插入到最前面比较合适（要在用户头像或分享按钮左边）
      if (element.firstChild) {
        element.insertBefore(wrapper, element.firstChild)
      } else {
        element.appendChild(wrapper)
      }

      return wrapper
    }
  }

  // 策略 3:如果都没找到，尝试挂载到 header 末尾 (绝对定位)
  const header = document.querySelector("header")
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
    return container
  }

  // 策略 4: 最后的保底 - 页面右上角固定悬浮 (纯图标，无背景)
  const container = document.createElement("div")
  container.style.cssText = `
    position: fixed;
    top: 15px;
    right: 15px;
    z-index: 99999;
  `.trim()

  document.body.appendChild(container)
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
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", createToolbarButton)
  } else {
    createToolbarButton()
  }

  const observer = new MutationObserver(() => {
    if (!document.getElementById("memflow-export-btn")) {
      createToolbarButton()
    }
  })

  observer.observe(document.body, {
    childList: true,
    subtree: false
  })
}

initMemflow()
