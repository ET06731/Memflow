# Memflow - Agent Development Guide

## Project Overview

**Memflow** is a browser extension (Chrome MV3) that clips and summarizes web content and videos, generating AI-powered summaries for smart content capture.

- **Framework**: [Plasmo](https://www.plasmo.com/) - Modern browser extension framework
- **Language**: TypeScript
- **UI**: React with inline styles (no CSS files)
- **Package Manager**: pnpm

## Build Commands

```bash
# Install dependencies
pnpm install

# Development - starts dev server with hot reload
pnpm dev

# Build production version
pnpm build

# Package extension for distribution
pnpm package
```

## Test Commands

```bash
# Run all tests once
pnpm test

# Run tests in watch mode (for development)
pnpm test:watch

# Run tests with coverage report
pnpm test:coverage
```

## Project Structure

```
src/
├── contents/           # Content Scripts (runs in web pages)
│   ├── adapters/       # Platform-specific adapters
│   │   ├── base-adapter.ts      # Abstract base class
│   │   ├── deepseek.ts          # DeepSeek adapter
│   │   ├── chatgpt.ts           # ChatGPT adapter
│   │   ├── kimi.ts              # Kimi adapter
│   │   └── index.ts             # Adapter factory
│   └── index.tsx       # Main content script (toolbar button)
├── processing/         # Data processing layer
│   ├── markdown-builder.ts      # Markdown generation
│   ├── metadata-generator.ts    # Metadata extraction
│   └── local-algorithms.ts      # Text processing algorithms
├── obsidian/           # Obsidian integration
│   └── uri-handler.ts           # Obsidian URI protocol handler
├── types/              # TypeScript type definitions
├── config/             # Configuration files
│   ├── selectors.json           # DOM selectors per platform
│   └── prompts.json             # LLM prompt templates
├── utils/              # Utility functions
│   └── cleaner.ts               # HTML/text cleaning
└── popup.tsx           # Extension popup UI
```

## Code Style Guidelines

### TypeScript

- **Strict mode**: Enabled (inherited from Plasmo tsconfig)
- **No semicolons**: Use ASI (Automatic Semicolon Insertion)
- **Double quotes**: For strings
- **No trailing commas**
- **2-space indentation**

### Imports

Sorted by `@ianvs/prettier-plugin-sort-imports`:

1. Node.js built-in modules
2. Third-party modules
3. `@plasmo/*` packages
4. `@plasmohq/*` packages
5. `~/*` project imports (path alias for root)
6. Relative imports `./` and `../`

Example:
```typescript
import type { PlasmoCSConfig } from "plasmo"
import { useEffect, useState } from "react"

import { createMarkdownBuilder } from "~/processing"
import { detectPlatformAdapter } from "./adapters"
```

### Naming Conventions

- **Files**: kebab-case (e.g., `base-adapter.ts`, `markdown-builder.ts`)
- **Classes**: PascalCase (e.g., `BaseAdapter`, `MarkdownBuilder`)
- **Interfaces**: PascalCase with `I` prefix (e.g., `IAdapter`)
- **Functions**: camelCase, descriptive names
- **Constants**: UPPER_SNAKE_CASE for true constants
- **Types**: PascalCase

### Error Handling

- Always use try/catch in async functions
- Provide user-friendly error messages in Chinese
- Log errors with emoji prefixes for visibility:
  - `console.log("✅ Success message")`
  - `console.warn("⚠️ Warning message")`
  - `console.error("❌ Error message")`

Example:
```typescript
try {
  const result = await someAsyncOperation()
  console.log("✅ 操作成功")
} catch (error) {
  console.error("❌ 操作失败:", error)
  showToast(`导出失败: ${error.message}`, "error")
}
```

### Platform Adapter Pattern

When adding a new AI platform adapter:

1. Create a new file in `src/contents/adapters/{platform-name}.ts`
2. Extend `BaseAdapter` and implement required methods
3. Add selectors to `src/config/selectors.json`
4. Register in `src/contents/adapters/index.ts`

Template:
```typescript
import { BaseAdapter } from "./base-adapter"
import type { SelectorConfig } from "./base-adapter"
import selectors from "../../config/selectors.json"

export class NewPlatformAdapter extends BaseAdapter {
  platformName = "NewPlatform"
  selectors: SelectorConfig = selectors.platforms.newplatform as SelectorConfig

  detectPlatform(): boolean {
    return window.location.host.includes("platform.com")
  }
}

export function createNewPlatformAdapter(): NewPlatformAdapter {
  return new NewPlatformAdapter()
}
```

### DOM Selectors

All DOM selectors are centralized in `src/config/selectors.json`. Use multiple selectors as fallbacks:

```json
{
  "platformName": {
    "messageContainer": "selector1, selector2, selector3",
    "userMessage": "[data-role='user'], .user-message",
    "aiMessage": "[data-role='assistant'], .assistant-message"
  }
}
```

### Content Script Configuration

Content scripts target specific URLs via `config` export:

```typescript
export const config: PlasmoCSConfig = {
  matches: [
    "https://chat.deepseek.com/*",
    "https://*.deepseek.com/*"
  ]
}
```

### UI Components

- Use inline styles (no CSS files)
- Dark theme with amber (#f59e0b) accents
- Font: JetBrains Mono for monospace, Cinzel for headings
- Toast notifications for user feedback

### State Management

Use Zustand for complex state, Chrome Storage API for persistence:

```typescript
const { obsidianConfig } = await chrome.storage.sync.get("obsidianConfig")
await chrome.storage.sync.set({ obsidianConfig: config })
```

### Testing

**Framework**: Vitest (configured with jsdom environment)

**Test File Location**: Place tests in `__tests__` folder next to source files:
```
src/
├── contents/adapters/__tests__/adapters.test.ts
├── processing/__tests__/markdown-builder.test.ts
├── utils/__tests__/cleaner.test.ts
└── test/
    └── setup.ts          # Test environment setup
```

**Running Tests**:
```bash
pnpm test              # Run all tests once
pnpm test:watch        # Run tests in watch mode
pnpm test:coverage     # Run tests with coverage report
```

**Writing Tests**:
```typescript
import { describe, expect, it, vi } from "vitest"
import { stripHtml } from "../cleaner"

describe("stripHtml", () => {
  it("should remove HTML tags", () => {
    const html = "<p>Hello World</p>"
    expect(stripHtml(html)).toBe("Hello World")
  })
})
```

**Chrome API Mocking**: Chrome extension APIs are automatically mocked in `src/test/setup.ts`:
- `chrome.storage.sync.get/set`
- `chrome.runtime.sendMessage`
- `chrome.tabs.query`

**DOM Testing**: Use `@testing-library/react` for React component tests and `jsdom` for DOM manipulation tests.

## Release Workflow

### Version Rules

- **Major Version (x.0.0)**: Breaking changes, architecture refactoring, significant feature additions, or UI redesign
- **Minor Version (x.y.0)**: New features, platform support additions, significant functionality improvements
- **Patch Version (x.y.z)**: Bug fixes, performance improvements, minor UI tweaks, documentation updates

### Version Update Sequence

1. Update `package.json` version field
2. Update `AGENTS.md` version (if documented)
3. Create git tag with version prefix `v`
4. Push and create GitHub Release

### Release Process

```bash
# 1. Build and test
pnpm test
pnpm build

# 2. Update version in package.json (manually edit)
# Major: x.0.0, Minor: x.y.0, Patch: x.y.z

# 3. Package extension
pnpm package

# 4. Create git tag and push
git add -A
git commit -m "Release v{version}"
git tag -a v{version} -m "Release v{version}"
git push origin main --tags

# 5. Create GitHub Release via CLI
gh release create v{version} \
  --title "Memflow v{version}" \
  --notes "Release notes here" \
  build/chrome-mv3-prod.zip
```

### Release Checklist

- [ ] All tests pass
- [ ] Build completes without errors
- [ ] Package generates `build/chrome-mv3-prod.zip`
- [ ] Version updated in `package.json`
- [ ] Git tag created with `v` prefix
- [ ] GitHub Release created with ZIP attachment
- [ ] CHANGELOG updated (if exists)

### Hotfix Process

For critical bug fixes between regular releases:

```bash
# Create hotfix branch
git checkout -b hotfix/v{patch-version}

# Make fixes, update version to patch
# Commit and tag
git commit -m "Hotfix v{version}"
git tag v{version}

# Merge to main and push
git checkout main
git merge hotfix/v{version}
git push origin main --tags
```

### Debugging Button Issues

If button doesn't appear:

1. **Check Console Logs** - Look for messages with these prefixes:
   - `🔍 开始查找工具栏位置...` - Button location search started
   - `✅ 已定位到...` - Successfully found location
   - `⚠️ 使用备用策略...` - Using fallback position
   - `❌ 无法找到工具栏位置` - Failed to find location
   - `🚀 Memflow 初始化开始...` - Initialization started
   - `⏳ 第 X 次重试...` - Retry attempt

2. **Inspect Elements** - In Chrome DevTools:
   - Search for `#memflow-export-btn` - button element
   - Search for `#memflow-fallback-container` - fallback container
   - Check if styles are being applied correctly

3. **Common Issues**:
   - **Timing**: Button tries to inject before page fully loads (fixed with retry mechanism)
   - **Selectors**: Target website may have updated their DOM structure
   - **Shadow DOM**: Some sites use Shadow DOM which may block injection
   - **Z-Index**: Other elements may overlay the button

### Adding Support for New Site Layouts

If a site doesn't work, add platform-specific selectors to `findToolbarLocation()` in `src/contents/index.tsx`:

```typescript
const headerRightSelectors = [
  // ... existing selectors
  
  // New Platform
  "[class*='new-platform-header'] .actions",
  "#new-platform-toolbar > div:last-child"
]
```

## Debugging Tips

- Use `pnpm dev` for development with hot reload
- Check browser console for emoji-prefixed logs
- Content scripts reload automatically on save
- Extension popup requires manual refresh after changes
- Use Chrome DevTools > Sources > Content Scripts to debug content scripts

## Useful Links

- [Plasmo Documentation](https://docs.plasmo.com/)
- [Chrome Extension Manifest V3](https://developer.chrome.com/docs/extensions/mv3/intro/)
- [Obsidian URI Protocol](https://help.obsidian.md/Extending+Obsidian/Obsidian+URI)