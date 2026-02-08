/**
 * DeepSeek DOM 选择器调试工具
 * 
 * 使用方法：
 * 1. 打开 DeepSeek 网页
 * 2. 打开浏览器开发者工具（F12）
 * 3. 在 Console 中粘贴并运行此脚本
 * 4. 查看输出，找到正确的选择器
 */

console.log('=== DeepSeek DOM 结构分析 ===\n');

// 1. 查找消息容器
console.log('1. 查找消息容器:');
const possibleMessageContainers = [
    '.message',
    '.message-item',
    '.chat-message',
    '[data-message-id]',
    '[role="article"]',
    '.markdown-body',
    'div[class*="message"]',
    'div[class*="chat"]'
];

possibleMessageContainers.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    if (elements.length > 0) {
        console.log(`✅ ${selector}: ${elements.length} 个元素`);
        console.log('   示例HTML:', elements[0].outerHTML.substring(0, 200));
    }
});

// 2. 查找用户消息
console.log('\n2. 查找用户消息标识:');
const possibleUserSelectors = [
    '[data-role="user"]',
    '.user-message',
    '.message-user',
    '[class*="user"]',
    'div[class*="User"]'
];

possibleUserSelectors.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    if (elements.length > 0) {
        console.log(`✅ ${selector}: ${elements.length} 个元素`);
    }
});

// 3. 查找 AI 消息
console.log('\n3. 查找 AI 消息标识:');
const possibleAISelectors = [
    '[data-role="assistant"]',
    '.ai-message',
    '.assistant-message',
    '.message-assistant',
    '[class*="assistant"]',
    '[class*="bot"]'
];

possibleAISelectors.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    if (elements.length > 0) {
        console.log(`✅ ${selector}: ${elements.length} 个元素`);
    }
});

// 4. 展示所有对话消息的结构
console.log('\n4. 对话消息结构分析:');
const allMessages = document.querySelectorAll('body *');
const messageElements = Array.from(allMessages).filter(el => {
    const text = el.textContent?.trim() || '';
    return text.length > 50 && text.length < 500 && !el.querySelector('*');
});

console.log(`找到 ${messageElements.length} 个可能的消息元素`);
if (messageElements.length > 0) {
    console.log('前3个示例:');
    messageElements.slice(0, 3).forEach((el, i) => {
        console.log(`\n  [${i + 1}] 类名: ${el.className}`);
        console.log(`      内容: ${el.textContent?.substring(0, 100)}...`);
        console.log(`      父元素: ${el.parentElement?.className}`);
    });
}

console.log('\n=== 分析完成 ===');
console.log('请将上述输出发给开发者以更新选择器配置');
