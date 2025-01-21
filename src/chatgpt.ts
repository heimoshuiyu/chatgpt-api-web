import { DefaultModel } from "@/const";

export interface ImageURL {
  url: string;
  detail: "low" | "high";
}

export interface MessageDetail {
  type: "text" | "image_url";
  text?: string;
  image_url?: ImageURL;
}
export interface ToolCall {
  index: number;
  id?: string;
  type: string;
  function: {
    name: string;
    arguments: string;
  };
}
export interface Message {
  role: "system" | "user" | "assistant" | "tool";
  content: string | MessageDetail[];
  name?: "example_user" | "example_assistant";
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

interface Delta {
  role?: string;
  content?: string;
  tool_calls?: ToolCall[];
}

interface Choices {
  index: number;
  delta: Delta;
  finish_reason: string | null;
  logprobs: Logprobs | null;
}

export interface Logprobs {
  content: LogprobsContent[];
}

interface LogprobsContent {
  token: string;
  logprob: number;
}

interface PromptTokensDetails {
  cached_tokens: number;
  audio_tokens: number;
}

interface CompletionTokensDetails {
  reasoning_tokens: number;
  audio_tokens: number;
  accepted_prediction_tokens: number;
  rejected_prediction_tokens: number;
}

export interface Usage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  prompt_tokens_details: PromptTokensDetails | null;
  completion_tokens_details: CompletionTokensDetails | null;
  response_model_name: string | null;
}

export interface StreamingResponseChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  system_fingerprint: string;
  choices: Choices[];
  usage: null | Usage;
}
export const getMessageText = (message: Message): string => {
  if (typeof message.content === "string") {
    // function call message
    if (message.tool_calls) {
      return message.tool_calls
        .map((tc) => {
          return `Tool Call ID: ${tc.id}\nType: ${tc.type}\nFunction: ${tc.function.name}\nArguments: ${tc.function.arguments}}`;
        })
        .join("\n");
    }
    return message.content;
  }
  return message.content
    .filter((c) => c.type === "text")
    .map((c) => c?.text)
    .join("\n");
};

export interface ChunkMessage {
  model: string;
  choices: {
    delta: { role: "assitant" | undefined; content: string | undefined };
  }[];
}

export interface FetchResponse {
  error?: any;
  id: string;
  object: string;
  created: number;
  model: string;
  usage: Usage;
  choices: {
    message: Message | undefined;
    finish_reason: "stop" | "length";
    index: number | undefined;
    logprobs: Logprobs | null;
  }[];
}

function calculate_token_length_from_text(text: string): number {
  const totalCount = text.length;
  const chineseCount = text.match(/[\u00ff-\uffff]|\S+/g)?.length ?? 0;
  const englishCount = totalCount - chineseCount;
  const tokenLength = englishCount / 4 + (chineseCount * 4) / 3;
  return ~~tokenLength;
}
// https://help.openai.com/en/articles/4936856-what-are-tokens-and-how-to-count-them
export function calculate_token_length(
  content: string | MessageDetail[]
): number {
  if (typeof content === "string") {
    return calculate_token_length_from_text(content);
  }
  let tokens = 0;
  for (const m of content) {
    if (m.type === "text") {
      tokens += calculate_token_length_from_text(m.text ?? "");
    }
    if (m.type === "image_url") {
      tokens += m.image_url?.detail === "high" ? 65 * 4 : 65;
    }
  }
  return tokens;
}

class Chat {
  OPENAI_API_KEY: string;
  messages: Message[];
  sysMessageContent: string;
  toolsString: string;
  total_tokens: number;
  max_tokens: number;
  max_gen_tokens: number;
  enable_max_gen_tokens: boolean;
  tokens_margin: number;
  apiEndpoint: string;
  model: string;
  temperature: number;
  enable_temperature: boolean;
  top_p: number;
  enable_top_p: boolean;
  presence_penalty: number;
  presence_penalty_enabled: boolean;
  frequency_penalty: number;
  frequency_penalty_enabled: boolean;
  json_mode: boolean;

  constructor(
    OPENAI_API_KEY: string | undefined,
    {
      systemMessage = "",
      toolsString = "",
      max_tokens = 4096,
      max_gen_tokens = 2048,
      enable_max_gen_tokens = true,
      tokens_margin = 1024,
      apiEndPoint = "https://api.openai.com/v1/chat/completions",
      model = DefaultModel,
      temperature = 1,
      enable_temperature = true,
      top_p = 1,
      enable_top_p = false,
      presence_penalty = 0,
      presence_penalty_enabled = false,
      frequency_penalty = 0,
      frequency_penalty_enabled = false,
      json_mode = false,
    } = {}
  ) {
    this.OPENAI_API_KEY = OPENAI_API_KEY ?? "";
    this.messages = [];
    this.total_tokens = calculate_token_length(systemMessage);
    this.max_tokens = max_tokens;
    this.max_gen_tokens = max_gen_tokens;
    this.enable_max_gen_tokens = enable_max_gen_tokens;
    this.tokens_margin = tokens_margin;
    this.sysMessageContent = systemMessage;
    this.toolsString = toolsString;
    this.apiEndpoint = apiEndPoint;
    this.model = model;
    this.temperature = temperature;
    this.enable_temperature = enable_temperature;
    this.top_p = top_p;
    this.enable_top_p = enable_top_p;
    this.presence_penalty = presence_penalty;
    this.presence_penalty_enabled = presence_penalty_enabled;
    this.frequency_penalty = frequency_penalty;
    this.frequency_penalty_enabled = frequency_penalty_enabled;
    this.json_mode = json_mode;
  }

  _fetch(stream = false, logprobs = false) {
    // perform role type check
    let hasNonSystemMessage = false;
    for (const msg of this.messages) {
      if (msg.role === "system" && !hasNonSystemMessage) {
        continue;
      }
      if (!hasNonSystemMessage) {
        hasNonSystemMessage = true;
        continue;
      }
      if (msg.role === "system") {
        console.log(
          "Warning: detected system message in the middle of history"
        );
      }
    }
    for (const msg of this.messages) {
      if (msg.name && msg.role !== "system") {
        console.log(
          "Warning: detected message where name field set but role is system"
        );
      }
    }
    const messages = [];
    if (this.sysMessageContent.trim()) {
      messages.push({ role: "system", content: this.sysMessageContent });
    }
    messages.push(...this.messages);

    const body: any = {
      model: this.model,
      messages,
      stream,
    };
    if (stream) {
      body["stream_options"] = {
        include_usage: true,
      };
    }
    if (this.enable_temperature) {
      body["temperature"] = this.temperature;
    }
    if (this.enable_top_p) {
      body["top_p"] = this.top_p;
    }
    if (this.enable_max_gen_tokens) {
      body["max_tokens"] = this.max_gen_tokens;
    }
    if (this.presence_penalty_enabled) {
      body["presence_penalty"] = this.presence_penalty;
    }
    if (this.frequency_penalty_enabled) {
      body["frequency_penalty"] = this.frequency_penalty;
    }
    if (this.json_mode) {
      body["response_format"] = {
        type: "json_object",
      };
    }
    if (logprobs) {
      body["logprobs"] = true;
    }

    // parse toolsString to function call format
    const ts = this.toolsString.trim();
    if (ts) {
      try {
        const fcList: any[] = JSON.parse(ts);
        body["tools"] = fcList;
      } catch (e) {
        console.log("toolsString parse error");
        throw (
          "Function call toolsString parse error, not a valied json list: " + e
        );
      }
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (this.OPENAI_API_KEY) {
      headers["Authorization"] = `Bearer ${this.OPENAI_API_KEY}`;
    }
    return fetch(this.apiEndpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
  }

  async *processStreamResponse(resp: Response) {
    const reader = resp?.body?.pipeThrough(new TextDecoderStream()).getReader();
    if (reader === undefined) {
      console.log("reader is undefined");
      return;
    }
    let receiving = true;
    let buffer = "";
    while (receiving) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += value;
      console.log("begin buffer", buffer);
      if (!buffer.includes("\n")) continue;
      const lines = buffer
        .trim()
        .split("\n")
        .filter((line) => line.trim())
        .map((line) => line.trim());

      buffer = "";

      for (const line of lines) {
        console.log("line", line);
        try {
          const jsonStr = line.slice("data:".length).trim();
          const json = JSON.parse(jsonStr) as StreamingResponseChunk;
          yield json;
        } catch (e) {
          console.log(`Chunk parse error at: ${line}`);
          buffer += line;
        }
      }
    }
  }

  processFetchResponse(resp: FetchResponse): Message {
    if (resp.error !== undefined) {
      throw JSON.stringify(resp.error);
    }
    this.total_tokens = resp?.usage?.total_tokens ?? 0;
    if (resp?.choices[0]?.message) {
      this.messages.push(resp?.choices[0]?.message);
    }

    if (resp.choices[0]?.finish_reason === "length") {
      this.forceForgetSomeMessages();
    } else {
      this.forgetSomeMessages();
    }

    let content = resp.choices[0].message?.content ?? "";
    if (
      !resp.choices[0]?.message?.content &&
      !resp.choices[0]?.message?.tool_calls
    ) {
      content = `Unparsed response: ${JSON.stringify(resp)}`;
    }

    return {
      role: "assistant",
      content,
      tool_calls: resp?.choices[0]?.message?.tool_calls,
    };
  }

  calculate_token_length(content: string | MessageDetail[]): number {
    return calculate_token_length(content);
  }

  user(...messages: (string | MessageDetail[])[]) {
    for (const msg of messages) {
      this.messages.push({ role: "user", content: msg });
      this.total_tokens += this.calculate_token_length(msg);
      this.forgetSomeMessages();
    }
  }

  assistant(...messages: (string | MessageDetail[])[]) {
    for (const msg of messages) {
      this.messages.push({ role: "assistant", content: msg });
      this.total_tokens += this.calculate_token_length(msg);
      this.forgetSomeMessages();
    }
  }

  forgetSomeMessages() {
    // forget occur condition
    if (this.total_tokens + this.tokens_margin >= this.max_tokens) {
      this.forceForgetSomeMessages();
    }
  }

  forceForgetSomeMessages() {
    this.messages = [
      ...this.messages.slice(Math.max(~~(this.messages.length / 4), 2)),
    ];
  }

  forgetAllMessage() {
    this.messages = [];
  }

  stats(): string {
    return (
      `total_tokens: ${this.total_tokens}` +
      "\n" +
      `max_tokens: ${this.max_tokens}` +
      "\n" +
      `tokens_margin: ${this.tokens_margin}` +
      "\n" +
      `messages.length: ${this.messages.length}`
    );
  }
}

export default Chat;
