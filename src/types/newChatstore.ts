import {
  DefaultAPIEndpoint,
  DefaultModel,
  CHATGPT_API_WEB_VERSION,
} from "@/const";
import { getDefaultParams } from "@/utils/getDefaultParam";
import { ChatStore } from "@/types/chatstore";
import { models } from "@/types/models";

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
  frequency_penalty?: number;
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
}

export const newChatStore = (options: NewChatStoreOptions): ChatStore => {
  return {
    chatgpt_api_web_version: CHATGPT_API_WEB_VERSION,
    systemMessageContent: getDefaultParams(
      "sys",
      options.systemMessageContent ?? ""
    ),
    toolsString: options.toolsString ?? "",
    history: [],
    postBeginIndex: 0,
    tokenMargin: 1024,
    totalTokens: 0,
    maxTokens: getDefaultParams(
      "max",
      models[getDefaultParams("model", options.model ?? DefaultModel)]
        ?.maxToken ?? 2048
    ),
    maxGenTokens: 2048,
    maxGenTokens_enabled: false,
    apiKey: getDefaultParams("key", options.apiKey ?? ""),
    apiEndpoint: getDefaultParams(
      "api",
      options.apiEndpoint ?? DefaultAPIEndpoint
    ),
    streamMode: getDefaultParams("mode", options.streamMode ?? true),
    model: getDefaultParams("model", options.model ?? DefaultModel),
    cost: 0,
    temperature: getDefaultParams("temp", options.temperature ?? 1),
    temperature_enabled: options.temperature_enabled ?? true,
    top_p: options.top_p ?? 1,
    top_p_enabled: options.top_p_enabled ?? false,
    presence_penalty: options.presence_penalty ?? 0,
    frequency_penalty: options.frequency_penalty ?? 0,
    develop_mode: getDefaultParams("dev", options.dev ?? false),
    whisper_api: getDefaultParams(
      "whisper-api",
      options.whisper_api ?? "https://api.openai.com/v1/audio/transcriptions"
    ),
    whisper_key: getDefaultParams("whisper-key", options.whisper_key ?? ""),
    tts_api: getDefaultParams(
      "tts-api",
      options.tts_api ?? "https://api.openai.com/v1/audio/speech"
    ),
    tts_key: getDefaultParams("tts-key", options.tts_key ?? ""),
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
  };
};
