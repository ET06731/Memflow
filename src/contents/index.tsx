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
      width: 36px;
      height: 36px;
      padding: 0;
      margin: 0 24px 0 4px;
      background: transparent;
      border: none;
      cursor: pointer;
      color: var(--text-secondary, #999);
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
    }
    
    .memflow-toolbar-btn:hover {
      color: var(--text-primary, #fff);
      transform: translateY(-1px);
    }
    
    .memflow-toolbar-btn svg {
      width: 20px;
      height: 20px;
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
      padding: 12px 20px;
      background: rgba(0, 0, 0, 0.85);
      color: white;
      font-size: 14px;
      border-radius: 6px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      animation: memflow-toast-slide-in 0.3s ease-out;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    .memflow-toast-success {
      background: #10b981;
    }

    .memflow-toast-error {
      background: #ef4444;
    }

    .memflow-toast-warning {
      background: #f59e0b;
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
  const buttonGroupSelectors = [
    "header .header-actions",
    "header .header-right",
    "header .actions",
    "header .toolbar",
    "header [role=\"toolbar\"]",
    "header nav",
    "header > div[class*=\"action\"]",
    "header > div:last-child"
  ]

  for (const selector of buttonGroupSelectors) {
    const element = document.querySelector(selector)
    if (element && element.children.length > 0) {
      const wrapper = document.createElement("span")
      wrapper.style.cssText = "display: inline-flex; margin-right: 8px;"

      if (element.firstChild) {
        element.insertBefore(wrapper, element.firstChild)
      } else {
        element.appendChild(wrapper)
      }

      return wrapper as HTMLElement
    }
  }

  const header = document.querySelector("header")
  if (header) {
    const container = document.createElement("div")
    container.style.cssText = `
      display: inline-flex;
      align-items: center;
      position: absolute;
      right: 80px;
      top: 50%;
      transform: translateY(-50%);
      z-index: 100;
    `.trim()

    header.style.position = header.style.position || "relative"
    header.appendChild(container)
    return container
  }

  const container = document.createElement("div")
  container.style.cssText = `
    position: fixed;
    top: 16px;
    right: 80px;
    z-index: 9999;
  `.trim()

  document.body.appendChild(container)
  return container
}

function showToast(message: string, type: "success" | "error" | "warning" = "success") {
  const existingToast = document.querySelector(".memflow-toast")
  if (existingToast) {
    existingToast.remove()
  }

  const toast = document.createElement("div")
  toast.className = `memflow-toast memflow-toast-${type}`
  toast.textContent = message

  document.body.appendChild(toast)

  setTimeout(() => {
    toast.style.opacity = "0"
    toast.style.transition = "opacity 0.3s"
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
