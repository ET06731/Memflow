import type { FloatingBallConfig } from "../types"
import { getDefaultFloatingBallConfig } from "../config/defaults"

const FLOATING_BALL_ID = "memflow-floating-ball"
const FLOATING_BALL_PANEL_ID = "memflow-floating-panel"
const FLOATING_BALL_STYLE_ID = "memflow-floating-styles"
const LONG_PRESS_MS = 500
const EDGE_OFFSET = 12 // px from screen edge
const PANEL_GAP = 12 // px gap between ball and panel
const FLOATING_BALL_LOG_PREFIX = "[Memflow FloatingBall]"
const FLOATING_BALL_LOG_LEVEL: "debug" | "info" | "warn" = "info"

const FLOATING_BALL_LOG_PRIORITY = {
  debug: 10,
  info: 20,
  warn: 30
} as const
type FloatingBallCallbacks = {
  exportDirect: () => Promise<void>
  exportSmart: () => Promise<void>
}

let currentCleanup: (() => void) | null = null
let latestCallbacks: FloatingBallCallbacks | null = null
let storageListenerRegistered = false
let lifecycleMonitorRegistered = false
let outsideClickCleanup: (() => void) | null = null
let domObserver: MutationObserver | null = null
let domObserverPausedUntil = 0
let lastKnownUrl = ""
let reinitTimer: ReturnType<typeof setTimeout> | null = null
let skipStorageReinit = false

const FLOATBALL_ICON_URL = new URL(
  "../../assets/floatball.svg",
  import.meta.url
).href

function shouldLog(level: keyof typeof FLOATING_BALL_LOG_PRIORITY): boolean {
  return (
    FLOATING_BALL_LOG_PRIORITY[level] >=
    FLOATING_BALL_LOG_PRIORITY[FLOATING_BALL_LOG_LEVEL]
  )
}

function info(message: string, ...args: unknown[]) {
  if (!shouldLog("info")) {
    return
  }

  console.log(`✅ ${FLOATING_BALL_LOG_PREFIX} ${message}`, ...args)
}

function warn(message: string, ...args: unknown[]) {
  if (!shouldLog("warn")) {
    return
  }

  console.warn(`⚠️ ${FLOATING_BALL_LOG_PREFIX} ${message}`, ...args)
}

function debugState(message: string, extra?: Record<string, unknown>) {
  if (!shouldLog("debug")) {
    return
  }

  console.log(`🔍 ${FLOATING_BALL_LOG_PREFIX} ${message}`, {
    url: window.location.href,
    hasBall: !!document.getElementById(FLOATING_BALL_ID),
    readyState: document.readyState,
    ...extra
  })
}

/**
 * 检查当前 URL 是否命中禁用站点列表
 * 支持通配符 * 匹配任意字符
 */
export function isUrlDisabled(
  url: string,
  patterns: string[]
): boolean {
  if (!patterns || patterns.length === 0) return false

  try {
    const urlObj = new URL(url)
    const hostname = urlObj.hostname
    const fullPath = urlObj.href

    for (const pattern of patterns) {
      if (!pattern || !pattern.trim()) continue

      const trimmed = pattern.trim()

      if (fullPath === trimmed) return true

      const regexStr = trimmed
        .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
        .replace(/\*/g, ".*")
      try {
        const regex = new RegExp(`^${regexStr}$`, "i")
        if (regex.test(fullPath) || regex.test(hostname)) return true
      } catch {
      }

      if (fullPath.includes(trimmed) || hostname.includes(trimmed)) return true
    }
  } catch {
  }

  return false
}

async function loadFloatingBallConfig(): Promise<FloatingBallConfig> {
  try {
    const { floatingBallConfig } = await chrome.storage.sync.get("floatingBallConfig")
    if (floatingBallConfig) {
      info("已读取悬浮球配置", floatingBallConfig)
      return { ...getDefaultFloatingBallConfig(), ...floatingBallConfig }
    }
  } catch {
    warn("读取悬浮球配置失败，改用默认配置")
  }
  info("未找到悬浮球配置，改用默认配置")
  return getDefaultFloatingBallConfig()
}

async function ensureDomReady(): Promise<void> {
  if (document.body && document.head) {
    return
  }

  info("DOM 尚未就绪，等待 body/head 挂载")

  await new Promise<void>((resolve) => {
    const observer = new MutationObserver(() => {
      if (document.body && document.head) {
        observer.disconnect()
        resolve()
      }
    })

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    })
  })
}

function scheduleFloatingBallReinit(reason: string, delay = 120) {
  if (!latestCallbacks) {
    warn(`收到重建请求但缺少 callbacks，原因: ${reason}`)
    return
  }

  if (reinitTimer) {
    clearTimeout(reinitTimer)
  }

  debugState(`计划重建悬浮球: ${reason}`, { delay })
  reinitTimer = setTimeout(() => {
    reinitTimer = null
    void initFloatingBall(latestCallbacks)
  }, delay)
}

function injectFloatingBallStyles() {
  if (document.getElementById(FLOATING_BALL_STYLE_ID)) return

  const style = document.createElement("style")
  style.id = FLOATING_BALL_STYLE_ID
  style.textContent = `
    #${FLOATING_BALL_ID} {
      all: initial;
      position: fixed !important;
      width: 36px !important;
      height: 36px !important;
      border-radius: 50% !important;
      background: rgba(80, 80, 80, 0.7) !important;
      border: 1px solid rgba(120, 120, 120, 0.2) !important;
      cursor: grab !important;
      z-index: 2147483646 !important;
      display: flex !important;
      visibility: visible !important;
      opacity: 1 !important;
      pointer-events: auto !important;
      box-sizing: border-box !important;
      align-items: center !important;
      justify-content: center !important;
      user-select: none !important;
      transition: opacity 0.3s ease, background 0.2s ease !important;
      touch-action: none !important;
      backdrop-filter: blur(4px) !important;
      box-shadow: 0 0 8px rgba(255, 255, 255, 0.15) !important;
    }

    #${FLOATING_BALL_ID}:hover {
      background: rgba(100, 100, 100, 0.85) !important;
      color: #fff !important;
    }

    #${FLOATING_BALL_ID}.memflow-dragging {
      cursor: grabbing !important;
      transition: none !important;
      background: rgba(100, 100, 100, 0.9) !important;
      color: #fff !important;
      border-color: rgba(245, 158, 11, 0.5) !important;
    }

    #${FLOATING_BALL_ID}.memflow-hidden {
      opacity: 0 !important;
      pointer-events: none !important;
    }

    #${FLOATING_BALL_ID}.memflow-hover-reveal {
      opacity: 0 !important;
      pointer-events: none !important;
    }

    #${FLOATING_BALL_ID}.memflow-hover-reveal:hover {
      opacity: 1 !important;
      pointer-events: auto !important;
    }

    #${FLOATING_BALL_PANEL_ID} {
      all: initial;
      position: fixed !important;
      z-index: 2147483646 !important;
      background: rgba(18, 18, 26, 0.96) !important;
      border: 1px solid rgba(245, 158, 11, 0.25) !important;
      border-radius: 12px !important;
      padding: 8px !important;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5) !important;
      backdrop-filter: blur(20px) !important;
      min-width: 160px !important;
      animation: memflow-panel-in 0.2s ease-out !important;
    }

    @keyframes memflow-panel-in {
      from {
        opacity: 0;
        transform: translateY(-8px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .memflow-panel-btn {
      all: initial;
      display: flex !important;
      align-items: center !important;
      gap: 10px !important;
      width: 100% !important;
      padding: 10px 14px !important;
      border: none !important;
      border-radius: 8px !important;
      background: transparent !important;
      color: #e5e5e5 !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      font-size: 13px !important;
      font-weight: 500 !important;
      cursor: pointer !important;
      transition: background 0.15s ease !important;
      box-sizing: border-box !important;
    }

    .memflow-panel-btn:hover {
      background: rgba(245, 158, 11, 0.15) !important;
      color: #f59e0b !important;
    }

    .memflow-panel-btn .btn-icon {
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      width: 16px !important;
      height: 16px !important;
      line-height: 1 !important;
    }

    .memflow-panel-btn .btn-icon svg {
      width: 16px !important;
      height: 16px !important;
      stroke: currentColor !important;
    }
  `
  document.head.appendChild(style)
  info("已注入悬浮球样式")
}

function createFloatingBall(): HTMLElement {
  const existing = document.getElementById(FLOATING_BALL_ID)
  if (existing) existing.remove()

  const ball = document.createElement("div")
  ball.id = FLOATING_BALL_ID
  ball.setAttribute("role", "button")
  ball.setAttribute("aria-label", "Memflow 导出")
  ball.title = "Memflow 导出"
  ball.style.visibility = "visible"
  ball.style.opacity = "1"
  ball.style.pointerEvents = "auto"
  ball.style.display = "flex"
  ball.style.boxSizing = "border-box"
  ball.style.position = "fixed"
  ball.style.zIndex = "2147483646"

  const icon = document.createElement("img")
  icon.src = FLOATBALL_ICON_URL
  icon.alt = "Memflow"
  icon.width = 28
  icon.height = 28
  icon.draggable = false
  icon.style.display = "block"
  ball.appendChild(icon)

  return ball
}

function createQuickPanel(): HTMLElement {
  const existing = document.getElementById(FLOATING_BALL_PANEL_ID)
  if (existing) existing.remove()

  const panel = document.createElement("div")
  panel.id = FLOATING_BALL_PANEL_ID
  panel.setAttribute("role", "menu")

  const actions = [
    { label: "直接导出", action: "direct" },
    { label: "智能导出", action: "smart" },
    { label: "设置", action: "settings" }
  ]

  for (const act of actions) {
    const btn = document.createElement("button")
    btn.className = "memflow-panel-btn"
    btn.setAttribute("role", "menuitem")
    btn.dataset.action = act.action
    btn.innerHTML = `<span class="btn-icon">${getQuickPanelActionIcon(act.action)}</span><span>${act.label}</span>`
    panel.appendChild(btn)
  }

  return panel
}

function getQuickPanelActionIcon(action: string): string {
  switch (action) {
    case "direct":
      return `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M12 3v12"></path>
          <path d="M7 10l5 5 5-5"></path>
          <path d="M5 21h14"></path>
        </svg>
      `
    case "smart":
      return `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M12 8V4H8"></path>
          <rect x="4" y="8" width="16" height="12" rx="3"></rect>
          <path d="M2 14h2"></path>
          <path d="M20 14h2"></path>
          <path d="M15 13v2"></path>
          <path d="M9 13v2"></path>
        </svg>
      `
    case "settings":
      return `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.2a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 0 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.2a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 0 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3h.1A1.6 1.6 0 0 0 10 3.2V3a2 2 0 1 1 4 0v.2a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 0 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8v.1a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.2a1.6 1.6 0 0 0-1.5 1z"></path>
        </svg>
      `
    default:
      return ""
  }
}

function removeFloatingBall() {
  outsideClickCleanup?.()
  outsideClickCleanup = null
  const ball = document.getElementById(FLOATING_BALL_ID)
  if (ball) ball.remove()
  const panel = document.getElementById(FLOATING_BALL_PANEL_ID)
  if (panel) panel.remove()
  debugState("已移除悬浮球和快捷面板")
}

function dismissPanel() {
  const panel = document.getElementById(FLOATING_BALL_PANEL_ID)
  if (panel) panel.remove()
}

const DRAG_THRESHOLD = 5

/**
 * 判断应该吸附到哪一侧
 */
function getSnapSide(clientX: number): "left" | "right" {
  return clientX < window.innerWidth / 2 ? "left" : "right"
}

/**
 * 应用吸附位置到小球
 */
function applySnap(ball: HTMLElement, side: "left" | "right", topPct: number) {
  const clampedPct = Math.max(8, Math.min(92, topPct))
  ball.style.removeProperty("right")
  ball.style.removeProperty("left")
  if (side === "right") {
    ball.style.right = EDGE_OFFSET + "px"
  } else {
    ball.style.left = EDGE_OFFSET + "px"
  }
  ball.style.top = clampedPct + "%"
  ball.style.transform = "translateY(-50%)"
}

function inspectFloatingBallVisibility(ball: HTMLElement, config: FloatingBallConfig) {
  window.requestAnimationFrame(() => {
    const rect = ball.getBoundingClientRect()
    const style = window.getComputedStyle(ball)
    const isOffscreen =
      rect.right < 0 ||
      rect.left > window.innerWidth ||
      rect.bottom < 0 ||
      rect.top > window.innerHeight

    debugState("悬浮球可见性检查", {
      rect: {
        top: Math.round(rect.top),
        left: Math.round(rect.left),
        width: Math.round(rect.width),
        height: Math.round(rect.height)
      },
      display: style.display,
      visibility: style.visibility,
      opacity: style.opacity,
      pointerEvents: style.pointerEvents,
      hideUntilHover: config.hideFloatingBallUntilHover,
      isOffscreen
    })

    if (
      rect.width === 0 ||
      rect.height === 0 ||
      style.display === "none" ||
      style.visibility === "hidden" ||
      Number.parseFloat(style.opacity || "1") === 0 ||
      isOffscreen
    ) {
      warn("检测到悬浮球不可见，应用兜底样式", {
        rect: {
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height
        },
        display: style.display,
        visibility: style.visibility,
        opacity: style.opacity
      })

      ball.style.width = "36px"
      ball.style.height = "36px"
      ball.style.display = "flex"
      ball.style.visibility = "visible"
      ball.style.opacity = "1"
      ball.style.pointerEvents = "auto"
      ball.style.background = "rgba(80, 80, 80, 0.88)"
      ball.style.border = "1px solid rgba(245, 158, 11, 0.65)"
      ball.style.position = "fixed"
      ball.style.top = "50%"
      ball.style.right = EDGE_OFFSET + "px"
      ball.style.left = "auto"
      ball.style.transform = "translateY(-50%)"
      ball.style.zIndex = "2147483646"

      window.requestAnimationFrame(() => {
        const fallbackRect = ball.getBoundingClientRect()
        debugState("悬浮球兜底样式已应用", {
          rect: {
            top: Math.round(fallbackRect.top),
            left: Math.round(fallbackRect.left),
            width: Math.round(fallbackRect.width),
            height: Math.round(fallbackRect.height)
          }
        })
      })
    }
  })
}

/**
 * 定位快捷面板
 */
function positionPanel(panel: HTMLElement, ball: HTMLElement, side: "left" | "right") {
  const ballRect = ball.getBoundingClientRect()
  const ballCenterY = ballRect.top + ballRect.height / 2
  const panelWidth = 160

  panel.style.removeProperty("right")
  panel.style.removeProperty("left")
  panel.style.removeProperty("transform")

  if (side === "right") {
    panel.style.right = (window.innerWidth - ballRect.left + PANEL_GAP) + "px"
  } else {
    panel.style.left = (ballRect.right + PANEL_GAP) + "px"
  }
  panel.style.top = (ballCenterY - panel.offsetHeight / 2) + "px"
}

export async function initFloatingBall(callbacks: {
  exportDirect: () => Promise<void>
  exportSmart: () => Promise<void>
}): Promise<void> {
  debugState("开始初始化悬浮球")
  latestCallbacks = callbacks
  currentCleanup?.()
  currentCleanup = null
  await ensureDomReady()

  const config = await loadFloatingBallConfig()
  debugState("悬浮球配置已载入", config as unknown as Record<string, unknown>)

  if (!config.enableFloatingBall) {
    info("配置关闭了悬浮球，停止注入")
    removeFloatingBall()
    ensureFloatingBallStorageListener()
    ensureFloatingBallLifecycleMonitor()
    return
  }

  if (isUrlDisabled(window.location.href, config.floatingBallDisabledSites)) {
    warn("当前页面命中禁用规则，跳过注入", {
      disabledSites: config.floatingBallDisabledSites
    })
    removeFloatingBall()
    ensureFloatingBallStorageListener()
    ensureFloatingBallLifecycleMonitor()
    return
  }

  injectFloatingBallStyles()

  const ball = createFloatingBall()
  const pct = Math.max(0, Math.min(100, config.floatingBallPosition ?? 50))
  const side = config.floatingBallSide || "right"
  applySnap(ball, side, pct)
  document.documentElement.appendChild(ball)
  lastKnownUrl = window.location.href
  info("悬浮球已注入页面", { side, pct })
  domObserverPausedUntil = Date.now() + 300
  inspectFloatingBallVisibility(ball, config)

  const cleanupFns: Array<() => void> = []

  // 悬停显隐模式
  if (config.hideFloatingBallUntilHover) {
    info("悬浮球当前处于靠边隐藏模式，需要鼠标接近边缘后显示")
    ball.classList.add("memflow-hover-reveal")
    const showOnProximity = (e: MouseEvent) => {
      const nearRight = e.clientX > window.innerWidth - 80
      const nearLeft = e.clientX < 80
      if (nearRight || nearLeft) {
        ball.classList.remove("memflow-hover-reveal")
      }
    }
    const hideOnLeave = () => {
      ball.classList.add("memflow-hover-reveal")
    }
    const handleMouseEnter = () => {
      ball.classList.remove("memflow-hover-reveal")
    }
    ball.addEventListener("mouseenter", handleMouseEnter)
    ball.addEventListener("mouseleave", hideOnLeave)
    document.addEventListener("mousemove", showOnProximity)
    cleanupFns.push(() => document.removeEventListener("mousemove", showOnProximity))
    cleanupFns.push(() => ball.removeEventListener("mouseenter", handleMouseEnter))
    cleanupFns.push(() => ball.removeEventListener("mouseleave", hideOnLeave))
  }

  // --- 事件管理 ---
  let pressTimer: ReturnType<typeof setTimeout> | null = null
  let isLongPress = false
  let isDragging = false
  let dragJustCompleted = false
  let activePointerId: number | null = null
  let startX = 0
  let startY = 0
  let ballLeftPx = 0
  let ballTopPx = 0

  const clearPressTimer = () => {
    if (pressTimer) {
      clearTimeout(pressTimer)
      pressTimer = null
    }
  }

  const clearPointerListeners = () => {
    window.removeEventListener("pointermove", handlePointerMove)
    window.removeEventListener("pointerup", handlePointerUp)
    window.removeEventListener("pointercancel", handlePointerUp)
    window.removeEventListener("blur", handleWindowBlur)
  }

  const releasePointerCapture = () => {
    if (activePointerId === null) {
      return
    }

    try {
      ball.releasePointerCapture(activePointerId)
    } catch {
    }
  }

  const cleanupDrag = () => {
    clearPressTimer()
    clearPointerListeners()
    releasePointerCapture()
    activePointerId = null
    ball.classList.remove("memflow-dragging")
    isDragging = false
    isLongPress = false
  }

  const savePosition = async (topPct: number, snapSide: "left" | "right") => {
    const clamped = Math.round(Math.max(0, Math.min(100, topPct)))
    const { floatingBallConfig: existing } = await chrome.storage.sync.get("floatingBallConfig")
    const merged = {
      ...getDefaultFloatingBallConfig(),
      ...existing,
      floatingBallPosition: clamped,
      floatingBallSide: snapSide
    }
    skipStorageReinit = true
    chrome.storage.sync.set({ floatingBallConfig: merged }).catch(() => {})
    setTimeout(() => {
      skipStorageReinit = false
    }, 0)
  }

  const finishDrag = () => {
    ball.classList.remove("memflow-dragging")
    ball.style.transition = ""
    const rect = ball.getBoundingClientRect()
    const viewH = window.innerHeight
    const ballH = rect.height
    const centerX = rect.left + rect.width / 2
    const snapSide = getSnapSide(centerX)
    const topPx = rect.top
    const pct = Math.max(0, Math.min(100, (topPx / (viewH - ballH)) * 100))
    applySnap(ball, snapSide, pct)
    void savePosition(pct, snapSide)
    dragJustCompleted = true
    isDragging = false
  }

  const handlePointerMove = (e: PointerEvent) => {
    if (activePointerId !== e.pointerId) {
      return
    }

    const dx = e.clientX - startX
    const dy = e.clientY - startY
    if (!isDragging) {
      if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
        isDragging = true
        isLongPress = false
        clearPressTimer()
        dismissPanel()
        ball.classList.add("memflow-dragging")
        ball.style.transition = "none"
        ball.style.transform = "none"
        const rect = ball.getBoundingClientRect()
        ballLeftPx = rect.left
        ballTopPx = rect.top
        ball.style.removeProperty("right")
        ball.style.removeProperty("left")
        ball.style.left = ballLeftPx + "px"
        ball.style.top = ballTopPx + "px"
      }
    }
    if (isDragging) {
      ball.style.left = (ballLeftPx + dx) + "px"
      ball.style.top = (ballTopPx + dy) + "px"
    }
  }

  const handlePointerDown = (e: PointerEvent) => {
    if (e.button !== 0 || activePointerId !== null) {
      return
    }

    isLongPress = false
    isDragging = false
    dragJustCompleted = false
    activePointerId = e.pointerId
    startX = e.clientX
    startY = e.clientY
    try {
      ball.setPointerCapture(e.pointerId)
    } catch {
    }
    pressTimer = setTimeout(() => {
      if (!isDragging) {
        isLongPress = true
        showQuickPanel(ball, callbacks)
      }
    }, LONG_PRESS_MS)
    window.addEventListener("pointermove", handlePointerMove)
    window.addEventListener("pointerup", handlePointerUp)
    window.addEventListener("pointercancel", handlePointerUp)
    window.addEventListener("blur", handleWindowBlur)
  }

  const handlePointerUp = (e: PointerEvent) => {
    if (activePointerId !== e.pointerId) {
      return
    }

    clearPressTimer()
    clearPointerListeners()

    if (isDragging) {
      finishDrag()
      releasePointerCapture()
      activePointerId = null
      return
    }

    releasePointerCapture()
    activePointerId = null
  }

  const handleWindowBlur = () => {
    if (activePointerId === null) {
      return
    }

    info("窗口失焦，清理当前拖拽状态")

    if (isDragging) {
      finishDrag()
    } else {
      clearPressTimer()
      isLongPress = false
    }

    clearPointerListeners()
    releasePointerCapture()
    activePointerId = null
  }

  const handleClick = () => {
    if (isDragging || dragJustCompleted) {
      isDragging = false
      dragJustCompleted = false
      return
    }
    if (isLongPress) {
      isLongPress = false
      return
    }
    dismissPanel()
    if (config.floatingBallClickAction === "smart") {
      callbacks.exportSmart()
    } else {
      callbacks.exportDirect()
    }
  }

  ball.addEventListener("pointerdown", handlePointerDown)
  ball.addEventListener("click", handleClick)

  cleanupFns.push(() => ball.removeEventListener("pointerdown", handlePointerDown))
  cleanupFns.push(() => ball.removeEventListener("click", handleClick))
  cleanupFns.push(cleanupDrag)
  cleanupFns.push(removeFloatingBall)

  currentCleanup = () => {
    cleanupFns.forEach((fn) => {
      try {
        fn()
      } catch {
      }
    })
  }

  ensureFloatingBallStorageListener()
  ensureFloatingBallLifecycleMonitor()
  debugState("悬浮球初始化完成")
}

function showQuickPanel(
  anchor: HTMLElement,
  callbacks: {
    exportDirect: () => Promise<void>
    exportSmart: () => Promise<void>
  }
) {
  dismissPanel()

  const panel = createQuickPanel()
  document.body.appendChild(panel)

  // 根据小球当前吸附侧定位面板
  const currentSide = getSnapSide(anchor.getBoundingClientRect().left + anchor.offsetWidth / 2)
  positionPanel(panel, anchor, currentSide)

  const handleAction = (e: Event) => {
    const target = e.target as HTMLElement
    const btn = target.closest("[data-action]") as HTMLElement
    if (!btn) return

    const action = btn.dataset.action
    dismissPanel()

    if (action === "direct") {
      callbacks.exportDirect()
    } else if (action === "smart") {
      callbacks.exportSmart()
    } else if (action === "settings") {
      void openExtensionSettingsPage()
    }
  }

  panel.addEventListener("click", handleAction)
  const cleanupOutsideClick = () => {
    document.removeEventListener("mousedown", clickOutside)
    outsideClickCleanup = null
  }

  const clickOutside = (e: MouseEvent) => {
    if (!panel.contains(e.target as Node) && e.target !== anchor) {
      dismissPanel()
      cleanupOutsideClick()
    }
  }

  setTimeout(() => {
    outsideClickCleanup?.()
    outsideClickCleanup = cleanupOutsideClick
    document.addEventListener("mousedown", clickOutside)
  }, 0)
}

async function openExtensionSettingsPage() {
  try {
    if (chrome.runtime?.openOptionsPage) {
      chrome.runtime.openOptionsPage()
      info("已通过 runtime.openOptionsPage 打开设置页")
      return
    }
  } catch (error) {
    warn("runtime.openOptionsPage 打开失败，尝试 fallback", error)
  }

  try {
    const optionsUrl = chrome.runtime?.getURL?.("options.html")
    if (optionsUrl) {
      window.open(optionsUrl, "_blank", "noopener,noreferrer")
      info("已通过 options.html fallback 打开设置页", { optionsUrl })
      return
    }
  } catch (error) {
    warn("fallback 打开设置页失败", error)
  }

  warn("未能打开设置页")
}

function ensureFloatingBallStorageListener() {
  if (storageListenerRegistered) {
    return
  }

  chrome.storage?.onChanged?.addListener((changes, areaName) => {
    if (areaName !== "sync" || !changes.floatingBallConfig || !latestCallbacks) {
      return
    }

    if (skipStorageReinit) {
      info("拖拽保存触发的配置变化，跳过重建")
      return
    }

    info("检测到悬浮球配置变化，准备重建", changes.floatingBallConfig)
    scheduleFloatingBallReinit("storage changed", 50)
  })

  storageListenerRegistered = true
  info("已注册悬浮球 storage 监听")
}

function ensureFloatingBallLifecycleMonitor() {
  if (lifecycleMonitorRegistered) {
    return
  }

  const checkUrlChange = (reason: string) => {
    const currentUrl = window.location.href
    if (currentUrl === lastKnownUrl) {
      debugState(`页面事件触发但 URL 未变化: ${reason}`)
      return
    }

      info(`检测到页面 URL 变化，准备重建悬浮球: ${reason}`, {
      from: lastKnownUrl,
      to: currentUrl
    })
    lastKnownUrl = currentUrl
    scheduleFloatingBallReinit(`url changed via ${reason}`, 180)
  }

  const originalPushState = history.pushState.bind(history)
  history.pushState = function (...args) {
    const result = originalPushState(...args)
    checkUrlChange("pushState")
    return result
  }

  const originalReplaceState = history.replaceState.bind(history)
  history.replaceState = function (...args) {
    const result = originalReplaceState(...args)
    checkUrlChange("replaceState")
    return result
  }

  window.addEventListener("popstate", () => checkUrlChange("popstate"))
  window.addEventListener("hashchange", () => checkUrlChange("hashchange"))
  window.addEventListener("pageshow", () => {
    info("收到 pageshow 事件，检查悬浮球")
    scheduleFloatingBallReinit("pageshow", 120)
  })

  domObserver = new MutationObserver(() => {
    if (Date.now() < domObserverPausedUntil) {
      return
    }

    if (!latestCallbacks) {
      return
    }

    const hasBall = !!document.getElementById(FLOATING_BALL_ID)
    if (!hasBall && document.body) {
      warn("检测到悬浮球节点缺失，准备自动补注入")
      scheduleFloatingBallReinit("ball removed from dom", 120)
    }
  })

  domObserver.observe(document.documentElement, {
    childList: true,
    subtree: true
  })

  lifecycleMonitorRegistered = true
  info("已注册悬浮球生命周期监控")
}
