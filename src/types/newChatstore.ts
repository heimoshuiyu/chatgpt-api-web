import {
  DefaultAPIEndpoint,
  DefaultModel,
  CHATGPT_API_WEB_VERSION,
} from "@/const";
import {
  ChatStore,
  ChatStoreMessage,
  MCPServerConnection,
} from "@/types/chatstore";
import { ModelPricing, models } from "@/types/models";

interface NewChatStoreOptions {
  apiKey?: string;
  systemMessageContent?: string;
  apiEndpoint?: string;
  streamMode?: boolean;
  model?: string;
  temperature?: number;
  temperature_enabled?: boolean;
  top_p?: number;
  top_p_enabled?: boolean;
  presence_penalty?: number;
  presence_penalty_enabled?: boolean;
  frequency_penalty?: number;
  frequency_penalty_enabled?: boolean;
  dev?: boolean;
  whisper_api?: string;
  whisper_key?: string;
  tts_api?: string;
  tts_key?: string;
  tts_voice?: string;
  tts_speed?: number;
  tts_speed_enabled?: boolean;
  tts_format?: string;
  toolsString?: string;
  image_gen_api?: string;
  image_gen_key?: string;
  json_mode?: boolean;
  logprobs?: boolean;
  maxTokens?: number;
  use_this_history?: ChatStoreMessage[];
  chatPrice?: ModelPricing;
  mcpConnections?: MCPServerConnection[];
  enable_thinking?: boolean;
  enable_thinking_enabled?: boolean;
}

export const newChatStore = (options: NewChatStoreOptions): ChatStore => {
  return {
    chatgpt_api_web_version: CHATGPT_API_WEB_VERSION,
    systemMessageContent: options.systemMessageContent ?? "",
    toolsString: options.toolsString ?? "",
    history: options.use_this_history ?? [],
    postBeginIndex: 0,
    tokenMargin: 1024,
    totalTokens: 0,
    maxTokens:
      models[options.model ?? DefaultModel]?.maxToken ??
      options.maxTokens ??
      2048,
    maxGenTokens: 2048,
    maxGenTokens_enabled: false,
    apiKey: options.apiKey ?? "",
    apiEndpoint: options.apiEndpoint ?? DefaultAPIEndpoint,
    streamMode: options.streamMode ?? true,
    model: options.model ?? DefaultModel,
    cost: 0,
    temperature: options.temperature ?? 1,
    temperature_enabled: options.temperature_enabled ?? true,
    top_p: options.top_p ?? 1,
    top_p_enabled: options.top_p_enabled ?? false,
    presence_penalty: options.presence_penalty ?? 0,
    presence_penalty_enabled: options.presence_penalty_enabled ?? false,
    frequency_penalty: options.frequency_penalty ?? 0,
    frequency_penalty_enabled: options.frequency_penalty_enabled ?? false,
    develop_mode: options.dev ?? false,
    whisper_api:
      options.whisper_api ?? "https://api.openai.com/v1/audio/transcriptions",
    whisper_key: options.whisper_key ?? "",
    tts_api: options.tts_api ?? "https://api.openai.com/v1/audio/speech",
    tts_key: options.tts_key ?? "",
    tts_voice: options.tts_voice ?? "alloy",
    tts_speed: options.tts_speed ?? 1.0,
    tts_speed_enabled: options.tts_speed_enabled ?? false,
    image_gen_api:
      options.image_gen_api ?? "https://api.openai.com/v1/images/generations",
    image_gen_key: options.image_gen_key ?? "",
    json_mode: options.json_mode ?? false,
    tts_format: options.tts_format ?? "mp3",
    logprobs: options.logprobs ?? false,
    contents_for_index: [],
    mcpConnections: options.mcpConnections ?? [], // Default to empty array for MCP connections
    chatPrice: options.chatPrice ?? undefined,
    enable_thinking: options.enable_thinking ?? false,
    enable_thinking_enabled: options.enable_thinking_enabled ?? false,
  };
};
