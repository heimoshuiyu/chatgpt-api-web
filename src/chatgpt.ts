export interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

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
// https://help.openai.com/en/articles/4936856-what-are-tokens-and-how-to-count-them
export function calculate_token_length(content: string): number {
  const totalCount = content.length;
  const chineseCount = content.match(/[\u00ff-\uffff]|\S+/g)?.length ?? 0;
  const englishCount = totalCount - chineseCount;
  const tokenLength = englishCount / 4 + (chineseCount * 4) / 3;
  return ~~tokenLength;
}

class Chat {
  OPENAI_API_KEY: string;
  messages: Message[];
  sysMessageContent: string;
  total_tokens: number;
  max_tokens: number;
  tokens_margin: number;
  apiEndpoint: string;
  model: string;

  constructor(
    OPENAI_API_KEY: string | undefined,
    {
      systemMessage = "你是一个有用的人工智能助理",
      max_tokens = 4096,
      tokens_margin = 1024,
      apiEndPoint = "https://api.openai.com/v1/chat/completions",
      model = "gpt-3.5-turbo",
    } = {}
  ) {
    if (OPENAI_API_KEY === undefined) {
      throw "OPENAI_API_KEY is undefined";
    }
    this.OPENAI_API_KEY = OPENAI_API_KEY;
    this.messages = [];
    this.total_tokens = 0;
    this.max_tokens = max_tokens;
    this.tokens_margin = tokens_margin;
    this.sysMessageContent = systemMessage;
    this.apiEndpoint = apiEndPoint;
    this.model = model;
  }

  _fetch(stream = false) {
    return fetch(this.apiEndpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: "system", content: this.sysMessageContent },
          ...this.messages,
        ],
        stream,
      }),
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

  async say(content: string): Promise<string> {
    this.messages.push({ role: "user", content });
    await this.complete();
    return this.messages.slice(-1)[0].content;
  }

  processFetchResponse(resp: FetchResponse): string {
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

    return (
      resp?.choices[0]?.message?.content ?? `Error: ${JSON.stringify(resp)}`
    );
  }

  async complete(): Promise<string> {
    const resp = await this.fetch();
    return this.processFetchResponse(resp);
  }

  completeWithSteam() {
    this.total_tokens = this.messages
      .map((msg) => this.calculate_token_length(msg.content) + 20)
      .reduce((a, v) => a + v);
    return this._fetch(true);
  }

  calculate_token_length(content: string): number {
    return calculate_token_length(content);
  }

  user(...messages: string[]) {
    for (const msg of messages) {
      this.messages.push({ role: "user", content: msg });
      this.total_tokens += this.calculate_token_length(msg);
      this.forgetSomeMessages();
    }
  }

  assistant(...messages: string[]) {
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
