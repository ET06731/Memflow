/**
 * 对话消息类型
 */
export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
}

/**
 * 对话数据结构
 */
export interface Conversation {
  id: string;
  title?: string;
  platform: string;
  url: string;
  messages: Message[];
  createdAt: Date;
}

/**
 * 元数据结构（LLM 生成）
 */
export interface Metadata {
  title: string;
  keywords: string[];
  summary: string;
  category: '编程' | '生活' | '思考' | '项目';
  topics?: string[];
  platform: string;
  url: string;
}

/**
 * 导出配置
 */
export interface ExportOptions {
  mode: 'direct' | 'smart';
  autoDelete: boolean;
  format: 'markdown';
}

/**
 * Obsidian 配置
 */
export interface ObsidianConfig {
  vaultName: string;
  defaultFolder: string;
  integrationMethod: 'advanced-uri' | 'rest-api' | 'download';
  restApiUrl?: string;
  restApiToken?: string;
}
