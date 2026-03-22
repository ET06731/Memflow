# B站视频总结功能增强实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现 Issue #4 中的两个建议：

1. MD 中的时间戳添加可点击直达视频对应进度的链接（`?t=秒数` 参数）
2. 视频总结添加进度条提示，避免用户以为功能无响应

**Architecture:**

- 时间戳链接：在字幕格式化阶段生成带链接的 Markdown，时间戳格式改为 `[mm:ss](url?t=seconds)`
- 进度条：使用固定在页面中央的进度指示器，显示 3 个阶段（提取字幕 → AI 总结 → 生成文件）

**Tech Stack:** TypeScript, Plasmo Content Script, Inline Styles (遵循现有模式)

---

## 文件结构

```
修改文件:
- src/contents/adapters/bilibili.ts          # 修改时间戳格式化为可点击链接
- src/contents/index.tsx                      # 添加进度条 UI 和逻辑
```

---

## Task 1: 可点击时间戳

### 需求分析

- **当前**: `formatTimestamp()` 返回 `[mm:ss]`
- **目标**: 返回 `[mm:ss](https://www.bilibili.com/video/BVxxx?p=1&t=seconds)`

### 实现方案

在 `bilibili.ts` 中：

1. 修改 `formatSubtitleArray()` 方法签名，增加视频 URL 参数
2. 新增 `formatTimestampWithLink()` 方法，返回带链接的时间戳
3. 修改 `getSubtitles()` 调用处，传入视频 URL

### Files:

- Modify: `src/contents/adapters/bilibili.ts:583-596` (formatSubtitleArray)
- Modify: `src/contents/adapters/bilibili.ts:601-609` (getSubtitles)
- Modify: `src/contents/index.tsx:272, 390, 392` (调用处)

---

- [ ] **Step 1: 在 bilibili.ts 中新增 formatTimestampWithLink 方法**

在 `formatTimestamp()` 方法后添加：

```typescript
/**
 * 将秒数转换为带链接的时间戳格式: [mm:ss](url?t=seconds)
 * @param seconds 秒数
 * @param videoUrl 视频完整 URL（包含 BV 号）
 */
private formatTimestampWithLink(seconds: number, videoUrl: string): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  const timeStr = `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  // B站支持 ?t=秒数 参数直接跳转到指定时间
  const timestampUrl = `${videoUrl}?t=${seconds}`
  return `[${timeStr}](${timestampUrl})`
}
```

- [ ] **Step 2: 修改 formatSubtitleArray 方法签名**

修改 `src/contents/adapters/bilibili.ts:583-596`:

```typescript
/**
 * 将字幕数组格式化为字符串
 * @param body 字幕数据数组
 * @param withTimestamp 是否包含时间戳
 * @param videoUrl 视频 URL（可选，用于生成可点击时间戳）
 */
private formatSubtitleArray(body: any[], withTimestamp: boolean, videoUrl?: string): string {
  if (!body || !body.length) return ""
  return body
    .map((item: any) => {
      const text = item.content || ""
      if (!text) return ""
      if (withTimestamp && typeof item.from === "number") {
        // 如果提供了 videoUrl，生成可点击链接
        if (videoUrl) {
          return `${this.formatTimestampWithLink(item.from, videoUrl)} ${text}`
        }
        return `${this.formatTimestamp(item.from)} ${text}`
      }
      return text
    })
    .filter(Boolean)
    .join("\n")
}
```

- [ ] **Step 3: 修改 getSubtitles 方法，增加 videoUrl 参数传递**

修改 `src/contents/adapters/bilibili.ts:601-609`:

```typescript
async getSubtitles(withTimestamp: boolean = false, videoUrl?: string): Promise<string> {
  console.log("[Memflow Bilibili] 开始获取字幕... 是否包含时间戳:", withTimestamp)

  // 方案 A：优先读取 hook 缓存（页面自身加载字幕时已拦截）
  const cached = (window as any).__memflowSubtitleCache
  if (cached && Array.isArray(cached) && cached.length > 0) {
    console.log("[Memflow Bilibili] 方案A: 从 hook 缓存获取字幕，条数:", cached.length)
    return this.formatSubtitleArray(cached, withTimestamp, videoUrl)
  }
  // ... 其余代码不变，只在调用 formatSubtitleArray 时传入 videoUrl
```

- [ ] **Step 4: 修改方案 B 的 formatSubtitleArray 调用**

找到 `fetchSubtitle` 方法和 `fetchSubtitlesFromApi` 方法中的 `formatSubtitleArray` 调用，传入 `videoUrl` 参数。

- [ ] **Step 5: 修改 index.tsx 中的 getSubtitles 调用**

修改 `src/contents/index.tsx:272` 和 `src/contents/index.tsx:390-392`:

```typescript
// index.tsx:272 - exportDirect 函数中
subtitles = await bilibiliAdapter.getSubtitles(
  !!videoConfig?.saveSubtitlesWithTimestamp,
  window.location.href.split("?")[0] // 传入纯视频 URL
)

// index.tsx:390-392 - exportBiliBiliSmart 函数中
const videoBaseUrl = window.location.href.split("?")[0] // 获取纯视频 URL
subtitles = await bilibiliAdapter.getSubtitles(withTimestamp, videoBaseUrl)
```

- [ ] **Step 6: 运行构建验证**

Run: `pnpm build`
Expected: 无错误

---

## Task 2: 视频总结进度条

### 需求分析

**当前**: `exportBiliBiliSmart()` 中只有简单的 toast 通知
**目标**: 显示清晰的进度阶段：

1. 📥 提取字幕中...
2. 🤖 AI 分析中...
3. 💾 导出文件中...

### 实现方案

在 `index.tsx` 中：

1. 新增 `showProgress()` 函数，显示阶段进度
2. 新增 `hideProgress()` 函数，隐藏进度条
3. 在 `exportBiliBiliSmart()` 的关键节点调用

### Files:

- Modify: `src/contents/index.tsx:1130-1149` (showToast 附近)

---

- [ ] **Step 1: 添加进度条样式**

在 `index.tsx` 中 `showToast` 函数后添加进度条样式（放在现有 `<style>` 标签内）:

```typescript
// 进度条样式已包含在现有 style 标签中，只需添加以下额外样式：
// 在现有 style.textContent 末尾添加:

/* 视频总结进度条样式 */
.memflow-progress-container {
  position: fixed !important;
  top: 50% !important;
  left: 50% !important;
  transform: translate(-50%, -50%) !important;
  z-index: 2147483647 !important;
  background: rgba(10, 10, 15, 0.95) !important;
  border: 1px solid rgba(255, 255, 255, 0.15) !important;
  border-radius: 12px !important;
  padding: 24px 32px !important;
  min-width: 320px !important;
  backdrop-filter: blur(20px) !important;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5) !important;
}

.memflow-progress-title {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
  font-size: 15px !important;
  font-weight: 600 !important;
  color: #ffffff !important;
  margin-bottom: 16px !important;
  text-align: center !important;
}

.memflow-progress-steps {
  display: flex !important;
  flex-direction: column !important;
  gap: 12px !important;
}

.memflow-progress-step {
  display: flex !important;
  align-items: center !important;
  gap: 12px !important;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
  font-size: 13px !important;
  color: rgba(255, 255, 255, 0.5) !important;
  transition: all 0.3s ease !important;
}

.memflow-progress-step.active {
  color: #ffffff !important;
}

.memflow-progress-step.completed {
  color: #10b981 !important;
}

.memflow-progress-icon {
  font-size: 16px !important;
  width: 20px !important;
  text-align: center !important;
}

.memflow-progress-icon.spinning {
  animation: memflow-spin 1s linear infinite !important;
}

@keyframes memflow-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.memflow-progress-text {
  flex: 1 !important;
}
```

- [ ] **Step 2: 添加进度条组件函数**

在 `showToast` 函数后添加:

```typescript
/**
 * 显示视频总结进度条
 */
function showVideoProgress(step: 1 | 2 | 3, message?: string) {
  // 移除已存在的进度条
  hideVideoProgress()

  const container = document.createElement("div")
  container.id = "memflow-video-progress"
  container.className = "memflow-progress-container"

  const steps = [
    { icon: "📥", text: "提取字幕中...", active: step >= 1 },
    { icon: "🤖", text: "AI 分析中...", active: step >= 2 },
    { icon: "💾", text: "导出文件中...", active: step >= 3 }
  ]

  const stepsHtml = steps
    .map((s, index) => {
      const statusClass = s.active
        ? step > index + 1
          ? "completed"
          : "active"
        : ""
      const iconClass = s.active && step === index + 1 ? "spinning" : ""
      const checkMark = step > index + 1 ? "✓" : s.icon
      return `
      <div class="memflow-progress-step ${statusClass}">
        <span class="memflow-progress-icon ${iconClass}">${checkMark}</span>
        <span class="memflow-progress-text">${s.text}${message && step === index + 1 ? " " + message : ""}</span>
      </div>
    `
    })
    .join("")

  container.innerHTML = `
    <div class="memflow-progress-title">🎬 视频总结进度</div>
    <div class="memflow-progress-steps">${stepsHtml}</div>
  `

  document.body.appendChild(container)
}

/**
 * 隐藏视频总结进度条
 */
function hideVideoProgress() {
  const existing = document.getElementById("memflow-video-progress")
  if (existing) {
    existing.remove()
  }
}
```

- [ ] **Step 3: 修改 exportBiliBiliSmart 函数，集成进度条**

修改 `src/contents/index.tsx:361-537` 中的 `exportBiliBiliSmart` 函数:

```typescript
async function exportBiliBiliSmart() {
  try {
    if (!currentAdapter || !(currentAdapter instanceof BiliBiliAdapter)) {
      showToast("当前页面不是 B 站视频", "error")
      return
    }

    // 1. 获取 AI API 配置
    const { aiApiConfig } = await chrome.storage.sync.get("aiApiConfig")

    // 2. 确认提示
    const confirmed = window.confirm(
      "🤖 B 站视频智能导出\n\n插件将提取视频字幕并使用 AI 生成深度结构化长文总结。\n\n💡 请确保视频已开启字幕功能（点击播放器底部控制栏的「字幕」或「AI 字幕」按钮）\n\n是否继续？"
    )
    if (!confirmed) return

    // 阶段 1: 显示进度条
    showVideoProgress(1)
    console.log("[Memflow Bilibili] 开始智能导出...")

    // 3. 获取视频信息和字幕
    const bilibiliAdapter = currentAdapter as BiliBiliAdapter
    const videoInfo = bilibiliAdapter.getVideoInfo()

    const { obsidianConfig: topConfig } =
      await chrome.storage.sync.get("obsidianConfig")
    let subtitles = ""

    const withTimestamp =
      topConfig?.saveSubtitles !== false &&
      !!topConfig?.saveSubtitlesWithTimestamp
    const videoBaseUrl = window.location.href.split("?")[0]

    subtitles = await bilibiliAdapter.getSubtitles(withTimestamp, videoBaseUrl)

    if (!subtitles || subtitles.length === 0) {
      hideVideoProgress()
      showToast(
        "❌ 未检测到字幕！请在视频播放器下方点击「字幕」或「AI 字幕」按钮开启控制后重试",
        "error"
      )
      console.log("[Memflow Bilibili] 未找到字幕，视频可能没有开启字幕")
      return
    }

    console.log("[Memflow Bilibili] 字幕获取成功，长度:", subtitles.length)

    // 4. 检查 API 配置
    if (!aiApiConfig?.enabled || !aiApiConfig?.apiKey) {
      hideVideoProgress()
      showToast("请在设置中配置 AI API", "error")
      return
    }

    // 阶段 2: 更新进度条
    showVideoProgress(2, "发送请求...")
    console.log("[Memflow Bilibili] 正在请求 AI 分析...")

    // 5. 使用真实 API 生成总结
    const aiConfig: AIApiConfig = {
      enabled: aiApiConfig.enabled,
      provider: aiApiConfig.provider || "deepseek",
      apiKey: aiApiConfig.apiKey,
      baseUrl: aiApiConfig.baseUrl || "",
      model: aiApiConfig.model || "",
      bilibiliPromptTemplate: aiApiConfig.bilibiliPromptTemplate || "tech"
    }

    const aiResult = await AIService.summarize({
      subtitles,
      videoInfo: {
        title: videoInfo.title,
        uploader: videoInfo.uploader,
        description: videoInfo.description,
        tags: videoInfo.tags
      },
      config: aiConfig
    })

    console.log("[Memflow Bilibili] AI 总结完成:", aiResult)

    // 阶段 3: 导出
    showVideoProgress(3)
    console.log("[Memflow Bilibili] 正在导出...")

    // ... 其余导出逻辑保持不变 ...
    // 在导出成功后调用 hideVideoProgress()
  } catch (error) {
    hideVideoProgress() // 确保出错时也隐藏进度条
    console.error("[Memflow Bilibili] 智能导出失败:", error)
    showToast(`智能导出失败: ${error.message}`, "error")
  }
}
```

- [ ] **Step 4: 在导出成功/失败处调用 hideVideoProgress**

在 `exportBiliBiliSmart` 函数的导出逻辑完成后（每个 return 语句前）添加 `hideVideoProgress()`:

```typescript
// 在每个导出成功的 return 前添加:
hideVideoProgress()
return
```

- [ ] **Step 5: 运行构建验证**

Run: `pnpm build`
Expected: 无错误

---

## Task 3: 测试验证

- [ ] **Step 1: 启动开发服务器**

Run: `pnpm dev`
Expected: 开发服务器启动成功

- [ ] **Step 2: 加载扩展到 Chrome**

在 Chrome 中访问 `chrome://extensions`，重新加载 Memflow 扩展

- [ ] **Step 3: 测试可点击时间戳**

1. 访问 B站视频页面
2. 确保视频已开启字幕
3. 点击 Memflow 导出按钮（Shift+Click 或右键）
4. 打开导出的 MD 文件
5. 验证时间戳格式为: `[00:00](https://www.bilibili.com/video/BVxxx?t=0)`
6. 点击时间戳，应跳转到视频对应位置

- [ ] **Step 4: 测试进度条**

1. 访问 B站视频页面
2. 确保已配置 AI API
3. 点击 Memflow 导出按钮（Shift+Click 或右键）
4. 观察页面中央是否显示进度条
5. 验证 3 个阶段依次完成

---

## 注意事项

1. **B站 URL 格式**: 确保传入的是纯视频 URL（不含查询参数），因为 `?t=` 是跳转参数
2. **多 P 视频**: 目前 Issue #3 提到只能提取 P1，进度条功能先实现，P 号问题后续处理
3. **进度条位置**: 使用固定居中，确保在任何页面都能看到
4. **错误处理**: 所有出错路径都要调用 `hideVideoProgress()`

---

## 提交信息建议

```
feat(bilibili): 添加可点击时间戳和视频总结进度条

- 时间戳格式改为 [mm:ss](url?t=seconds) 可点击链接
- 新增视频总结三阶段进度指示器
- 修复 Issue #4 中的建议 1 和建议 2
```
