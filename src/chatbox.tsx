import { createRef } from "preact";
import { StateUpdater, useEffect, useState } from "preact/hooks";
import { ChatStore, addTotalCost } from "./app";
import ChatGPT, {
  calculate_token_length,
  ChunkMessage,
  FetchResponse,
} from "./chatgpt";
import Message from "./message";
import models from "./models";
import Settings from "./settings";

export default function ChatBOX(props: {
  chatStore: ChatStore;
  setChatStore: (cs: ChatStore) => void;
  selectedChatIndex: number;
  setSelectedChatIndex: StateUpdater<number>;
}) {
  const { chatStore, setChatStore } = props;
  // prevent error
  if (chatStore === undefined) return <div></div>;
  const [inputMsg, setInputMsg] = useState("");
  const [showGenerating, setShowGenerating] = useState(false);
  const [generatingMessage, setGeneratingMessage] = useState("");
  const [showRetry, setShowRetry] = useState(false);

  const messagesEndRef = createRef();
  useEffect(() => {
    console.log("ref", messagesEndRef);
    messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
  }, [showRetry, showGenerating, generatingMessage]);

  const client = new ChatGPT(chatStore.apiKey);

  const update_total_tokens = () => {
    // manually estimate token
    client.total_tokens = calculate_token_length(
      chatStore.systemMessageContent
    );
    for (const msg of chatStore.history
      .filter(({ hide }) => !hide)
      .slice(chatStore.postBeginIndex)) {
      client.total_tokens += msg.token;
    }
    chatStore.totalTokens = client.total_tokens;
  };

  const _completeWithStreamMode = async (response: Response) => {
    chatStore.streamMode = true;
    // call api, return reponse text
    console.log("response", response);
    const reader = response.body?.getReader();
    const allChunkMessage: string[] = [];
    new ReadableStream({
      async start() {
        let lastText = "";
        while (true) {
          let responseDone = false;
          let state = await reader?.read();
          let done = state?.done;
          let value = state?.value;
          if (done) break;
          let text = lastText + new TextDecoder().decode(value);
          // console.log("text:", text);
          const lines = text
            .trim()
            .split("\n")
            .map((line) => line.trim())
            .filter((i) => {
              if (!i) return false;
              if (i === "data: [DONE]" || i === "data:[DONE]") {
                responseDone = true;
                return false;
              }
              return true;
            });
          console.log("lines", lines);
          const jsons: ChunkMessage[] = lines
            .map((line) => {
              try {
                const ret = JSON.parse(line.trim().slice("data:".length));
                lastText = "";
                return ret;
              } catch (e) {
                console.log(`Chunk parse error at: ${line}`);
                lastText = line;
                return null;
              }
            })
            .filter((i) => i);
          console.log("jsons", jsons);
          for (const { model } of jsons) {
            if (model) chatStore.responseModelName = model;
          }
          const chunkText = jsons
            .map((j) => j.choices[0].delta.content ?? "")
            .join("");
          // console.log("chunk text", chunkText);
          allChunkMessage.push(chunkText);
          setShowGenerating(true);
          setGeneratingMessage(allChunkMessage.join(""));
          if (responseDone) break;
        }
        setShowGenerating(false);

        // console.log("push to history", allChunkMessage);
        const content = allChunkMessage.join("");
        const token = calculate_token_length(content);

        // estimate cost
        let cost = 0;
        if (chatStore.responseModelName) {
          cost +=
            token *
            (models[chatStore.responseModelName]?.price?.completion ?? 0);
          let sum = 0;
          for (const msg of chatStore.history
            .filter(({ hide }) => !hide)
            .slice(chatStore.postBeginIndex)) {
            sum += msg.token;
          }
          cost +=
            sum * (models[chatStore.responseModelName]?.price?.prompt ?? 0);
        }
        chatStore.cost += cost;
        addTotalCost(cost);

        chatStore.history.push({
          role: "assistant",
          content,
          hide: false,
          token,
        });
        // manually copy status from client to chatStore
        chatStore.maxTokens = client.max_tokens;
        chatStore.tokenMargin = client.tokens_margin;
        update_total_tokens();
        setChatStore({ ...chatStore });
        setGeneratingMessage("");
        setShowGenerating(false);
      },
    });
  };

  const _completeWithFetchMode = async (response: Response) => {
    chatStore.streamMode = false;
    const data = (await response.json()) as FetchResponse;
    chatStore.responseModelName = data.model ?? "";
    if (data.model) {
      let cost = 0;
      cost +=
        (data.usage.prompt_tokens ?? 0) *
        (models[data.model]?.price?.prompt ?? 0);
      cost +=
        (data.usage.completion_tokens ?? 0) *
        (models[data.model]?.price?.completion ?? 0);
      chatStore.cost += cost;
      addTotalCost(cost);
    }
    const content = client.processFetchResponse(data);

    // estimate user's input message token
    let aboveToken = 0;
    for (const msg of chatStore.history
      .filter(({ hide }) => !hide)
      .slice(chatStore.postBeginIndex, -1)) {
      aboveToken += msg.token;
    }
    if (data.usage.prompt_tokens) {
      const userMessageToken = data.usage.prompt_tokens - aboveToken;
      console.log("set user message token");
      if (chatStore.history.filter((msg) => !msg.hide).length > 0) {
        chatStore.history.filter((msg) => !msg.hide).slice(-1)[0].token =
          userMessageToken;
      }
    }

    chatStore.history.push({
      role: "assistant",
      content,
      hide: false,
      token: data.usage.completion_tokens ?? calculate_token_length(content),
    });
    setShowGenerating(false);
  };

  // wrap the actuall complete api
  const complete = async () => {
    // manually copy status from chatStore to client
    client.apiEndpoint = chatStore.apiEndpoint;
    client.sysMessageContent = chatStore.systemMessageContent;
    client.tokens_margin = chatStore.tokenMargin;
    client.messages = chatStore.history
      // only copy non hidden message
      .filter(({ hide }) => !hide)
      .slice(chatStore.postBeginIndex)
      // only copy content and role attribute to client for posting
      .map(({ content, role }) => {
        return {
          content,
          role,
        };
      });
    client.model = chatStore.model;
    client.max_tokens = chatStore.maxTokens;

    try {
      setShowGenerating(true);
      const response = await client._fetch(chatStore.streamMode);
      const contentType = response.headers.get("content-type");
      if (contentType?.startsWith("text/event-stream")) {
        await _completeWithStreamMode(response);
      } else if (contentType === "application/json") {
        await _completeWithFetchMode(response);
      } else {
        throw `unknown response content type ${contentType}`;
      }
      // manually copy status from client to chatStore
      chatStore.maxTokens = client.max_tokens;
      chatStore.tokenMargin = client.tokens_margin;
      chatStore.totalTokens = client.total_tokens;

      console.log("postBeginIndex", chatStore.postBeginIndex);
      setChatStore({ ...chatStore });
    } catch (error) {
      setShowRetry(true);
      alert(error);
    } finally {
      setShowGenerating(false);
      props.setSelectedChatIndex(props.selectedChatIndex);
    }
  };

  // when user click the "send" button or ctrl+Enter in the textarea
  const send = async (msg = "") => {
    const inputMsg = msg;
    if (!inputMsg) {
      console.log("empty message");
      return;
    }
    chatStore.responseModelName = "";
    chatStore.history.push({
      role: "user",
      content: inputMsg.trim(),
      hide: false,
      token: calculate_token_length(inputMsg.trim()),
    });
    // manually calculate token length
    chatStore.totalTokens += client.calculate_token_length(inputMsg.trim());
    client.total_tokens += client.calculate_token_length(inputMsg.trim());
    setChatStore({ ...chatStore });
    setInputMsg("");
    await complete();
  };

  const [showSettings, setShowSettings] = useState(false);
  return (
    <div className="grow flex flex-col p-2 dark:text-black">
      {showSettings && (
        <Settings
          chatStore={chatStore}
          setChatStore={setChatStore}
          setShow={setShowSettings}
          selectedChatStoreIndex={props.selectedChatIndex}
        />
      )}
      <p
        className="cursor-pointer rounded bg-cyan-300 dark:text-white p-1 dark:bg-cyan-800"
        onClick={() => setShowSettings(true)}
      >
        <div>
          <button className="underline">
            {chatStore.systemMessageContent.length > 16
              ? chatStore.systemMessageContent.slice(0, 16) + ".."
              : chatStore.systemMessageContent}
          </button>{" "}
          <button className="underline">
            {chatStore.streamMode ? "STREAM" : "FETCH"}
          </button>
        </div>
        <div className="text-xs">
          <span className="underline">{chatStore.model}</span>{" "}
          <span>
            Tokens:{" "}
            <span className="underline">
              {chatStore.totalTokens}/{chatStore.maxTokens}
            </span>
          </span>{" "}
          <span>
            Cut:{" "}
            <span className="underline">
              {chatStore.postBeginIndex}/
              {chatStore.history.filter(({ hide }) => !hide).length}
            </span>{" "}
          </span>{" "}
          <span>
            Cost:{" "}
            <span className="underline">${chatStore.cost.toFixed(4)}</span>
          </span>
        </div>
      </p>
      <div className="grow overflow-scroll">
        {!chatStore.apiKey && (
          <p className="opacity-60 p-6 rounded bg-white my-3 text-left dark:text-black">
            请先在上方设置 (OPENAI) API KEY
          </p>
        )}
        {!chatStore.apiEndpoint && (
          <p className="opacity-60 p-6 rounded bg-white my-3 text-left dark:text-black">
            请先在上方设置 API Endpoint
          </p>
        )}
        {chatStore.history.length === 0 && (
          <p className="break-all opacity-60 p-6 rounded bg-white my-3 text-left dark:text-black">
            暂无历史对话记录
            <br />
            ⚙Model: {chatStore.model}
            <br />
            ⚙Key: {chatStore.apiKey}
            <br />
            ⚙Endpoint: {chatStore.apiEndpoint}
            <br />
            ⬆点击上方更改此对话的参数（请勿泄漏）
            <br />
            ↖点击左上角 NEW 新建对话
            <br />
            请注意，使用 ChatGPT API
            的生成文本质量和速度会受到会话上下文的影响，同时历史上下文过长会被裁切。API
            会根据发送的上下文总量进行计费，因此建议您为不相关的问题或者不需要上文的问题创建新的对话，以避免不必要的计费。
            <br />
            ⚠所有历史对话与参数储存在浏览器本地
            <br />
            ⚠详细文档与源代码:{" "}
            <a
              className="underline"
              href="https://github.com/heimoshuiyu/chatgpt-api-web"
              target="_blank"
            >
              github.com/heimoshuiyu/chatgpt-api-web
            </a>
          </p>
        )}
        {chatStore.history.map((_, messageIndex) => (
          <Message
            chatStore={chatStore}
            setChatStore={setChatStore}
            messageIndex={messageIndex}
          />
        ))}
        {chatStore.develop_mode && (
          <p className="text-center rounded">
            <button
              className="p-2 m-2 bg-teal-500 rounded"
              onClick={async () => {
                const messageIndex = chatStore.history.length - 1;
                chatStore.history[messageIndex].hide = true;

                //chatStore.totalTokens =
                update_total_tokens();
                setChatStore({ ...chatStore });

                await complete();
              }}
            >
              Re-Generate
            </button>
            <button
              className="p-2 m-2 bg-yellow-500 rounded"
              onClick={async () => {
                await complete();
              }}
            >
              Completion
            </button>
          </p>
        )}
        {showGenerating && (
          <p className="p-2 my-2 animate-pulse dark:text-white message-content">
            {generatingMessage || "生成中，最长可能需要一分钟，请保持网络稳定"}
            ...
          </p>
        )}
        <p className="p-2 my-2 text-center opacity-50 dark:text-white">
          {chatStore.responseModelName && (
            <>Generated by {chatStore.responseModelName}</>
          )}
          {chatStore.postBeginIndex !== 0 && (
            <>
              <br />
              提示：会话过长，已裁切前 {chatStore.postBeginIndex} 条消息
            </>
          )}
        </p>
        {chatStore.chatgpt_api_web_version < "v1.3.0" && (
          <p className="p-2 my-2 text-center dark:text-white">
            <br />
            提示：当前会话版本 {chatStore.chatgpt_api_web_version}。
            <br />
            v1.3.0
            引入与旧版不兼容的消息裁切算法。继续使用旧版可能会导致消息裁切过多或过少（表现为失去上下文或输出不完整）。
            <br />
            请在左上角创建新会话：）
          </p>
        )}
        {chatStore.chatgpt_api_web_version < "v1.4.0" && (
          <p className="p-2 my-2 text-center dark:text-white">
            <br />
            提示：当前会话版本 {chatStore.chatgpt_api_web_version} {"< v1.4.0"}
            。
            <br />
            v1.4.0 增加了更多参数，继续使用旧版可能因参数确实导致未定义的行为
            <br />
            请在左上角创建新会话：）
          </p>
        )}
        {showRetry && (
          <p className="text-right p-2 my-2 dark:text-white">
            <button
              className="p-1 rounded bg-rose-500"
              onClick={async () => {
                setShowRetry(false);
                await complete();
              }}
            >
              Retry
            </button>
          </p>
        )}
        <div ref={messagesEndRef}></div>
      </div>
      <div className="flex justify-between">
        <textarea
          rows={Math.min(10, (inputMsg.match(/\n/g) || []).length + 2)}
          value={inputMsg}
          onChange={(event: any) => setInputMsg(event.target.value)}
          onKeyPress={(event: any) => {
            console.log(event);
            if (event.ctrlKey && event.code === "Enter") {
              send(event.target.value);
              setInputMsg("");
              return;
            }
            setInputMsg(event.target.value);
          }}
          className="rounded grow m-1 p-1 border-2 border-gray-400 w-0"
          placeholder="Type here..."
        ></textarea>
        <button
          className="disabled:line-through disabled:bg-slate-500 rounded m-1 p-1 border-2 bg-cyan-400 hover:bg-cyan-600"
          disabled={showGenerating || !chatStore.apiKey}
          onClick={() => {
            send(inputMsg);
          }}
        >
          Send
        </button>
        {chatStore.develop_mode && (
          <button
            className="disabled:line-through disabled:bg-slate-500 rounded m-1 p-1 border-2 bg-cyan-400 hover:bg-cyan-600"
            disabled={showGenerating || !chatStore.apiKey}
            onClick={() => {
              chatStore.history.push({
                role: "assistant",
                content: inputMsg,
                token: calculate_token_length(inputMsg),
                hide: false,
              });
              update_total_tokens();
              setChatStore({ ...chatStore });
            }}
          >
            Assistant
          </button>
        )}
        {chatStore.develop_mode && (
          <button
            className="disabled:line-through disabled:bg-slate-500 rounded m-1 p-1 border-2 bg-cyan-400 hover:bg-cyan-600"
            disabled={showGenerating || !chatStore.apiKey}
            onClick={() => {
              chatStore.history.push({
                role: "user",
                content: inputMsg,
                token: calculate_token_length(inputMsg),
                hide: false,
              });
              update_total_tokens();
              setChatStore({ ...chatStore });
            }}
          >
            User
          </button>
        )}
      </div>
    </div>
  );
}
