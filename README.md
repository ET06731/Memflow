# Memflow - 记忆流动

从 AI 对话平台导出对话到 Obsidian 知识库的浏览器扩展。

## ✨ 功能特性

- ✅ **多平台聊天导出**：支持 DeepSeek、ChatGPT、Kimi、Gemini、豆包等 AI 对话平台
- ✅ **B站视频智能提炼**：支持导出获取 B 站视频原文字幕，并利用你配置的 AI API 一键生成结构化的视频摘要！
- ✅ **流式的重组构造**：自动生成带层级的 Markdown，包含标题、关键词、高光总结等
- ✅ **一键无缝接入**：自动通过 Obsidian Advanced URI 的方式保存至笔记系统或直接下载Markdown文件
- ✅ **极致沉浸**：页面右上角原生集成导出按钮

## 🚀 快速开始

### 开发环境

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 构建生产版本
pnpm build
```

### 安装说明 (使用)

1. 前往本仓库的 **[Releases](https://github.com/your-repo/releases)** 页面
2. 下载最新版本（如 `v1.0.1`）的 `memflow-xxx.zip` 压缩包并解压到一个文件夹
3. 打开 Chrome 浏览器，访问 `chrome://extensions`
4. 打开右上角的 **"开发者模式"**
5. 点击左上角 **"加载已解压的扩展程序"**，选择你刚刚解压的文件夹即可！

### 在开发者模式中加载 (开发)

1. 安装依赖并执行 `pnpm build`（生产环境）或 `pnpm dev`（调试环境）
2. 按照上述步骤在 `chrome://extensions` 中加载 `build/chrome-mv3-prod` 或 `build/chrome-mv3-dev` 目录

### 使用方法

1. 访问支持的 AI 平台（DeepSeek、ChatGPT、Kimi、Gemini、豆包）
2. 进行对话
3. 点击页面右上角的导出按钮（位于分享按钮左侧）
4. Markdown 文件将自动下载或打开 Obsidian

## 📁 项目结构

### 核心架构图

```mermaid
graph TD
    subtitles(Popup 设置界面) -->|保存配置| storage[(chrome.storage)]
    
    subgraph Content Scripts [内容注入层]
        main(contents/index.tsx <br/> 导出主入口)
        adapters(adapters/ <br/> 各平台适配器)
    end
    
    subgraph Data Processing [数据处理层]
        ai(services/ai-api.ts <br/> AI 大模型接口)
        meta(processing/metadata-generator.ts <br/> 元数据生成)
        build(processing/markdown-builder.ts <br/> Markdown 构建)
    end
    
    main -->|提取DOM| adapters
    main -->|读取配置| storage
    main -->|请求分析| ai
    main -->|抽取元属性| meta
    main -->|生成MD| build
    build -->|下载 / URI| obsidian(Obsidian 笔记)
```

### 目录结构

```text
src/
├── contents/           # Content Scripts 注入脚本
│   ├── adapters/       # B站、ChatGPT、DeepSeek等平台适配器
│   │   └── ...
│   └── index.tsx       # 页面主注入点（负责注入导出按钮和抓取流）
├── processing/         # 文本与逻辑处理层
│   ├── markdown-builder.ts   # 构建 Markdown 文本
│   ├── metadata-generator.ts # 本地算法与 AI 结合的元数据生成器
│   └── local-algorithms.ts   # 本地 NLP 摘要生成与分类
├── services/           # 服务与接口层
│   └── ai-api.ts       # 负责与外部大模型交互 (DeepSeek等) API
├── types/              # TypeScript 类型定义
├── config/             # 配置文件 (selectors.json DOM选择器)
├── popup.tsx           # 扩展设置弹窗界面
└── test/               # 自动化测试文件
```

## 🛠️ 技术栈

- **框架**: [Plasmo](https://www.plasmo.com/)
- **语言**: TypeScript
- **UI**: React
- **测试**: Vitest
- **构建**: pnpm

## 📋 开发路线图

- [x] Phase 0: 环境搭建
- [x] Phase 1: MVP - DeepSeek 基础导出
- [x] Phase 2: 多平台适配 (ChatGPT, Kimi, Gemini, 豆包)
- [x] Phase 3: UI 优化与多语言支持
- [ ] Phase 4: Claude 支持与 B 站深度长文生成增强机制
- [ ] Phase 5: 完善与发布

## 📚 开发文档

- [AGENTS.md](./AGENTS.md) - 开发指南和代码规范

## 🤝 参与贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License
