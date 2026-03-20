import { useEffect, useState } from "react"

import type { ObsidianConfig } from "./types/index"

type Lang = "zh" | "en"

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
    partialExport: "部分导出",
    partialHint: "进入选择模式，可选单条/多条导出"
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
    partialExport: "Partial Export",
    partialHint: "Enter selection mode to pick messages"
  }
}

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
    autoOpen: true
  })

  const [saved, setSaved] = useState(false)

  useEffect(() => {
    chrome.storage.sync.get("obsidianConfig", (data) => {
      if (data.obsidianConfig) {
        setConfig(data.obsidianConfig)
      }
    })
  }, [])

  const saveConfig = () => {
    chrome.storage.sync.set({ obsidianConfig: config }, () => {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    })
  }

  const openOptions = () => {
    chrome.runtime.openOptionsPage()
  }

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

        .partial-export-btn {
          width: 100%;
          padding: 12px 14px;
          margin-bottom: 8px;
          background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%);
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
        
        .partial-export-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(37, 99, 235, 0.4);
        }

        .tip-text {
          font-size: 10px;
          color: #666;
          text-align: center;
          margin-bottom: 12px;
        }

        .config-preview {
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
        }

        .form-group {
          margin-bottom: 12px;
        }

        .form-label {
          display: block;
          font-size: 11px;
          color: #888;
          margin-bottom: 4px;
        }

        .form-input {
          width: 100%;
          padding: 8px 10px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 6px;
          color: #e5e5e5;
          font-size: 12px;
          box-sizing: border-box;
          outline: none;
        }

        .form-input:focus {
          border-color: rgba(245, 158, 11, 0.4);
          background: rgba(245, 158, 11, 0.02);
        }

        .save-btn {
          width: 100%;
          padding: 8px;
          background: ${saved ? "#10b981" : "rgba(245, 158, 11, 0.1)"};
          color: ${saved ? "#fff" : "#f59e0b"};
          border: 1px solid ${saved ? "#10b981" : "rgba(245, 158, 11, 0.3)"};
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .save-btn:hover {
          background: ${saved ? "#10b981" : "rgba(245, 158, 11, 0.2)"};
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
            <a href="https://github.com/ET06731/Memflow" target="_blank" rel="noopener noreferrer" className="icon-btn" title="GitHub">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
              </svg>
            </a>
            <button className="icon-btn settings" onClick={openOptions} title={t.settings}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            </button>
          </div>
        </div>

        <div className="content-area">
          <button className="quick-export-btn" onClick={async () => {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
            if (tab?.id) chrome.tabs.sendMessage(tab.id, { action: "triggerExport" }).catch(() => {})
          }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            {t.exportChat}
          </button>
          {t.exportHint && <div className="tip-text">{t.exportHint}</div>}

          <button className="smart-export-btn" onClick={async () => {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
            if (tab?.id) chrome.tabs.sendMessage(tab.id, { action: "triggerExportSmart" }).catch(() => {})
          }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
              <path d="M5 3v4" /><path d="M19 17v4" /><path d="M3 5h4" /><path d="M17 19h4" />
            </svg>
            {t.smartExport}
          </button>
          <button className="partial-export-btn" onClick={async () => {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
            if (tab?.id) chrome.tabs.sendMessage(tab.id, { action: "triggerSelectionMode", type: "ENTER_SELECTION_MODE" }).catch(() => {})
          }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <polyline points="9 11 12 14 22 4"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            {t.partialExport}
          </button>
          <div className="tip-text">{t.partialHint}</div>

          <div className="config-preview">
            <div className="form-group">
              <label className="form-label">{t.vaultName}</label>
              <input type="text" className="form-input" value={config.vaultName} onChange={(e) => setConfig({ ...config, vaultName: e.target.value })} placeholder={t.vaultNamePlaceholder} />
            </div>
            <div className="form-group">
              <label className="form-label">{t.defaultFolder}</label>
              <input type="text" className="form-input" value={config.defaultFolder} onChange={(e) => setConfig({ ...config, defaultFolder: e.target.value })} placeholder={t.defaultFolderPlaceholder} />
            </div>
            <button className="save-btn" onClick={saveConfig}>
              {saved ? `✓ ${t.saved}` : t.saveConfig}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

export default Popup
