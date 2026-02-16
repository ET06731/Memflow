import { useEffect, useRef, useState } from "react"

interface ObsidianConfig {
  vaultName: string
  defaultFolder: string
  fileNameFormat: string
  contentFormat: "callout" | "web"
  exportMethod: "uri" | "download"
}

// 多语言配置
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
    saveConfig: "保存配置",
    saved: "已保存",
    essentialNotes: "重要提示",
    helpItems: [
      "首次使用需要允许 Obsidian URI 协议访问",
      "仓库名称区分大小写，必须完全匹配",
      "不存在的文件夹会自动创建",
      "URI 方式失败时会自动降级为下载",
      "内容过长时会自动复制到剪贴板，请按 Ctrl+V 粘贴"
    ],
    version: "v1.0.0"
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
    saveConfig: "Save Configuration",
    saved: "Saved",
    essentialNotes: "Essential Notes",
    helpItems: [
      "First use requires allowing Obsidian URI scheme access",
      "Vault names are case-sensitive and must match exactly",
      "Non-existent folders will be created automatically",
      "Fallback to download if URI method fails",
      "Long content will be copied to clipboard, press Ctrl+V to paste"
    ],
    version: "v1.0.0"
  }
}

// 检测语言
function detectLanguage(): Lang {
  const lang = navigator.language || (navigator as any).userLanguage
  if (lang && lang.toLowerCase().startsWith("zh")) {
    return "zh"
  }
  return "en"
}

// Custom hooks for animations
function useRipple() {
  const [ripples, setRipples] = useState<
    Array<{ id: number; x: number; y: number }>
  >([])

  const triggerRipple = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const id = Date.now()
    setRipples((prev) => [...prev, { id, x, y }])
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== id))
    }, 600)
  }

  return { ripples, triggerRipple }
}

function Popup() {
  const lang = detectLanguage()
  const t = i18n[lang]

  const [config, setConfig] = useState<ObsidianConfig>({
    vaultName: "",
    defaultFolder: lang === "zh" ? "AI对话" : "AI-Chats",
    fileNameFormat: "{{date}}-{{title}}",
    contentFormat: "callout",
    exportMethod: "download"
  })

  const [saved, setSaved] = useState(false)
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const { ripples, triggerRipple } = useRipple()
  const saveButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    chrome.storage.sync.get("obsidianConfig", (data) => {
      if (data.obsidianConfig) {
        setConfig(data.obsidianConfig)
      }
    })
  }, [])

  const saveConfig = (e: React.MouseEvent<HTMLButtonElement>) => {
    triggerRipple(e)
    chrome.storage.sync.set({ obsidianConfig: config }, () => {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    })
  }

  const isValid = config.vaultName.trim().length > 0

  const buttonStyle = {
    background: saved
      ? "#10b981"
      : isValid
        ? "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
        : "#333",
    color: saved ? "#fff" : isValid ? "#000" : "#666"
  } as React.CSSProperties

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600;700&family=JetBrains+Mono:wght@300;400;500;600&display=swap');
        
        @keyframes gradientFlow {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        
        @keyframes ripple {
          0% { transform: scale(0); opacity: 0.5; }
          100% { transform: scale(4); opacity: 0; }
        }
        
        @keyframes glow {
          0%, 100% { box-shadow: 0 0 20px rgba(245, 158, 11, 0.3); }
          50% { box-shadow: 0 0 40px rgba(245, 158, 11, 0.5); }
        }
        
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .popup-container {
          width: 360px;
          background: linear-gradient(135deg, #0a0a0f 0%, #12121a 50%, #0d0d12 100%);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          color: #e5e5e5;
          position: relative;
          overflow: hidden;
          border: none;
          outline: none;
          box-shadow: none;
        }
        
        body, html {
          margin: 0;
          padding: 0;
          border: none;
          outline: none;
        }
        
        .noise-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          opacity: 0.03;
          pointer-events: none;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
        }
        
        .ambient-glow {
          position: absolute;
          top: -50%;
          right: -30%;
          width: 300px;
          height: 300px;
          background: radial-gradient(circle, rgba(245, 158, 11, 0.15) 0%, transparent 70%);
          pointer-events: none;
          animation: float 8s ease-in-out infinite;
        }
        
        .header {
          padding: 28px 24px 24px;
          position: relative;
          background: linear-gradient(180deg, rgba(245, 158, 11, 0.08) 0%, transparent 100%);
          border-bottom: 1px solid rgba(245, 158, 11, 0.15);
        }
        
        .header::before {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent 0%, rgba(245, 158, 11, 0.5) 50%, transparent 100%);
        }
        
        .brand-icon {
          width: 48px;
          height: 48px;
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          margin-bottom: 16px;
          box-shadow: 0 4px 20px rgba(245, 158, 11, 0.4);
          animation: glow 3s ease-in-out infinite;
        }
        
        .brand-title {
          font-family: 'Cinzel', serif;
          font-size: 26px;
          font-weight: 600;
          color: #f5f5f5;
          margin: 0 0 4px 0;
          letter-spacing: 1px;
          background: linear-gradient(135deg, #f5f5f5 0%, #f59e0b 50%, #f5f5f5 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer 4s linear infinite;
        }
        
        .brand-subtitle {
          font-size: 11px;
          color: #888;
          margin: 0;
          letter-spacing: 2px;
          text-transform: uppercase;
        }
        
        .form-section {
          padding: 16px 20px;
        }
        
        .form-group {
          margin-bottom: 14px;
          position: relative;
        }
        
        .form-label {
          display: block;
          font-size: 12px;
          font-weight: 500;
          color: #aaa;
          margin-bottom: 6px;
        }
        
        .form-label .required {
          color: #f59e0b;
          margin-left: 4px;
        }
        
        .input-wrapper {
          position: relative;
        }
        
        .form-input {
          width: 100%;
          padding: 10px 12px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 6px;
          font-family: inherit;
          font-size: 14px;
          color: #e5e5e5;
          box-sizing: border-box;
          outline: none;
          transition: all 0.2s ease;
          pointer-events: auto;
          position: relative;
        }
        
        .form-input::placeholder {
          color: #555;
        }
        
        .form-input:hover {
          background: rgba(255, 255, 255, 0.04);
          border-color: rgba(255, 255, 255, 0.08);
        }
        
        .form-input:focus {
          background: rgba(245, 158, 11, 0.05);
          border-color: rgba(245, 158, 11, 0.4);
          box-shadow: 0 0 20px rgba(245, 158, 11, 0.15);
        }
        
        .input-hint {
          font-size: 11px;
          color: #666;
          margin-top: 4px;
        }
        
        .method-selector {
          display: flex;
          gap: 8px;
          margin-bottom: 14px;
        }
        
        .method-option {
          flex: 1;
          position: relative;
        }
        
        .method-radio {
          position: absolute;
          opacity: 0;
          cursor: pointer;
        }
        
        .method-label {
          display: block;
          padding: 10px 8px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.04);
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: center;
        }
        
        .method-radio:checked + .method-label {
          background: rgba(245, 158, 11, 0.1);
          border-color: rgba(245, 158, 11, 0.5);
          box-shadow: 0 0 20px rgba(245, 158, 11, 0.2);
        }
        
        .method-label:hover {
          background: rgba(255, 255, 255, 0.05);
          transform: translateY(-2px);
        }
        
        .method-icon {
          font-size: 18px;
          margin-bottom: 4px;
          display: block;
        }
        
        .method-title {
          font-size: 12px;
          font-weight: 500;
          color: #e5e5e5;
          display: block;
          margin-bottom: 2px;
        }
        
        .method-desc {
          font-size: 10px;
          color: #888;
          display: block;
        }
        
        .method-badge {
          position: absolute;
          top: -6px;
          right: -6px;
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          color: #000;
          font-size: 8px;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 4px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .save-button {
          width: 100%;
          padding: 12px 16px;
          border: none;
          border-radius: 8px;
          font-family: inherit;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          position: relative;
          overflow: hidden;
          margin-top: 4px;
        }
        
        .save-button:not(:disabled) {
          cursor: pointer;
        }
        
        .save-button:disabled {
          cursor: not-allowed;
        }
        
        .save-button:not(:disabled):hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 30px rgba(245, 158, 11, 0.4);
        }
        
        .save-button:not(:disabled):active {
          transform: translateY(0);
        }
        
        .ripple {
          position: absolute;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.4);
          width: 20px;
          height: 20px;
          margin-left: -10px;
          margin-top: -10px;
          animation: ripple 0.6s ease-out;
          pointer-events: none;
        }
        
        .help-section {
          padding: 14px 20px;
          background: rgba(245, 158, 11, 0.02);
          border-top: 1px solid rgba(245, 158, 11, 0.06);
        }
        
        .help-title {
          font-size: 12px;
          font-weight: 600;
          color: #f59e0b;
          margin: 0 0 8px 0;
        }
        
        .help-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        
        .help-item {
          font-size: 12px;
          color: #888;
          padding: 4px 0 4px 14px;
          position: relative;
          line-height: 1.4;
        }
        
        .help-item::before {
          content: '›';
          position: absolute;
          left: 0;
          color: #f59e0b;
          font-size: 14px;
          font-weight: bold;
        }
        
        .footer {
          padding: 10px 20px;
          background: rgba(0, 0, 0, 0.3);
          border-top: 1px solid rgba(255, 255, 255, 0.03);
          font-size: 11px;
          color: #555;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .footer a {
          color: #f59e0b;
          text-decoration: none;
          transition: color 0.3s ease;
        }
        
        .footer a:hover {
          color: #fbbf24;
        }
      `}</style>

      <div className="popup-container">
        <div className="noise-overlay" />
        <div className="ambient-glow" />

        {/* Config Section */}
        <div className="form-section">

          <div className="form-group">
            <label className="form-label">
              {t.vaultName}<span className="required">*</span>
            </label>
            <div
              className={`input-wrapper ${focusedField === "vault" ? "focused" : ""}`}>
              <input
                type="text"
                className="form-input"
                value={config.vaultName}
                onChange={(e) =>
                  setConfig({ ...config, vaultName: e.target.value })
                }
                onFocus={() => setFocusedField("vault")}
                onBlur={() => setFocusedField(null)}
                placeholder={t.vaultNamePlaceholder}
              />
            </div>
            <span className="input-hint">
              {t.vaultNameHint}
            </span>
          </div>

          <div className="form-group">
            <label className="form-label">{t.defaultFolder}</label>
            <div
              className={`input-wrapper ${focusedField === "folder" ? "focused" : ""}`}>
              <input
                type="text"
                className="form-input"
                value={config.defaultFolder}
                onChange={(e) =>
                  setConfig({ ...config, defaultFolder: e.target.value })
                }
                onFocus={() => setFocusedField("folder")}
                onBlur={() => setFocusedField(null)}
                placeholder={t.defaultFolderPlaceholder}
              />
            </div>
            <span className="input-hint">
              {t.defaultFolderHint}
            </span>
          </div>

          <div className="form-group">
            <label className="form-label">{t.filenameFormat}</label>
            <div
              className={`input-wrapper ${focusedField === "format" ? "focused" : ""}`}>
              <input
                type="text"
                className="form-input"
                value={config.fileNameFormat}
                onChange={(e) =>
                  setConfig({ ...config, fileNameFormat: e.target.value })
                }
                onFocus={() => setFocusedField("format")}
                onBlur={() => setFocusedField(null)}
                placeholder={t.filenameFormatPlaceholder}
              />
            </div>
            <span className="input-hint">
              {t.filenameFormatHint}
            </span>
          </div>

          <div className="form-group">
            <label className="form-label">{t.contentFormat}</label>
            <div className="method-selector">
              <div className="method-option">
                <input
                  type="radio"
                  id="callout"
                  className="method-radio"
                  checked={config.contentFormat === "callout"}
                  onChange={() =>
                    setConfig({ ...config, contentFormat: "callout" })
                  }
                />
                <label htmlFor="callout" className="method-label">
                  <span className="method-badge">New</span>
                  <span className="method-icon">❝❞</span>
                  <span className="method-title">{t.callout}</span>
                  <span className="method-desc">{t.calloutDesc}</span>
                </label>
              </div>
              <div className="method-option">
                <input
                  type="radio"
                  id="web"
                  className="method-radio"
                  checked={
                    config.contentFormat === "web" || !config.contentFormat
                  }
                  onChange={() =>
                    setConfig({ ...config, contentFormat: "web" })
                  }
                />
                <label htmlFor="web" className="method-label">
                  <span className="method-icon">📄</span>
                  <span className="method-title">{t.web}</span>
                  <span className="method-desc">{t.webDesc}</span>
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
                  className="method-radio"
                  checked={config.exportMethod === "uri"}
                  onChange={() => setConfig({ ...config, exportMethod: "uri" })}
                />
                <label htmlFor="uri" className="method-label">
                  <span className="method-badge">Best</span>
                  <span className="method-icon">◉</span>
                  <span className="method-title">{t.obsidianUri}</span>
                  <span className="method-desc">{t.obsidianUriDesc}</span>
                </label>
              </div>
              <div className="method-option">
                <input
                  type="radio"
                  id="download"
                  className="method-radio"
                  checked={config.exportMethod === "download"}
                  onChange={() =>
                    setConfig({ ...config, exportMethod: "download" })
                  }
                />
                <label htmlFor="download" className="method-label">
                  <span className="method-icon">▼</span>
                  <span className="method-title">{t.download}</span>
                  <span className="method-desc">{t.downloadDesc}</span>
                </label>
              </div>
            </div>
          </div>

          <button
            ref={saveButtonRef}
            className="save-button"
            onClick={saveConfig}
            disabled={!isValid}
            style={buttonStyle}>
            {saved ? `◉ ${t.saved}` : t.saveConfig}
            {ripples.map((ripple) => (
              <span
                key={ripple.id}
                className="ripple"
                style={{ left: ripple.x, top: ripple.y }}
              />
            ))}
          </button>
        </div>

        {/* Help Section */}
        <div className="help-section">
          <h3 className="help-title">{t.essentialNotes}</h3>
          <ul className="help-list">
            {t.helpItems.map((item, index) => (
              <li key={index} className="help-item">
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Footer */}
        <div className="footer">
          <span>v1.0.0</span>
          <a
            href="https://github.com/ET06731/Memflow"
            target="_blank"
            rel="noopener noreferrer">
            GitHub →
          </a>
        </div>
      </div>
    </>
  )
}

export default Popup
