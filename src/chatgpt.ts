export interface ImageURL {
  url: string;
  detail: "low" | "high";
}

export interface MessageDetail {
  type: "text" | "image_url";
  text?: string;
  image_url?: ImageURL;
}
export interface Message {
  role: "system" | "user" | "assistant" | "tool";
  content: string | MessageDetail[];
  name?: "example_user" | "example_assistant";
  tool_calls?: {
    id: string;
    type: string;
    function: any;
  }[];
  tool_call_id?: string;
}
export const getMessageText = (message: Message): string => {
  if (typeof message.content === "string") {
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
  usage: {
    prompt_tokens: number | undefined;
    completion_tokens: number | undefined;
    total_tokens: number | undefined;
  };
  choices: {
    message: Message | undefined;
    finish_reason: "stop" | "length";
    index: number | undefined;
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
  frequency_penalty: number;

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
      model = "gpt-3.5-turbo",
      temperature = 0.7,
      enable_temperature = true,
      top_p = 1,
      enable_top_p = false,
      presence_penalty = 0,
      frequency_penalty = 0,
    } = {}
  ) {
    if (OPENAI_API_KEY === undefined) {
      throw "OPENAI_API_KEY is undefined";
    }
    this.OPENAI_API_KEY = OPENAI_API_KEY;
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
    this.frequency_penalty = frequency_penalty;
  }

  _fetch(stream = false) {
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
      presence_penalty: this.presence_penalty,
      frequency_penalty: this.frequency_penalty,
    };
    if (this.enable_temperature) {
      body["temperature"] = this.temperature;
    }
    if (this.enable_top_p) {
      body["top_p"] = this.top_p;
    }
    if (this.enable_max_gen_tokens) {
      body["max_tokens"] = this.max_gen_tokens;
    }

    // parse toolsString to function call format
    const ts = this.toolsString.trim();
    if (ts) {
      try {
        const fcList: any[] = JSON.parse(ts);
        body["tools"] = fcList.map((fc) => {
          return {
            type: "function",
            function: fc,
          };
        });
      } catch (e) {
        console.log("toolsString parse error");
        throw (
          "Function call toolsString parse error, not a valied json list: " + e
        );
      }
    }

    return fetch(this.apiEndpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  }

  async fetch(): Promise<FetchResponse> {
    const resp = await this._fetch();
    const j = await resp.json();
    if (j.error !== undefined) {
      throw JSON.stringify(j.error);
    }
    return j;
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
          const json = JSON.parse(jsonStr);
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

  completeWithSteam() {
    this.total_tokens = this.messages
      .map((msg) => this.calculate_token_length(msg.content as string) + 20)
      .reduce((a, v) => a + v);
    return this._fetch(true);
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
