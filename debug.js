// 检查分享按钮是否存在
console.log("分享按钮:", document.querySelector('[data-testid="share-chat-button"]'))

// 检查按钮是否已创建
console.log("导出按钮:", document.getElementById('memflow-export-btn'))

// 检查备用容器
console.log("备用容器:", document.getElementById('memflow-fallback-container'))

// 检查所有可能的 Header 元素
console.log("Headers:", document.querySelectorAll('header, .header, [class*="Header"]'))

// 检查 Memflow 相关元素
console.log("Memflow 元素:", document.querySelectorAll('[id*="memflow"]'))
