import { Logprobs, Message } from "@/chatgpt";
import models, { defaultModel } from "@/models";
import CHATGPT_API_WEB_VERSION from "@/CHATGPT_API_WEB_VERSION";
import getDefaultParams from "@/utils/getDefaultParam";

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
  responseModelName: string;
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
export interface ChatStoreMessage extends Message {
  hide: boolean;
  token: number;
  example: boolean;
  audio: Blob | null;
  logprobs: Logprobs | null;
}

const _defaultAPIEndpoint = "https://api.openai.com/v1/chat/completions";
export const newChatStore = (
  apiKey = "",
  systemMessageContent = "",
  apiEndpoint = _defaultAPIEndpoint,
  streamMode = true,
  model = defaultModel,
  temperature = 0.7,
  dev = false,
  whisper_api = "https://api.openai.com/v1/audio/transcriptions",
  whisper_key = "",
  tts_api = "https://api.openai.com/v1/audio/speech",
  tts_key = "",
  tts_speed = 1.0,
  tts_speed_enabled = false,
  tts_format = "mp3",
  toolsString = "",
  image_gen_api = "https://api.openai.com/v1/images/generations",
  image_gen_key = "",
  json_mode = false,
  logprobs = false,
): ChatStore => {
  return {
    chatgpt_api_web_version: CHATGPT_API_WEB_VERSION,
    systemMessageContent: getDefaultParams("sys", systemMessageContent),
    toolsString,
    history: [],
    postBeginIndex: 0,
    tokenMargin: 1024,
    totalTokens: 0,
    maxTokens: getDefaultParams(
      "max",
      models[getDefaultParams("model", model)]?.maxToken ?? 2048,
    ),
    maxGenTokens: 2048,
    maxGenTokens_enabled: false,
    apiKey: getDefaultParams("key", apiKey),
    apiEndpoint: getDefaultParams("api", apiEndpoint),
    streamMode: getDefaultParams("mode", streamMode),
    model: getDefaultParams("model", model),
    responseModelName: "",
    cost: 0,
    temperature: getDefaultParams("temp", temperature),
    temperature_enabled: true,
    top_p: 1,
    top_p_enabled: false,
    presence_penalty: 0,
    frequency_penalty: 0,
    develop_mode: getDefaultParams("dev", dev),
    whisper_api: getDefaultParams("whisper-api", whisper_api),
    whisper_key: getDefaultParams("whisper-key", whisper_key),
    tts_api: getDefaultParams("tts-api", tts_api),
    tts_key: getDefaultParams("tts-key", tts_key),
    tts_voice: "alloy",
    tts_speed: tts_speed,
    tts_speed_enabled: tts_speed_enabled,
    image_gen_api: image_gen_api,
    image_gen_key: image_gen_key,
    json_mode: json_mode,
    tts_format: tts_format,
    logprobs,
    contents_for_index: [],
  };
};
