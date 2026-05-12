import type { ObsidianConfig } from "../types"

type SupportedLang = "zh" | "en"

export function getDefaultObsidianConfig(lang: SupportedLang): ObsidianConfig {
  return {
    vaultName: "",
    defaultFolder: lang === "zh" ? "AI对话" : "AI-Chats",
    fileNameFormat: "{{date}}-{{title}}",
    contentFormat: "callout",
    exportMethod: "uri",
    autoOpen: true,
    saveSubtitles: true,
    saveSubtitlesWithTimestamp: false,
    enableHighlight: false
  }
}
