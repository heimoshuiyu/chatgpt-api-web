import { Logprobs, Message, MessageDetail, ToolCall, Usage } from "@/chatgpt";
import { ModelPricing } from "./models";

/**
 * MCP Tool definition
 */
export interface MCPTool {
  name: string;
  description: string;
  inputSchema: any;
  outputSchema?: any;
}

/**
 * MCP Server Connection information
 */
export interface MCPServerConnection {
  serverName: string;
  templateName: string;
  config: any; // Server configuration (url, type, etc.)
  sessionId: string;
  tools: MCPTool[];
  connected: boolean;
  connectedAt: string; // ISO timestamp when connection was established
  lastUsed?: string; // ISO timestamp when last used
}

/**
 * ChatStore is the main object of the chatgpt-api-web,
 * stored in IndexedDB and passed across various components.
 * It contains all the information needed for a conversation.
 */
export interface ChatStore {
  chatgpt_api_web_version: string;
  systemMessageContent: string;
  toolsString: string;
  history: ChatStoreMessage[];
  postBeginIndex: number;
  tokenMargin: number;
  totalTokens: number;
  maxTokens: number;
  maxGenTokens: number;
  maxGenTokens_enabled: boolean;
  apiKey: string;
  apiEndpoint: string;
  streamMode: boolean;
  model: string;
  cost: number;
  temperature: number;
  temperature_enabled: boolean;
  top_p: number;
  top_p_enabled: boolean;
  presence_penalty: number;
  presence_penalty_enabled: boolean;
  frequency_penalty: number;
  frequency_penalty_enabled: boolean;
  develop_mode: boolean;
  whisper_api: string;
  whisper_key: string;
  tts_api: string;
  tts_key: string;
  tts_model: string;
  tts_voice: string;
  tts_speed: number;
  tts_speed_enabled: boolean;
  tts_format: string;
  image_gen_api: string;
  image_gen_key: string;
  json_mode: boolean;
  logprobs: boolean;
  contents_for_index: string[];
  mcpConnections: MCPServerConnection[]; // Detailed MCP connection information
  enable_thinking: boolean;
  enable_thinking_enabled: boolean;
  chatPrice?: ModelPricing;
}

export interface TemplateChatStore extends ChatStore {
  name: string;
}

export interface TemplateAPI {
  name: string;
  key: string;
  endpoint: string;
}

export interface TemplateTools {
  name: string;
  toolsString: string;
}

export interface TemplateMCPServer {
  name: string;
  configJson: string; // JSON string containing the MCP server configuration
}

/**
 * ChatStoreMessage extends the Message type defined by OpenAI.
 * It adds more fields to be stored within the ChatStore structure.
 */
export interface ChatStoreMessage {
  hide: boolean;
  token: number;
  example: boolean;
  audio: Blob | null;
  logprobs: Logprobs | null;
  response_model_name: string | null;
  usage: Usage | null;

  created_at?: string;
  responsed_at?: string;
  completed_at?: string;
  response_count?: number;

  role: "system" | "user" | "assistant" | "tool";
  content: string | MessageDetail[];
  reasoning_content: string | null;
  name?: "example_user" | "example_assistant";
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}
