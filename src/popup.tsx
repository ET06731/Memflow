import { useEffect, useRef, useState } from "react"

interface ObsidianConfig {
  vaultName: string
  defaultFolder: string
  fileNameFormat: string
  exportMethod: "uri" | "download"
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
  const [config, setConfig] = useState<ObsidianConfig>({
    vaultName: "",
    defaultFolder: "AI对话",
    fileNameFormat: "{{date}}-{{title}}",
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
          width: 420px;
          background: linear-gradient(135deg, #0a0a0f 0%, #12121a 50%, #0d0d12 100%);
          font-family: 'JetBrains Mono', monospace;
          color: #e5e5e5;
          position: relative;
          overflow: hidden;
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
          padding: 24px;
        }
        
        .section-title {
          font-family: 'Cinzel', serif;
          font-size: 12px;
          font-weight: 600;
          color: #f59e0b;
          margin: 0 0 20px 0;
          letter-spacing: 3px;
          text-transform: uppercase;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .section-title::after {
          content: '';
          flex: 1;
          height: 1px;
          background: linear-gradient(90deg, rgba(245, 158, 11, 0.5) 0%, transparent 100%);
        }
        
        .form-group {
          margin-bottom: 20px;
          position: relative;
        }
        
        .form-label {
          display: block;
          font-size: 11px;
          font-weight: 500;
          color: #aaa;
          margin-bottom: 8px;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }
        
        .form-label .required {
          color: #f59e0b;
          margin-left: 4px;
        }
        
        .input-wrapper {
          position: relative;
        }
        
        .input-wrapper::before {
          content: '';
          position: absolute;
          inset: -1px;
          border-radius: 8px;
          padding: 1px;
          background: linear-gradient(135deg, rgba(245, 158, 11, 0.3) 0%, transparent 50%, rgba(245, 158, 11, 0.1) 100%);
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          opacity: 0;
          transition: opacity 0.3s ease;
        }
        
        .input-wrapper.focused::before {
          opacity: 1;
        }
        
        .form-input {
          width: 100%;
          padding: 12px 14px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 8px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 13px;
          color: #e5e5e5;
          box-sizing: border-box;
          outline: none;
          transition: all 0.3s ease;
        }
        
        .form-input::placeholder {
          color: #666;
        }
        
        .form-input:hover {
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(255, 255, 255, 0.12);
        }
        
        .form-input:focus {
          background: rgba(245, 158, 11, 0.05);
          border-color: rgba(245, 158, 11, 0.4);
          box-shadow: 0 0 20px rgba(245, 158, 11, 0.15);
        }
        
        .input-hint {
          font-size: 10px;
          color: #666;
          margin-top: 6px;
          font-style: italic;
        }
        
        .method-selector {
          display: flex;
          gap: 10px;
          margin-bottom: 20px;
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
          padding: 14px 12px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.3s ease;
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
          font-size: 20px;
          margin-bottom: 6px;
          display: block;
        }
        
        .method-title {
          font-size: 11px;
          font-weight: 500;
          color: #e5e5e5;
          display: block;
          margin-bottom: 2px;
        }
        
        .method-desc {
          font-size: 9px;
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
          padding: 14px 20px;
          border: none;
          border-radius: 10px;
          font-family: 'Cinzel', serif;
          font-size: 13px;
          font-weight: 600;
          letter-spacing: 1px;
          cursor: pointer;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
          text-transform: uppercase;
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
          padding: 20px 24px;
          background: rgba(245, 158, 11, 0.03);
          border-top: 1px solid rgba(245, 158, 11, 0.1);
        }
        
        .help-title {
          font-family: 'Cinzel', serif;
          font-size: 11px;
          font-weight: 600;
          color: #f59e0b;
          margin: 0 0 12px 0;
          letter-spacing: 2px;
          text-transform: uppercase;
        }
        
        .help-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        
        .help-item {
          font-size: 11px;
          color: #888;
          padding: 6px 0 6px 16px;
          position: relative;
          line-height: 1.5;
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
          padding: 14px 24px;
          background: rgba(0, 0, 0, 0.3);
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          font-size: 10px;
          color: #555;
          display: flex;
          justify-content: space-between;
          align-items: center;
          letter-spacing: 0.5px;
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

        {/* Header */}
        <div className="header">
          <div className="brand-icon">◈</div>
          <h1 className="brand-title">Memflow</h1>
          <p className="brand-subtitle">Preserving the flow of thought</p>
        </div>

        {/* Config Section */}
        <div className="form-section">
          <h2 className="section-title">Configuration</h2>

          <div className="form-group">
            <label className="form-label">
              Vault Name<span className="required">*</span>
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
                placeholder="e.g., KnowledgeBase"
              />
            </div>
            <span className="input-hint">
              Must match your Obsidian vault name exactly
            </span>
          </div>

          <div className="form-group">
            <label className="form-label">Default Folder</label>
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
                placeholder="AI-Chats/DeepSeek"
              />
            </div>
            <span className="input-hint">
              Use / for nested folders, no leading slash
            </span>
          </div>

          <div className="form-group">
            <label className="form-label">Filename Format</label>
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
                placeholder="{{date}}-{{title}}"
              />
            </div>
            <span className="input-hint">
              Available: {"{{date}} {{title}} {{platform}}"}
            </span>
          </div>

          <div className="form-group">
            <label className="form-label">Export Method</label>
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
                  <span className="method-title">Obsidian URI</span>
                  <span className="method-desc">Direct import</span>
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
                  <span className="method-title">Download</span>
                  <span className="method-desc">Save as file</span>
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
            {saved ? "◉ Saved" : "Save Configuration"}
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
          <h3 className="help-title">Essential Notes</h3>
          <ul className="help-list">
            <li className="help-item">
              First use requires allowing Obsidian URI scheme access
            </li>
            <li className="help-item">
              Vault names are case-sensitive and must match exactly
            </li>
            <li className="help-item">
              Non-existent folders will be created automatically
            </li>
            <li className="help-item">
              Fallback to download if URI method fails
            </li>
          </ul>
        </div>

        {/* Footer */}
        <div className="footer">
          <span>v1.0.0</span>
          <a
            href="https://github.com/yourusername/memflow"
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
