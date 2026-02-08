import type { PlasmoCSConfig } from "plasmo"
import { detectPlatformAdapter } from "./adapters"
import { createMetadataGenerator, createMarkdownBuilder } from "../processing"

export const config: PlasmoCSConfig = {
  matches: [
    "https://chat.deepseek.com/*",
    "https://*.deepseek.com/*"
  ]
}

// 全局状态
let currentAdapter = detectPlatformAdapter()

/**
 * 直接导出功能
 */
async function exportDirect() {
  try {
    if (!currentAdapter) {
      showToast('❌ 当前页面不支持导出', 'error')
      return
    }

    console.log('📝 开始提取对话...')

    // 提取对话
    const conversation = currentAdapter.extractConversation()

    if (conversation.messages.length === 0) {
      showToast('⚠️ 没有找到对话内容', 'warning')
      return
    }

    console.log(`✅ 提取到 ${conversation.messages.length} 条消息`)

    // 生成元数据（本地算法）
    const metadataGen = createMetadataGenerator()
    const metadata = metadataGen.generateLocal(conversation)

    console.log('✅ 元数据生成完成:', metadata)

    // 构建 Markdown
    const markdownBuilder = createMarkdownBuilder()
    const markdown = markdownBuilder.build(conversation, metadata)

    console.log('✅ Markdown 构建完成')

    // 获取用户配置
    const { obsidianConfig } = await chrome.storage.sync.get('obsidianConfig')

    if (!obsidianConfig || !obsidianConfig.vaultName) {
      // 未配置，使用下载方式并提示
      downloadMarkdown(markdown, metadata.title)
      showToast('💡 请在扩展设置中配置 Obsidian', 'warning')
      showToast('💡 请点击扩展图标配置 Obsidian', 'warning')
      return
    }

    // 根据导出方式分流
    if (obsidianConfig.exportMethod === 'uri') {
      const { ObsidianURIHandler } = await import('../obsidian/uri-handler')
      const handler = new ObsidianURIHandler(obsidianConfig)
      const success = await handler.exportToObsidian(markdown, metadata)

      if (success) {
        showToast('✅ 已发送到 Obsidian！', 'success')
      } else {
        // URI失败，降级到下载
        downloadMarkdown(markdown, metadata.title)
        showToast('⚠️ URI调用失败，已下载文件', 'warning')
      }
    } else {
      // 下载方式
      downloadMarkdown(markdown, metadata.title)
      showToast('✅ 导出成功！', 'success')
    }
  } catch (error) {
    console.error('导出失败:', error)
    showToast(`❌ 导出失败: ${error.message}`, 'error')
  }
}

/**
 * 下载 Markdown 文件
 */
function downloadMarkdown(content: string, filename: string) {
  // 清理文件名
  const safeFilename = filename
    .replace(/[<>:"/\\|?*]/g, '-')
    .slice(0, 50)

  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = `${safeFilename}.md`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)

  URL.revokeObjectURL(url)
}

/**
 * 创建工具栏按钮（集成到页面原生UI）
 */
function createToolbarButton() {
  // 检查是否已存在
  if (document.getElementById('memflow-export-btn')) {
    return
  }

  // 查找或创建右上角工具栏位置
  const toolbar = findToolbarLocation()
  if (!toolbar) {
    console.error('❌ 无法创建工具栏位置')
    return
  }

  // 创建按钮
  const button = document.createElement('button')
  button.id = 'memflow-export-btn'
  button.type = 'button'
  button.setAttribute('aria-label', '导出到 Obsidian')

  // 使用简洁的图标（类似Gemini的设计）
  button.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
      <polyline points="7 10 12 15 17 10"></polyline>
      <line x1="12" y1="15" x2="12" y2="3"></line>
    </svg>
  `

  // 样式 - 只显示图标，无背景框
  button.className = 'memflow-toolbar-btn'
  const style = document.createElement('style')
  style.textContent = `
    .memflow-toolbar-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      padding: 0;
      margin: 0 24px 0 4px;  /* 大幅增加右侧间距，确保不遮挡原生按钮 */
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
    
    .memflow-toolbar-btn:active {
      transform: translateY(0);
    }
    
    .memflow-toolbar-btn svg {
      width: 20px;
      height: 20px;
      filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1));
    }
    
    /* 黑暗模式适配 */
    @media (prefers-color-scheme: dark) {
      .memflow-toolbar-btn {
        color: var(--text-secondary-dark, #999);
      }
      
      .memflow-toolbar-btn:hover {
        color: var(--text-primary-dark, #fff);
      }
      
      .memflow-toolbar-btn:hover svg {
        filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.3));
      }
    }
    
    /* 导出中状态 */
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
    
    /* 提示tooltip */
    .memflow-tooltip {
      position: absolute;
      bottom: -32px;
      left: 50%;
      transform: translateX(-50%);
      padding: 6px 12px;
      background: rgba(0, 0, 0, 0.9);
      color: white;
      font-size: 12px;
      border-radius: 6px;
      white-space: nowrap;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.2s;
      z-index: 1000;
    }
    
    .memflow-tooltip.show {
      opacity: 1;
    }
  `
  document.head.appendChild(style)

  // 点击事件
  button.addEventListener('click', async () => {
    button.classList.add('exporting')

    try {
      await exportDirect()
      showTooltip(button, '✓ 导出成功')
    } catch (error) {
      showTooltip(button, '✗ 导出失败')
    } finally {
      button.classList.remove('exporting')
    }
  })

  // Hover 显示提示
  let hoverTooltip: HTMLDivElement | null = null

  button.addEventListener('mouseenter', () => {
    if (button.classList.contains('exporting')) return

    hoverTooltip = document.createElement('div')
    hoverTooltip.className = 'memflow-tooltip show'
    hoverTooltip.textContent = '导出到 Obsidian'
    button.appendChild(hoverTooltip)
  })

  button.addEventListener('mouseleave', () => {
    if (hoverTooltip) {
      hoverTooltip.remove()
      hoverTooltip = null
    }
  })

  toolbar.appendChild(button)
  console.log('✅ Memflow 工具栏按钮已创建')
}

function findToolbarLocation(): HTMLElement | null {
  // 策略1: 查找页面右上角现有的按钮组容器
  const buttonGroupSelectors = [
    'header .header-actions',
    'header .header-right',
    'header .actions',
    'header .toolbar',
    'header [role="toolbar"]',
    'header nav',
    'header > div[class*="action"]',
    'header > div:last-child'
  ]

  for (const selector of buttonGroupSelectors) {
    const element = document.querySelector(selector)
    if (element && element.children.length > 0) {
      console.log(`✅ 找到按钮组位置: ${selector}`)

      // 在这个容器的第一个按钮之前插入（确保在最左侧）
      const wrapper = document.createElement('span')
      wrapper.style.cssText = 'display: inline-flex; margin-right: 8px;'

      if (element.firstChild) {
        element.insertBefore(wrapper, element.firstChild)
      } else {
        element.appendChild(wrapper)
      }

      return wrapper as HTMLElement
    }
  }

  // 策略2: 如果找不到按钮组，在header中创建独立容器
  const header = document.querySelector('header')
  if (header) {
    console.log('⚙️ 在 header 中创建独立按钮容器')
    const container = document.createElement('div')
    container.className = 'memflow-toolbar-standalone'
    container.style.cssText = `
      display: inline-flex;
      align-items: center;
      position: absolute;
      right: 80px;
      top: 50%;
      transform: translateY(-50%);
      z-index: 100;
    `.trim()

    header.style.position = header.style.position || 'relative'
    header.appendChild(container)
    return container
  }

  // 策略3: 最后降级 - 固定在右上角
  console.log('⚙️ 在 body 右上角创建固定工具栏')
  const container = document.createElement('div')
  container.className = 'memflow-toolbar-fixed'
  container.style.cssText = `
    position: fixed;
    top: 16px;
    right: 80px;
    z-index: 9999;
    display: flex;
    align-items: center;
    gap: 8px;
  `.trim()

  document.body.appendChild(container)
  return container
}

/**
 * 显示提示信息
 */
function showTooltip(button: HTMLElement, message: string) {
  const tooltip = document.createElement('div')
  tooltip.className = 'memflow-tooltip show'
  tooltip.textContent = message
  button.appendChild(tooltip)

  setTimeout(() => {
    tooltip.classList.remove('show')
    setTimeout(() => tooltip.remove(), 200)
  }, 2000)
}

/**
 * 显示全局Toast通知（自动消失）
 */
function showToast(message: string, type: 'success' | 'error' | 'warning' = 'success') {
  // 移除已存在的toast
  const existingToast = document.querySelector('.memflow-toast')
  if (existingToast) {
    existingToast.remove()
  }

  const toast = document.createElement('div')
  toast.className = `memflow-toast memflow-toast-${type}`
  toast.textContent = message

  // 添加样式
  const style = document.createElement('style')
  style.id = 'memflow-toast-style'
  if (!document.getElementById('memflow-toast-style')) {
    style.textContent = `
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
  }

  document.body.appendChild(toast)

  // 3秒后自动消失
  setTimeout(() => {
    toast.style.animation = 'memflow-toast-slide-out 0.3s ease-out'
    setTimeout(() => toast.remove(), 300)
  }, 3000)
}

/**
 * 初始化
 */
function initMemflow() {
  // 页面加载完成后创建按钮
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createToolbarButton)
  } else {
    createToolbarButton()
  }

  // 监听页面变化，确保按钮始终存在
  const observer = new MutationObserver(() => {
    if (!document.getElementById('memflow-export-btn')) {
      createToolbarButton()
    }
  })

  observer.observe(document.body, {
    childList: true,
    subtree: false
  })
}

// 启动
initMemflow()
