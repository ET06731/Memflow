import { useEffect, useRef, useState } from "react"
import iconUrl from "url:../assets/icon.png"

import type { AIApiConfig, ObsidianConfig } from "./types/index"

interface TemplateConfig {
  bilibili: {
    enabled: boolean
    templateType: "tech" | "study" | "english" | "coding" | "news" | "custom"
    customTemplate: string
    includeOriginalSubtitles: boolean
    includeTimestamp: boolean
    maxSummaryLength: number
    outputFormat: "markdown" | "obsidian-callout" | "json"
  }
  chat: {
    includeTimestamp: boolean
  }
}

type Lang = "zh" | "en"

const i18n = {
  zh: {
    vaultName: "仓库名称",
    vaultNamePlaceholder: "例如：KnowledgeBase",
    vaultNameHint: "必须与 Obsidian 仓库名称完全一致",
    defaultFolder: "默认文件夹",
    defaultFolderPlaceholder: "AI对话/DeepSeek",
    defaultFolderHint: "使用 / 分隔嵌套文件夹，不要以 / 开头",
    filenameFormat: "文件名格式",
    filenameFormatPlaceholder: "{{date}}-{{title}}",
    filenameFormatHint: "可用变量：{{date}} {{title}} {{platform}}",
    contentFormat: "内容格式",
    callout: "引用块",
    calloutDesc: "Obsidian 风格",
    web: "网页",
    webDesc: "原始风格",
    exportMethod: "导出方式",
    obsidianUri: "Obsidian URI",
    obsidianUriDesc: "直接导入",
    download: "下载",
    downloadDesc: "保存为文件",
    saveSubtitles: "保存字幕原文",
    saveSubtitlesDesc: "导出 B 站视频时包含字幕正文内容",
    saveTimestamp: "包含时间戳",
    saveTimestampDesc: "在字幕前显示对应时间戳（如 [01:23]）",
    autoOpen: "导出后自动打开",
    autoOpenDesc: "自动在 Obsidian 中打开对应笔记",
    saveConfig: "保存配置",
    saved: "已保存",
    aiApiConfig: "AI API 配置",
    aiApiEnabled: "启用 AI 总结",
    aiApiProvider: "API 提供商",
    aiApiKey: "API Key",
    aiApiKeyPlaceholder: "输入你的 API Key",
    aiApiBaseUrl: "Base URL",
    aiApiBaseUrlPlaceholder: "可选：自定义端点",
    aiApiModel: "模型",
    aiApiModelHint: "留空使用默认模型",
    settings: "设置"
  },
  en: {
    vaultName: "Vault Name",
    vaultNamePlaceholder: "e.g., KnowledgeBase",
    vaultNameHint: "Must match your Obsidian vault name exactly",
    defaultFolder: "Default Folder",
    defaultFolderPlaceholder: "AI-Chats/DeepSeek",
    defaultFolderHint: "Use / for nested folders, no leading slash",
    filenameFormat: "Filename Format",
    filenameFormatPlaceholder: "{{date}}-{{title}}",
    filenameFormatHint: "Available: {{date}} {{title}} {{platform}}",
    contentFormat: "Content Format",
    callout: "Callout",
    calloutDesc: "Obsidian Style",
    web: "Web",
    webDesc: "Original Style",
    exportMethod: "Export Method",
    obsidianUri: "Obsidian URI",
    obsidianUriDesc: "Direct import",
    download: "Download",
    downloadDesc: "Save as file",
    saveSubtitles: "Save Original Subtitles",
    saveSubtitlesDesc:
      "Include original subtitle text when exporting Bilibili videos",
    saveTimestamp: "Include Timestamps",
    saveTimestampDesc: "Add timestamps to each subtitle line",
    autoOpen: "Auto-open after export",
    autoOpenDesc: "Automatically open the note in Obsidian",
    saveConfig: "Save Configuration",
    saved: "Saved",
    aiApiConfig: "AI API Configuration",
    aiApiEnabled: "Enable AI Summary",
    aiApiProvider: "API Provider",
    aiApiKey: "API Key",
    aiApiKeyPlaceholder: "Enter your API key",
    aiApiBaseUrl: "Base URL",
    aiApiBaseUrlPlaceholder: "Optional: Custom endpoint",
    aiApiModel: "Model",
    aiApiModelHint: "Leave empty for default model",
    settings: "Settings"
  }
}

function detectLanguage(): Lang {
  const lang = navigator.language || (navigator as any).userLanguage
  if (lang && lang.toLowerCase().startsWith("zh")) {
    return "zh"
  }
  return "en"
}

function Options() {
  const lang = detectLanguage()
  const t = i18n[lang]

  const [config, setConfig] = useState<ObsidianConfig>({
    vaultName: "",
    defaultFolder: lang === "zh" ? "AI对话" : "AI-Chats",
    fileNameFormat: "{{date}}-{{title}}",
    contentFormat: "callout",
    exportMethod: "download",
    autoOpen: true,
    saveSubtitles: true,
    saveSubtitlesWithTimestamp: false
  })

  const [aiConfig, setAiConfig] = useState<AIApiConfig>({
    enabled: false,
    provider: "deepseek",
    apiKey: "",
    baseUrl: "",
    model: "",
    bilibiliPromptTemplate: "tech"
  })

  const [templateConfig, setTemplateConfig] = useState<TemplateConfig>({
    bilibili: {
      enabled: true,
      templateType: "tech",
      customTemplate: "",
      includeOriginalSubtitles: true,
      includeTimestamp: false,
      maxSummaryLength: 2000,
      outputFormat: "markdown"
    },
    chat: {
      includeTimestamp: true
    }
  })

  const [activeTab, setActiveTab] = useState<
    "general" | "template" | "ai" | "about"
  >("general")
  const [saved, setSaved] = useState(false)

  const providers = [
    { id: "openai", name: "OpenAI", defaultModel: "gpt-3.5-turbo" },
    { id: "deepseek", name: "DeepSeek", defaultModel: "deepseek-chat" },
    { id: "kimi", name: "Kimi", defaultModel: "moonshot-v1-8k" },
    { id: "gemini", name: "Gemini", defaultModel: "gemini-1.5-flash" },
    { id: "custom", name: "自定义", defaultModel: "" }
  ]

  useEffect(() => {
    chrome.storage.sync.get(
      ["obsidianConfig", "aiApiConfig", "templateConfig"],
      (data) => {
        if (data.obsidianConfig) setConfig(data.obsidianConfig)
        if (data.aiApiConfig) setAiConfig(data.aiApiConfig)
        if (data.templateConfig) {
          setTemplateConfig({
            bilibili: {
              ...templateConfig.bilibili,
              ...data.templateConfig.bilibili
            },
            chat: {
              ...templateConfig.chat,
              ...data.templateConfig.chat
            }
          })
        }
      }
    )
  }, [])

  const saveConfig = () => {
    chrome.storage.sync.set(
      {
        obsidianConfig: config,
        aiApiConfig: aiConfig,
        templateConfig: templateConfig
      },
      () => {
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      }
    )
  }

  const isValid = config.vaultName.trim().length > 0

  // Custom Select Component for better UI
  const CustomSelect = ({
    value,
    options,
    onChange,
    label
  }: {
    value: string
    options: { id: string; name: string; icon?: string }[]
    onChange: (val: any) => void
    label: string
  }) => {
    const [isOpen, setIsOpen] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          containerRef.current &&
          !containerRef.current.contains(event.target as Node)
        ) {
          setIsOpen(false)
        }
      }
      document.addEventListener("mousedown", handleClickOutside)
      return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    const selectedOption = options.find((o) => o.id === value) || options[0]

    return (
      <div className="custom-select-container" ref={containerRef}>
        <label className="form-label">{label}</label>
        <div
          className={`select-trigger ${isOpen ? "active" : ""}`}
          onClick={() => setIsOpen(!isOpen)}>
          <div className="select-value">
            {selectedOption.icon && (
              <span className="option-icon">{selectedOption.icon}</span>
            )}
            <span>{selectedOption.name}</span>
          </div>
          <svg
            className={`chevron ${isOpen ? "open" : ""}`}
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>
        {isOpen && (
          <div className="select-dropdown">
            {options.map((option) => (
              <div
                key={option.id}
                className={`select-option ${value === option.id ? "selected" : ""}`}
                onClick={() => {
                  onChange(option.id)
                  setIsOpen(false)
                }}>
                {option.icon && (
                  <span className="option-icon">{option.icon}</span>
                )}
                <span>{option.name}</span>
                {value === option.id && (
                  <svg
                    className="check-icon"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      <style>{`
        /* ... existing styles ... */
        .custom-select-container {
          position: relative;
          margin-bottom: 24px;
        }
        .select-trigger {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 14px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          font-size: 14px;
          color: #e5e5e5;
          user-select: none;
        }
        .select-trigger:hover {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(245, 158, 11, 0.4);
        }
        .select-trigger.active {
          border-color: #f59e0b;
          background: rgba(245, 158, 11, 0.05);
          box-shadow: 0 0 0 1px rgba(245, 158, 11, 0.2);
        }
        .select-value {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .option-icon {
          font-size: 16px;
          filter: drop-shadow(0 0 2px rgba(0,0,0,0.5));
        }
        .chevron {
          transition: transform 0.3s ease;
          color: #666;
        }
        .chevron.open {
          transform: rotate(180deg);
          color: #f59e0b;
        }
        .select-dropdown {
          position: absolute;
          top: calc(100% + 6px);
          left: 0;
          right: 0;
          background: #1a1a24;
          border: 1px solid rgba(245, 158, 11, 0.3);
          border-radius: 10px;
          overflow: hidden;
          z-index: 1000;
          box-shadow: 0 10px 30px rgba(0,0,0,0.6);
          animation: slideDown 0.2s ease-out;
          backdrop-filter: blur(20px);
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .select-option {
          padding: 12px 14px;
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          transition: all 0.15s;
          font-size: 14px;
          color: #bbb;
        }
        .select-option:hover {
          background: rgba(245, 158, 11, 0.1);
          color: #fff;
        }
        .select-option.selected {
          background: rgba(245, 158, 11, 0.15);
          color: #f59e0b;
          font-weight: 500;
        }
        .check-icon {
          margin-left: auto;
        }
        body, html {
          margin: 0;
          padding: 0;
          background: #0d0d12;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          color: #e5e5e5;
          height: 100vh;
        }
        .options-page {
          max-width: 900px;
          height: calc(100vh - 80px);
          margin: 40px auto;
          background: #12121a;
          border-radius: 12px;
          border: 1px solid rgba(245, 158, 11, 0.2);
          box-shadow: 0 10px 40px rgba(0,0,0,0.5);
          display: flex;
          overflow: hidden;
        }
        .sidebar {
          width: 200px;
          background: rgba(0, 0, 0, 0.2);
          border-right: 1px solid rgba(255, 255, 255, 0.05);
          display: flex;
          flex-direction: column;
        }
        .sidebar-header {
          padding: 24px;
          font-size: 18px;
          font-weight: 600;
          color: #f59e0b;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          font-family: 'Cinzel', serif;
        }
        .tab {
          padding: 16px 24px;
          cursor: pointer;
          color: #888;
          transition: all 0.2s ease;
          border-left: 3px solid transparent;
          font-size: 14px;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .tab:hover {
          color: #e5e5e5;
          background: rgba(255, 255, 255, 0.02);
        }
        .tab.active {
          color: #f59e0b;
          border-left-color: #f59e0b;
          background: rgba(245, 158, 11, 0.05);
        }
        .main-view {
          flex: 1;
          display: flex;
          flex-direction: column;
        }
        .content {
          flex: 1;
          padding: 32px;
          overflow-y: auto;
        }
        .section-title {
          font-size: 16px;
          font-weight: 600;
          color: #f5f5f5;
          margin: 0 0 24px 0;
          padding-bottom: 8px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        .form-group {
          margin-bottom: 24px;
        }
        .form-label {
          display: block;
          font-size: 13px;
          font-weight: 500;
          color: #aaa;
          margin-bottom: 8px;
        }
        .form-input {
          width: 100%;
          padding: 10px 12px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 6px;
          color: #e5e5e5;
          box-sizing: border-box;
          font-size: 14px;
        }
        .form-input:focus {
          border-color: #f59e0b;
          outline: none;
          background: rgba(245, 158, 11, 0.02);
        }
        .input-hint {
          display: block;
          font-size: 12px;
          color: #666;
          margin-top: 6px;
        }
        .method-selector {
          display: flex;
          gap: 12px;
        }
        .method-option {
          flex: 1;
        }
        .method-radio {
          display: none;
        }
        .method-label {
          display: block;
          padding: 12px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          cursor: pointer;
          text-align: center;
          transition: all 0.2s;
        }
        .method-radio:checked + .method-label {
          background: rgba(245, 158, 11, 0.1);
          border-color: #f59e0b;
        }
        .checkbox-label {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          cursor: pointer;
        }
        .checkbox-input {
          accent-color: #f59e0b;
          width: 16px;
          height: 16px;
          margin: 2px 0 0 0;
        }
        .checkbox-text {
          display: flex;
          flex-direction: column;
        }
        .checkbox-title {
          font-size: 14px;
          font-weight: 500;
        }
        .checkbox-desc {
          font-size: 12px;
          color: #888;
          margin-top: 4px;
        }
        .save-bar {
          padding: 16px 32px;
          background: rgba(0, 0, 0, 0.2);
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          display: flex;
          justify-content: flex-end;
        }
        .save-button {
          padding: 10px 32px;
          border: none;
          border-radius: 6px;
          background: #f59e0b;
          color: #000;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .save-button:hover {
          background: #fbbf24;
          transform: translateY(-1px);
        }
        .save-button:disabled {
          background: #333;
          color: #666;
          cursor: not-allowed;
        }
        .save-button.saved {
          background: #10b981;
          color: white;
        }
        .about-card {
          text-align: center;
          padding: 40px 0;
        }
        .brand-logo {
          width: 80px;
          height: 80px;
          margin-bottom: 24px;
          filter: drop-shadow(0 0 20px rgba(245, 158, 11, 0.3));
        }
      `}</style>
      <div className="options-page">
        <div className="sidebar">
          <div className="sidebar-header">Memflow Settings</div>
          <div
            className={`tab ${activeTab === "general" ? "active" : ""}`}
            onClick={() => setActiveTab("general")}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
            {lang === "zh" ? "通用设置" : "General"}
          </div>
          <div
            className={`tab ${activeTab === "template" ? "active" : ""}`}
            onClick={() => setActiveTab("template")}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
            {lang === "zh" ? "模板设置" : "Template"}
          </div>
          <div
            className={`tab ${activeTab === "ai" ? "active" : ""}`}
            onClick={() => setActiveTab("ai")}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="14" x="3" y="8" rx="2"/><path d="M12 5a3 3 0 1 0-3 3"/><path d="M9 8v2"/><path d="M15 8v2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>
            {t.aiApiConfig}
          </div>
          <div
            className={`tab ${activeTab === "about" ? "active" : ""}`}
            onClick={() => setActiveTab("about")}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
            {lang === "zh" ? "关于 Memflow" : "About"}
          </div>
        </div>

        <div className="main-view">
          <div className="content">
            {activeTab === "general" && (
              <>
                <h2 className="section-title">
                  {lang === "zh"
                    ? "Obsidian 导出配置"
                    : "Obsidian Export Configuration"}
                </h2>
                <div className="form-group">
                  <label className="form-label">
                    {t.vaultName} <span style={{ color: "#f59e0b" }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={config.vaultName}
                    onChange={(e) =>
                      setConfig({ ...config, vaultName: e.target.value })
                    }
                    placeholder={t.vaultNamePlaceholder}
                  />
                  <span className="input-hint">{t.vaultNameHint}</span>
                </div>
                <div className="form-group">
                  <label className="form-label">{t.defaultFolder}</label>
                  <input
                    type="text"
                    className="form-input"
                    value={config.defaultFolder}
                    onChange={(e) =>
                      setConfig({ ...config, defaultFolder: e.target.value })
                    }
                    placeholder={t.defaultFolderPlaceholder}
                  />
                  <span className="input-hint">{t.defaultFolderHint}</span>
                </div>
                <div className="form-group">
                  <label className="form-label">{t.filenameFormat}</label>
                  <input
                    type="text"
                    className="form-input"
                    value={config.fileNameFormat}
                    onChange={(e) =>
                      setConfig({ ...config, fileNameFormat: e.target.value })
                    }
                    placeholder={t.filenameFormatPlaceholder}
                  />
                  <span className="input-hint">{t.filenameFormatHint}</span>
                </div>
                <div className="form-group">
                  <label className="form-label">{t.contentFormat}</label>
                  <div className="method-selector">
                    <div className="method-option">
                      <input
                        type="radio"
                        id="callout"
                        name="contentFormat"
                        className="method-radio"
                        checked={config.contentFormat === "callout"}
                        onChange={() =>
                          setConfig({ ...config, contentFormat: "callout" })
                        }
                      />
                      <label htmlFor="callout" className="method-label">
                        <b>{t.callout}</b>
                        <br />
                        <small>{t.calloutDesc}</small>
                      </label>
                    </div>
                    <div className="method-option">
                      <input
                        type="radio"
                        id="web"
                        name="contentFormat"
                        className="method-radio"
                        checked={config.contentFormat === "web"}
                        onChange={() =>
                          setConfig({ ...config, contentFormat: "web" })
                        }
                      />
                      <label htmlFor="web" className="method-label">
                        <b>{t.web}</b>
                        <br />
                        <small>{t.webDesc}</small>
                      </label>
                    </div>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">{t.exportMethod}</label>
                  <div className="method-selector">
                    <div className="method-option">
                      <input
                        type="radio"
                        id="uri"
                        name="exportMethod"
                        className="method-radio"
                        checked={config.exportMethod === "uri"}
                        onChange={() =>
                          setConfig({ ...config, exportMethod: "uri" })
                        }
                      />
                      <label htmlFor="uri" className="method-label">
                        <b>{t.obsidianUri}</b>
                        <br />
                        <small>{t.obsidianUriDesc}</small>
                      </label>
                    </div>
                    <div className="method-option">
                      <input
                        type="radio"
                        id="download"
                        name="exportMethod"
                        className="method-radio"
                        checked={config.exportMethod === "download"}
                        onChange={() =>
                          setConfig({ ...config, exportMethod: "download" })
                        }
                      />
                      <label htmlFor="download" className="method-label">
                        <b>{t.download}</b>
                        <br />
                        <small>{t.downloadDesc}</small>
                      </label>
                    </div>
                  </div>
                </div>
                {config.exportMethod === "uri" && (
                  <div className="form-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        className="checkbox-input"
                        checked={config.autoOpen}
                        onChange={(e) =>
                          setConfig({ ...config, autoOpen: e.target.checked })
                        }
                      />
                      <div className="checkbox-text">
                        <span className="checkbox-title">{t.autoOpen}</span>
                        <span className="checkbox-desc">{t.autoOpenDesc}</span>
                      </div>
                    </label>
                  </div>
                )}
                <div className="form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      className="checkbox-input"
                      checked={config.saveSubtitles}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          saveSubtitles: e.target.checked
                        })
                      }
                    />
                    <div className="checkbox-text">
                      <span className="checkbox-title">{t.saveSubtitles}</span>
                      <span className="checkbox-desc">
                        {t.saveSubtitlesDesc}
                      </span>
                    </div>
                  </label>
                </div>
                <div className="form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      className="checkbox-input"
                      checked={config.saveSubtitlesWithTimestamp}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          saveSubtitlesWithTimestamp: e.target.checked
                        })
                      }
                    />
                    <div className="checkbox-text">
                      <span className="checkbox-title">{t.saveTimestamp}</span>
                      <span className="checkbox-desc">
                        {t.saveTimestampDesc}
                      </span>
                    </div>
                  </label>
                </div>
              </>
            )}

            {activeTab === "template" && (
              <>
                <h2 className="section-title">
                  {lang === "zh"
                    ? "B站视频总结模板"
                    : "Bilibili Summary Template"}
                </h2>
                <div className="form-group">
                  <CustomSelect
                    label={lang === "zh" ? "首选模板风格" : "Template Style"}
                    value={templateConfig.bilibili.templateType}
                    options={[
                      { id: "tech", name: "💻 科技专栏" },
                      { id: "study", name: "📚 知识梳理" },
                      { id: "english", name: "🌐 英语学习" },
                      { id: "coding", name: "🔥 代码教程" },
                      { id: "news", name: "📰 资讯简报" },
                      { id: "custom", name: "✏️ 自定义模板" }
                    ]}
                    onChange={(val) =>
                      setTemplateConfig({
                        ...templateConfig,
                        bilibili: {
                          ...templateConfig.bilibili,
                          templateType: val
                        }
                      })
                    }
                  />
                </div>
                {templateConfig.bilibili.templateType === "custom" && (
                  <div className="form-group">
                    <label className="form-label">
                      {lang === "zh" ? "提示词定义" : "Prompt Definition"}
                    </label>
                    <textarea
                      className="form-input"
                      value={templateConfig.bilibili.customTemplate}
                      onChange={(e) =>
                        setTemplateConfig({
                          ...templateConfig,
                          bilibili: {
                            ...templateConfig.bilibili,
                            customTemplate: e.target.value
                          }
                        })
                      }
                      rows={8}
                    />
                    <span className="input-hint">
                      {lang === "zh"
                        ? "变量：{{title}}, {{summary}}, {{subtitles}}, {{url}}"
                        : "Vars: {{title}}, {{summary}}, {{subtitles}}, {{url}}"}
                    </span>
                  </div>
                )}
                <div className="form-group">
                  <CustomSelect
                    label={lang === "zh" ? "输出格式" : "Output Format"}
                    value={templateConfig.bilibili.outputFormat}
                    options={[
                      { id: "markdown", name: "Markdown" },
                      {
                        id: "obsidian-callout",
                        name: "Obsidian Callout (🎨 推荐)"
                      },
                      { id: "json", name: "Raw JSON" }
                    ]}
                    onChange={(val) =>
                      setTemplateConfig({
                        ...templateConfig,
                        bilibili: {
                          ...templateConfig.bilibili,
                          outputFormat: val
                        }
                      })
                    }
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">
                    {lang === "zh" ? "摘要长度上限 (字)" : "Max Summary Length"}
                  </label>
                  <input
                    type="number"
                    className="form-input"
                    value={templateConfig.bilibili.maxSummaryLength}
                    onChange={(e) =>
                      setTemplateConfig({
                        ...templateConfig,
                        bilibili: {
                          ...templateConfig.bilibili,
                          maxSummaryLength: parseInt(e.target.value) || 2000
                        }
                      })
                    }
                  />
                </div>
              </>
            )}

            {activeTab === "ai" && (
              <>
                <h2 className="section-title">
                  {lang === "zh" ? "AI API 服务配置" : "AI API Configuration"}
                </h2>
                <div className="form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      className="checkbox-input"
                      checked={aiConfig.enabled}
                      onChange={(e) =>
                        setAiConfig({ ...aiConfig, enabled: e.target.checked })
                      }
                    />
                    <div className="checkbox-text">
                      <span className="checkbox-title">{t.aiApiEnabled}</span>
                      <span className="checkbox-desc">
                        {lang === "zh"
                          ? "启用后可对视频字幕进行多维度的智能分析"
                          : "Enable AI-powered video analysis"}
                      </span>
                    </div>
                  </label>
                </div>
                {aiConfig.enabled && (
                  <>
                    <div className="form-group">
                      <CustomSelect
                        label={t.aiApiProvider}
                        value={aiConfig.provider}
                        options={providers.map((p) => ({
                          id: p.id,
                          name: p.name
                        }))}
                        onChange={(val) => {
                          const provider = providers.find((p) => p.id === val)
                          setAiConfig({
                            ...aiConfig,
                            provider: val as AIApiConfig["provider"],
                            model: provider?.defaultModel || ""
                          })
                        }}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">
                        {t.aiApiKey} <span style={{ color: "#ef4444" }}>*</span>
                      </label>
                      <input
                        type="password"
                        className="form-input"
                        value={aiConfig.apiKey}
                        onChange={(e) =>
                          setAiConfig({ ...aiConfig, apiKey: e.target.value })
                        }
                      />
                    </div>
                    {aiConfig.provider === "custom" && (
                      <div className="form-group">
                        <label className="form-label">{t.aiApiBaseUrl}</label>
                        <input
                          type="text"
                          className="form-input"
                          value={aiConfig.baseUrl}
                          onChange={(e) =>
                            setAiConfig({
                              ...aiConfig,
                              baseUrl: e.target.value
                            })
                          }
                          placeholder="https://api.your-provider.com/v1"
                        />
                      </div>
                    )}
                    <div className="form-group">
                      <label className="form-label">{t.aiApiModel}</label>
                      <input
                        type="text"
                        className="form-input"
                        value={aiConfig.model}
                        onChange={(e) =>
                          setAiConfig({ ...aiConfig, model: e.target.value })
                        }
                        placeholder="gpt-4o / deepseek-reasoner"
                      />
                    </div>
                  </>
                )}
              </>
            )}

            {activeTab === "about" && (
              <div className="about-card">
                <img src={iconUrl} alt="Memflow Logo" className="brand-logo" />
                <h3
                  style={{
                    fontSize: "28px",
                    margin: "0 0 12px 0",
                    fontFamily: "'Cinzel', serif"
                  }}>
                  MemFlow
                </h3>
                <p style={{ color: "#888", marginBottom: "32px" }}>
                  Extension v1.1.0 (PRO)
                </p>
                <p
                  style={{
                    lineHeight: "1.6",
                    maxWidth: "400px",
                    margin: "0 auto",
                    color: "#aaa"
                  }}>
                  {lang === "zh"
                    ? "记忆流动 - 打通 AI 平台与 Obsidian 的最后一公里。让每一个灵感都被妥善保存。"
                    : "Bridge the gap between AI platforms and Obsidian. Make sure every spark of thought is preserved."}
                </p>
                <div style={{ marginTop: "48px" }}>
                  <a
                    href="https://github.com/ET06731/Memflow"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: "#f59e0b",
                      textDecoration: "none",
                      fontSize: "14px"
                    }}>
                    View on GitHub →
                  </a>
                </div>
              </div>
            )}
          </div>

          <div className="save-bar">
            <button
              className={`save-button ${saved ? "saved" : ""}`}
              onClick={saveConfig}
              disabled={!isValid}>
              {saved ? t.saved : t.saveConfig}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

export default Options
