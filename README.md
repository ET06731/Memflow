# Memflow - 流动的记忆

从 AI 对话平台导出对话到 Obsidian 知识库的浏览器扩展。

## ✨ 功能特性

- ✅ **多平台支持**：DeepSeek、ChatGPT、Kimi、Gemini
- ✅ **智能元数据提取**：自动生成标题、关键词、摘要和分类
- ✅ **Markdown 格式导出**：包含 YAML frontmatter 和 Obsidian Callouts
- ✅ **一键导出**：页面右上角导出按钮
- 🚧 **即将支持**：Claude、Obsidian 深度集成

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

### 在浏览器中加载

1. 打开 Chrome 浏览器，访问 `chrome://extensions`
2. 启用"开发者模式"
3. 点击"加载已解压的扩展程序"
4. 选择 `build/chrome-mv3-dev` 目录

### 使用方法

1. 访问 DeepSeek (https://chat.deepseek.com)
2. 进行对话
3. 点击页面右下角的"导出到 Obsidian"按钮
4. Markdown 文件将自动下载

## 📁 项目结构

```
src/
├── contents/           # Content Scripts
│   ├── adapters/       # 平台适配器
│   │   ├── base-adapter.ts
│   │   ├── chatgpt.ts
│   │   ├── deepseek.ts
│   │   ├── gemini.ts
│   │   ├── kimi.ts
│   │   └── index.ts
│   └── index.tsx       # 主 Content Script（导出按钮）
├── processing/         # 处理层
│   ├── local-algorithms.ts    # 本地算法（关键词提取等）
│   ├── markdown-builder.ts   # Markdown 构建器
│   └── metadata-generator.ts # 元数据生成器
├── types/             # TypeScript 类型定义
└── config/            # 配置文件
    ├── selectors.json # DOM 选择器
    └── prompts.json   # LLM Prompt 模板
```

## 🛠️ 技术栈

- **框架**: [Plasmo](https://www.plasmo.com/)
- **语言**: TypeScript
- **UI**: React
- **Markdown**: Turndown
- **状态管理**: Zustand

## 📋 开发路线图

- [x] Phase 0: 环境搭建
- [x] Phase 1: MVP - DeepSeek 基础导出
- [x] Phase 2: 多平台适配 (ChatGPT, Kimi, Gemini)
- [ ] Phase 3: 智能增强 - DOM 注入 LLM
- [ ] Phase 4: Obsidian 深度集成
- [ ] Phase 5: 完善与发布

## 🤝 参与贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License
