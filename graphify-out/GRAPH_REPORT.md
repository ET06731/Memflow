# Graph Report - .  (2026-05-15)

## Corpus Check
- 68 files · ~85,556 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 497 nodes · 896 edges · 29 communities (16 shown, 13 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 31 edges (avg confidence: 0.82)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_BaseAdapter Core Methods|BaseAdapter Core Methods]]
- [[_COMMUNITY_Configuration & Helper Service|Configuration & Helper Service]]
- [[_COMMUNITY_Markdown Builder & Highlights|Markdown Builder & Highlights]]
- [[_COMMUNITY_YouTube Adapter|YouTube Adapter]]
- [[_COMMUNITY_SmartClip Adapter|SmartClip Adapter]]
- [[_COMMUNITY_AI Service|AI Service]]
- [[_COMMUNITY_Bilibili Adapter|Bilibili Adapter]]
- [[_COMMUNITY_Core Architecture|Core Architecture]]
- [[_COMMUNITY_Floating Ball UI|Floating Ball UI]]
- [[_COMMUNITY_Documentation & Features|Documentation & Features]]
- [[_COMMUNITY_Promo Video Components|Promo Video Components]]
- [[_COMMUNITY_Icon Generation Scripts|Icon Generation Scripts]]
- [[_COMMUNITY_Promo Video Animation|Promo Video Animation]]
- [[_COMMUNITY_Visual Assets|Visual Assets]]
- [[_COMMUNITY_Gemini Adapter|Gemini Adapter]]
- [[_COMMUNITY_Doubao Adapter|Doubao Adapter]]
- [[_COMMUNITY_MarkdownBuilder|MarkdownBuilder]]
- [[_COMMUNITY_Obsidian URI Handler|Obsidian URI Handler]]
- [[_COMMUNITY_Debug Selectors|Debug Selectors]]
- [[_COMMUNITY_Metadata Generator|Metadata Generator]]
- [[_COMMUNITY_Content Script Config|Content Script Config]]
- [[_COMMUNITY_Test Setup|Test Setup]]
- [[_COMMUNITY_Subtitle Extraction|Subtitle Extraction]]
- [[_COMMUNITY_Test Setup Singleton|Test Setup Singleton]]

## God Nodes (most connected - your core abstractions)
1. `YouTubeAdapter` - 42 edges
2. `SmartClipAdapter` - 36 edges
3. `BiliBiliAdapter` - 30 edges
4. `initFloatingBall()` - 16 edges
5. `AIService` - 16 edges
6. `Memflow - 智能剪藏工具` - 16 edges
7. `showToast()` - 15 edges
8. `Conversation` - 12 edges
9. `exportSmart()` - 11 edges
10. `detectPlatformAdapter()` - 11 edges

## Surprising Connections (you probably didn't know these)
- `Memflow - 智能剪藏工具` --uses--> `Plasmo Framework`  [EXTRACTED]
  README.md → AGENTS.md
- `Memflow - 智能剪藏工具` --uses--> `TypeScript`  [EXTRACTED]
  README.md → AGENTS.md
- `Memflow - 智能剪藏工具` --uses--> `React UI`  [EXTRACTED]
  README.md → AGENTS.md
- `Memflow - 智能剪藏工具` --uses--> `Vitest Testing Framework`  [EXTRACTED]
  README.md → AGENTS.md
- `Memflow - 智能剪藏工具` --uses--> `Chrome Storage API`  [EXTRACTED]
  README.md → AGENTS.md

## Hyperedges (group relationships)
- **Platform Adapter Creation Pipeline** — adapters_index_ts, detectplatformadapter, base_adapter_ts, smartclip_adapter [EXTRACTED 0.85]
- **Storage Persistence Layer** — popup_tsx, options_tsx, background_ts, floating_ball_ts, chrome_storage_sync, contents_index_ts [EXTRACTED 0.90]
- **Content Export Flow** — contents_index_ts, detectplatformadapter, smartclip_adapter, markdown_builder, metadata_generator, obsidian_uri_handler, aiservice [EXTRACTED 0.85]
- **Configuration Propagation** — options_tsx, defaults_ts, popup_tsx, chrome_storage_sync, floating_ball_ts [EXTRACTED 0.85]
- **Platform Adapter Pattern** — baseadapter, smartclipadapter, youtubeadapter [EXTRACTED 1.00]
- **Content Processing Pipeline** — smartclipadapter, youtubeadapter, metadatagenerator, markdownbuilder, aiservice [INFERRED 0.85]
- **Export to Obsidian Flow** — markdownbuilder, obsidianurihandler, normalizefolderpath [INFERRED 0.80]
- **Subtitle Extraction Architecture** — youtubeadapter, aiservice, subtitlecompressor, memflowhelperservice [INFERRED 0.75]
- **技术栈** — memflow_project, plasmo_framework, typescript_language, react_ui, vitest_testing [EXTRACTED 1.00]
- **平台适配器** — deepseek_adapter, chatgpt_adapter, kimi_adapter, bilibili_adapter, youtube_adapter [EXTRACTED 1.00]
- **数据处理层** — markdown_builder_module, metadata_generator_module, ai_api_service [EXTRACTED 1.00]
- **核心功能** — smartclip_feature, highlighting_feature, ai_enhancement_feature, bilibili_multi_part_support [EXTRACTED 1.00]
- **B站视频增强计划** — clickable_timestamp_feature, progress_indicator_feature, bilibili_timestamp_link [EXTRACTED 1.00]
- **App Icon Multi-Resolution Set** — icon_svg, icon_128_png, icon_32_png, icon_48_png, icon_16_png, icon_png [INFERRED 0.90]
- **Extension Visual Identity Assets** — icon_svg, floatball_svg, memflow_extension [INFERRED 0.85]

## Communities (29 total, 13 thin omitted)

### Community 0 - "BaseAdapter Core Methods"
Cohesion: 0.07
Nodes (39): appendExtractedMessage(), areContentsEquivalent(), IAdapter, injectPrompt(), injectToInput(), normalizeMessageContent(), SelectorConfig, BilibiliSubtitleCache (+31 more)

### Community 1 - "Configuration & Helper Service"
Cohesion: 0.07
Nodes (37): getDefaultFloatingBallConfig(), getDefaultObsidianConfig(), SupportedLang, ObsidianConfig, HelperJobRecord, HelperOutputFile, MemflowHelperProgressCallbacks, MemflowHelperService (+29 more)

### Community 2 - "Markdown Builder & Highlights"
Cohesion: 0.08
Nodes (44): addHighlight(), animateToastOut(), buildBilibiliEmbed(), buildBilibiliListMarkdown(), buildBilibiliMarkdown(), buildYouTubeEmbed(), buildYouTubeMarkdown(), changeHighlightColor() (+36 more)

### Community 5 - "AI Service"
Cohesion: 0.11
Nodes (17): AIService, ChatMetadataOptions, PROVIDERS, ProviderType, SummarizeOptions, SummarizeResult, cleanWhitespace(), CompressOptions (+9 more)

### Community 7 - "Core Architecture"
Cohesion: 0.1
Nodes (30): Adapter Factory, AI API Service, Background Script, Base Adapter Abstract Class, BaseAdapter, Chrome Storage Sync API, Content Script Main Entry, Conversation Type (+22 more)

### Community 8 - "Floating Ball UI"
Cohesion: 0.17
Nodes (25): applySnap(), createFloatingBall(), createQuickPanel(), debugState(), dismissPanel(), ensureDomReady(), ensureFloatingBallLifecycleMonitor(), ensureFloatingBallStorageListener() (+17 more)

### Community 9 - "Documentation & Features"
Cohesion: 0.09
Nodes (24): AI API Service, AI 增强摘要功能, BaseAdapter Class, Bilibili Video Adapter, B站多Part视频字幕提取, B站时间戳链接格式, ChatGPT Platform Adapter, Chrome Storage API (+16 more)

### Community 10 - "Promo Video Components"
Cohesion: 0.13
Nodes (8): AssetGrid, ButtonContainer, buttonTexts, CoreAssetsProps, CursorWrapper, IconWrapper, Label, SceneContainer

### Community 11 - "Icon Generation Scripts"
Cohesion: 0.24
Nodes (9): find_browser(), generate_icons(), render_svg_to_png(), assetsDir, fs, path, pngPath, sizes (+1 more)

### Community 13 - "Visual Assets"
Cohesion: 0.22
Nodes (10): Donation QR Code, Floatball Icon - Cat Paw Print, Highlight Annotation Feature Demo, App Icon 128px, App Icon 16px, App Icon 32px, App Icon 48px, App Icon Default (+2 more)

### Community 18 - "Debug Selectors"
Cohesion: 0.29
Nodes (6): allMessages, elements, messageElements, possibleAISelectors, possibleMessageContainers, possibleUserSelectors

## Knowledge Gaps
- **112 isolated node(s):** `possibleMessageContainers`, `elements`, `possibleUserSelectors`, `possibleAISelectors`, `allMessages` (+107 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **13 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `YouTubeAdapter` connect `YouTube Adapter` to `BaseAdapter Core Methods`?**
  _High betweenness centrality (0.121) - this node is a cross-community bridge._
- **Why does `SmartClipAdapter` connect `SmartClip Adapter` to `BaseAdapter Core Methods`?**
  _High betweenness centrality (0.100) - this node is a cross-community bridge._
- **Why does `BiliBiliAdapter` connect `Bilibili Adapter` to `BaseAdapter Core Methods`?**
  _High betweenness centrality (0.087) - this node is a cross-community bridge._
- **What connects `possibleMessageContainers`, `elements`, `possibleUserSelectors` to the rest of the system?**
  _112 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `BaseAdapter Core Methods` be split into smaller, more focused modules?**
  _Cohesion score 0.07 - nodes in this community are weakly interconnected._
- **Should `Configuration & Helper Service` be split into smaller, more focused modules?**
  _Cohesion score 0.07 - nodes in this community are weakly interconnected._
- **Should `Markdown Builder & Highlights` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._