/**
 * Background Script - 处理快捷键命令
 */

// 监听快捷键命令
chrome.commands.onCommand.addListener(async (command) => {
  console.log("[Memflow] 收到快捷键命令:", command)

  // 获取当前活动标签页
  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true
  })

  if (!tab?.id) {
    console.error("[Memflow] 无法获取当前标签页")
    return
  }

  // 向内容脚本发送消息触发导出
  if (command === "trigger-export") {
    // 直接导出
    try {
      await chrome.tabs.sendMessage(tab.id, {
        action: "triggerExport"
      })
      console.log("[Memflow] 直接导出命令已发送")
    } catch (error) {
      console.error("[Memflow] 发送导出命令失败:", error)
    }
  } else if (command === "trigger-export-smart") {
    // 智能导出
    try {
      await chrome.tabs.sendMessage(tab.id, {
        action: "triggerExportSmart"
      })
      console.log("[Memflow] 智能导出命令已发送")
    } catch (error) {
      console.error("[Memflow] 发送智能导出命令失败:", error)
    }
  }
})

// 监听消息
chrome.runtime.onMessage.addListener(
  (message: { action: string }, _sender, sendResponse) => {
    console.log("[Memflow Background] 收到消息:", message.action)

    if (message.action === "ping") {
      sendResponse({ success: true })
    }

    return true
  }
)

console.log("[Memflow] Background script 已加载")
