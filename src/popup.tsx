import { useEffect, useState } from "react"

import type { AIApiConfig, ObsidianConfig } from "./types/index"

type Lang = "zh" | "en"

interface TemplateConfig {
  bilibili: {
    enabled: boolean
    templateType: "tech" | "study" | "coding" | "news" | "custom"
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

const i18n = {
  zh: {
    vaultName: "仓库名称",
    vaultNamePlaceholder: "例如 KnowledgeBase",
    defaultFolder: "默认文件夹",
    defaultFolderPlaceholder: "AI对话/DeepSeek",
    saveConfig: "保存配置",
    saved: "已保存",
    exportChat: "立即导出",
    smartExport: "智能导出",
    exportHint: "",
    smartHint: "使用 AI 模型总结字幕",
    settings: "设置",
    templateType: "总结风格",
    includeSubtitles: "包含字幕原文",
    includeTimestamps: "包含时间戳",
    customTemplate: "自定义模板"
  },
  en: {
    vaultName: "Vault Name",
    vaultNamePlaceholder: "e.g., KnowledgeBase",
    defaultFolder: "Default Folder",
    defaultFolderPlaceholder: "AI-Chats/DeepSeek",
    saveConfig: "Save Configuration",
    saved: "Saved",
    exportChat: "Quick Export",
    smartExport: "Smart Export",
    exportHint: "",
    smartHint: "Summarize subtitles with AI model",
    settings: "Settings",
    templateType: "Template Style",
    includeSubtitles: "Include Subtitles",
    includeTimestamps: "Include Timestamps",
    customTemplate: "Custom Template"
  }
}

const templateOptions = [
  { id: "tech", name: "💻 科技", nameEn: "Tech" },
  { id: "study", name: "📚 知识", nameEn: "Study" },
  { id: "coding", name: "🔥 代码", nameEn: "Coding" },
  { id: "news", name: "📰 资讯", nameEn: "News" },
  { id: "custom", name: "✏️ 自定义", nameEn: "Custom" }
]

function detectLanguage(): Lang {
  const lang = navigator.language || (navigator as any).userLanguage
  if (lang && lang.toLowerCase().startsWith("zh")) {
    return "zh"
  }
  return "en"
}

function Popup() {
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
    saveSubtitlesWithTimestamp: true
  })

  const [templateConfig, setTemplateConfig] = useState<TemplateConfig>({
    bilibili: {
      enabled: true,
      templateType: "tech",
      customTemplate: "",
      includeOriginalSubtitles: true,
      includeTimestamp: true,
      maxSummaryLength: 2000,
      outputFormat: "markdown"
    },
    chat: {
      includeTimestamp: true
    }
  })

  const [saved, setSaved] = useState(false)
  const [showTemplateSettings, setShowTemplateSettings] = useState(false)

  useEffect(() => {
    chrome.storage.sync.get(["obsidianConfig", "templateConfig"], (data) => {
      if (data.obsidianConfig) {
        setConfig(data.obsidianConfig)
      }
      if (data.templateConfig) {
        setTemplateConfig(data.templateConfig)
      }
    })
  }, [])

  const saveConfig = () => {
    chrome.storage.sync.set(
      { obsidianConfig: config, templateConfig: templateConfig },
      () => {
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      }
    )
  }

  const openOptions = () => {
    chrome.runtime.openOptionsPage()
  }

  const currentTemplate =
    templateOptions.find(
      (o) => o.id === templateConfig.bilibili.templateType
    ) || templateOptions[0]

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600;700&family=JetBrains+Mono:wght@300;400;500;600&display=swap');
        
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        
        .popup-container {
          width: 320px;
          background: linear-gradient(135deg, #0a0a0f 0%, #12121a 50%, #0d0d12 100%);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          color: #e5e5e5;
          position: relative;
          overflow: hidden;
        }
        
        body, html {
          margin: 0;
          padding: 0;
        }
        
        .noise-overlay {
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          opacity: 0.03;
          pointer-events: none;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
        }
        
        .ambient-glow {
          position: absolute;
          top: -50%; right: -30%;
          width: 300px; height: 300px;
          background: radial-gradient(circle, rgba(245, 158, 11, 0.15) 0%, transparent 70%);
          pointer-events: none;
          animation: float 8s ease-in-out infinite;
        }
        
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          background: linear-gradient(180deg, rgba(245, 158, 11, 0.08) 0%, transparent 100%);
          border-bottom: 1px solid rgba(245, 158, 11, 0.15);
        }

        .brand-title {
          font-family: 'Cinzel', serif;
          font-size: 16px;
          font-weight: 600;
          color: #f59e0b;
          margin: 0;
        }

        .header-actions {
          display: flex;
          gap: 8px;
        }

        .icon-btn {
          width: 28px;
          height: 28px;
          border: none;
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.05);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          color: #aaa;
        }

        .icon-btn:hover {
          background: rgba(245, 158, 11, 0.2);
          color: #f59e0b;
        }

        .icon-btn.settings:hover {
          transform: rotate(45deg);
        }

        .content-area {
          padding: 16px;
          position: relative;
          z-index: 10;
        }

        .quick-export-btn {
          width: 100%;
          padding: 12px 14px;
          margin-bottom: 8px;
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          border: none;
          border-radius: 10px;
          font-family: inherit;
          font-size: 14px;
          font-weight: 600;
          color: #000;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        
        .quick-export-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(245, 158, 11, 0.4);
        }
        
        .smart-export-btn {
          width: 100%;
          padding: 12px 14px;
          margin-bottom: 8px;
          background: linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%);
          border: none;
          border-radius: 10px;
          font-family: inherit;
          font-size: 14px;
          font-weight: 600;
          color: #fff;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .smart-export-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(255, 107, 107, 0.4);
        }

        .template-section {
          margin-top: 16px;
          padding: 14px;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .template-section:hover {
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(245, 158, 11, 0.2);
        }

        .template-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: pointer;
          user-select: none;
        }

        .template-title {
          font-size: 13px;
          font-weight: 500;
          color: #eee;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .template-toggle {
          font-size: 11px;
          color: #f59e0b;
          background: rgba(245, 158, 11, 0.1);
          padding: 2px 8px;
          border-radius: 12px;
          transition: all 0.2s;
        }

        .template-header:hover .template-toggle {
          background: rgba(245, 158, 11, 0.2);
        }

        .template-options {
          margin-top: 14px;
          padding-top: 14px;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          animation: fadeIn 0.3s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-5px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .template-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 8px;
          margin-bottom: 16px;
        }

        .template-option {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          padding: 8px 4px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 8px;
          cursor: pointer;
          font-size: 10px;
          color: #888;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .template-option:hover {
          background: rgba(245, 158, 11, 0.08);
          border-color: rgba(245, 158, 11, 0.3);
          color: #eee;
          transform: translateY(-2px);
        }

        .template-option.active {
          background: rgba(245, 158, 11, 0.15);
          border-color: #f59e0b;
          color: #f59e0b;
          box-shadow: 0 4px 12px rgba(245, 158, 11, 0.15);
        }

        .template-option-icon {
          font-size: 16px;
          margin-bottom: 2px;
        }

        .checkbox-group {
          background: rgba(0, 0, 0, 0.2);
          padding: 8px 12px;
          border-radius: 8px;
          margin-bottom: 12px;
        }

        .checkbox-row {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 0;
        }

        .checkbox-row input[type="checkbox"] {
          accent-color: #f59e0b;
          width: 15px;
          height: 15px;
          cursor: pointer;
        }

        .checkbox-row label {
          font-size: 12px;
          color: #bbb;
          cursor: pointer;
          transition: color 0.2s;
        }

        .checkbox-row:hover label {
          color: #eee;
        }

        .custom-template {
          margin-top: 12px;
        }

        .custom-template textarea {
          width: 100%;
          padding: 10px;
          background: rgba(0, 0, 0, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          color: #e5e5e5;
          font-size: 11px;
          font-family: 'JetBrains Mono', monospace;
          resize: vertical;
          min-height: 80px;
          box-sizing: border-box;
          transition: all 0.2s;
        }

        .custom-template textarea:focus {
          outline: none;
          border-color: rgba(245, 158, 11, 0.5);
          background: rgba(245, 158, 11, 0.03);
          box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.1);
        }

        .config-card {
          margin-top: 12px;
          padding: 14px;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .form-group {
          margin-bottom: 14px;
        }

        .form-label {
          display: block;
          font-size: 11px;
          font-weight: 600;
          color: #888;
          margin-bottom: 6px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .form-input {
          width: 100%;
          padding: 10px 12px;
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          color: #e5e5e5;
          font-size: 13px;
          box-sizing: border-box;
          outline: none;
          transition: all 0.2s;
        }

        .form-input:focus {
          border-color: rgba(245, 158, 11, 0.5);
          background: rgba(245, 158, 11, 0.03);
          box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.1);
        }

        .save-btn {
          width: 100%;
          padding: 10px;
          margin-top: 8px;
          background: ${saved ? "#10b981" : "rgba(245, 158, 11, 0.1)"};
          color: ${saved ? "#fff" : "#f59e0b"};
          border: 1px solid ${saved ? "#10b981" : "rgba(245, 158, 11, 0.3)"};
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }

        .save-btn:hover {
          background: ${saved ? "#059669" : "rgba(245, 158, 11, 0.2)"};
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }
        
        .save-btn:active {
          transform: translateY(0);
        }
      `}</style>

      <div className="popup-container">
        <div className="noise-overlay" />
        <div className="ambient-glow" />

        <div className="header">
          <div className="brand">
            <h1 className="brand-title">MemFlow</h1>
          </div>
          <div className="header-actions">
            <a
              href="https://github.com/ET06731/Memflow"
              target="_blank"
              rel="noopener noreferrer"
              className="icon-btn"
              title="GitHub">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round">
                <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
              </svg>
            </a>
            <button
              className="icon-btn settings"
              onClick={openOptions}
              title={t.settings}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round">
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </button>
          </div>
        </div>

        <div className="content-area">
          <button
            className="quick-export-btn"
            onClick={async () => {
              const [tab] = await chrome.tabs.query({
                active: true,
                currentWindow: true
              })
              if (tab?.id)
                chrome.tabs
                  .sendMessage(tab.id, { action: "triggerExport" })
                  .catch(() => {})
            }}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            {t.exportChat}
          </button>

          <button
            className="smart-export-btn"
            onClick={async () => {
              const [tab] = await chrome.tabs.query({
                active: true,
                currentWindow: true
              })
              if (tab?.id)
                chrome.tabs
                  .sendMessage(tab.id, { action: "triggerExportSmart" })
                  .catch(() => {})
            }}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round">
              <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
              <path d="M5 3v4" />
              <path d="M19 17v4" />
              <path d="M3 5h4" />
              <path d="M17 19h4" />
            </svg>
            {t.smartExport}
          </button>

          <div className="config-card">
            <div className="form-group">
              <label className="form-label">{t.vaultName}</label>
              <input
                type="text"
                className="form-input"
                value={config.vaultName}
                onChange={(e) =>
                  setConfig({ ...config, vaultName: e.target.value })
                }
                placeholder={t.vaultNamePlaceholder}
              />
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
            </div>
            <button className="save-btn" onClick={saveConfig}>
              {saved ? (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  {t.saved}
                </>
              ) : (
                t.saveConfig
              )}
            </button>
          </div>

          <div className="template-section">
            <div
              className="template-header"
              onClick={() => setShowTemplateSettings(!showTemplateSettings)}>
              <span className="template-title">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
                {t.templateType}:{" "}
                {lang === "zh" ? currentTemplate.name.split(" ")[1] : currentTemplate.nameEn}
              </span>
              <span className="template-toggle">
                {showTemplateSettings ? (
                  <>
                    收起{" "}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="10"
                      height="10"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round">
                      <polyline points="18 15 12 9 6 15" />
                    </svg>
                  </>
                ) : (
                  <>
                    设置{" "}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="10"
                      height="10"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </>
                )}
              </span>
            </div>

            {showTemplateSettings && (
              <div className="template-options">
                <div className="template-grid">
                  {templateOptions.map((opt) => (
                    <div
                      key={opt.id}
                      className={`template-option ${templateConfig.bilibili.templateType === opt.id ? "active" : ""}`}
                      onClick={() =>
                        setTemplateConfig({
                          ...templateConfig,
                          bilibili: {
                            ...templateConfig.bilibili,
                            templateType: opt.id as any
                          }
                        })
                      }
                      title={lang === "zh" ? opt.name : opt.nameEn}>
                      <span className="template-option-icon">
                        {opt.name.split(" ")[0]}
                      </span>
                      <span>
                        {lang === "zh"
                          ? opt.name.split(" ")[1]
                          : opt.nameEn}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="checkbox-group">
                  <div className="checkbox-row">
                    <input
                      type="checkbox"
                      id="includeSubtitles"
                      checked={config.saveSubtitles}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          saveSubtitles: e.target.checked
                        })
                      }
                    />
                    <label htmlFor="includeSubtitles">
                      {t.includeSubtitles}
                    </label>
                  </div>

                  <div className="checkbox-row">
                    <input
                      type="checkbox"
                      id="includeTimestamps"
                      checked={config.saveSubtitlesWithTimestamp}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          saveSubtitlesWithTimestamp: e.target.checked
                        })
                      }
                    />
                    <label htmlFor="includeTimestamps">
                      {t.includeTimestamps}
                    </label>
                  </div>
                </div>

                {templateConfig.bilibili.templateType === "custom" && (
                  <div className="custom-template">
                    <textarea
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
                      placeholder={
                        lang === "zh"
                          ? "输入自定义提示词模板..."
                          : "Enter custom prompt template..."
                      }
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

export default Popup
