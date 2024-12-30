import { Logprobs, Message, MessageDetail, ToolCall } from "@/chatgpt";

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
  frequency_penalty: number;
  develop_mode: boolean;
  whisper_api: string;
  whisper_key: string;
  tts_api: string;
  tts_key: string;
  tts_voice: string;
  tts_speed: number;
  tts_speed_enabled: boolean;
  tts_format: string;
  image_gen_api: string;
  image_gen_key: string;
  json_mode: boolean;
  logprobs: boolean;
  contents_for_index: string[];
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

  role: "system" | "user" | "assistant" | "tool";
  content: string | MessageDetail[];
  name?: "example_user" | "example_assistant";
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}
