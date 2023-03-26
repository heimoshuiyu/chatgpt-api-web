import { createRef } from "preact";
import { useEffect, useState } from "preact/hooks";
import type { ChatStore } from "./app";
import ChatGPT, { ChunkMessage, FetchResponse } from "./chatgpt";
import Message from "./message";
import Settings from "./settings";

export default function ChatBOX(props: {
  chatStore: ChatStore;
  setChatStore: (cs: ChatStore) => void;
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

  const _completeWithStreamMode = async (response: Response) => {
    // call api, return reponse text
    console.log("response", response);
    const reader = response.body?.getReader();
    const allChunkMessage: string[] = [];
    new ReadableStream({
      async start() {
        while (true) {
          let responseDone = false;
          let state = await reader?.read();
          let done = state?.done;
          let value = state?.value;
          if (done) break;
          let text = new TextDecoder().decode(value);
          // console.log("text:", text);
          const lines = text
            .trim()
            .split("\n")
            .map((line) => line.trim())
            .filter((i) => {
              if (!i) return false;
              if (i === "data: [DONE]") {
                responseDone = true;
                return false;
              }
              return true;
            });
          console.log("lines", lines);
          const jsons: ChunkMessage[] = lines
            .map((line) => {
              return JSON.parse(line.trim().slice("data: ".length));
            })
            .filter((i) => i);
          // console.log("jsons", jsons);
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
        chatStore.history.push({
          role: "assistant",
          content: allChunkMessage.join(""),
        });
        // manually copy status from client to chatStore
        chatStore.maxTokens = client.max_tokens;
        chatStore.tokenMargin = client.tokens_margin;
        chatStore.totalTokens =
          client.total_tokens +
          39 +
          client.calculate_token_length(allChunkMessage.join(""));
        setChatStore({ ...chatStore });
        setGeneratingMessage("");
        setShowGenerating(false);
      },
    });
  };

  const _completeWithFetchMode = async (response: Response) => {
    const data = (await response.json()) as FetchResponse;
    const content = client.processFetchResponse(data);
    chatStore.history.push({ role: "assistant", content });
    setShowGenerating(false);
  };

  // wrap the actuall complete api
  const complete = async () => {
    // manually copy status from chatStore to client
    client.apiEndpoint = chatStore.apiEndpoint;
    client.sysMessageContent = chatStore.systemMessageContent;
    client.messages = chatStore.history.slice(chatStore.postBeginIndex);
    try {
      setShowGenerating(true);
      const response = await client._fetch(chatStore.streamMode);
      const contentType = response.headers.get("content-type");
      if (contentType === "text/event-stream") {
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
      // when total token > max token - margin token:
      // ChatGPT will "forgot" some historical message
      // so client.message.length will be less than chatStore.history.length
      chatStore.postBeginIndex =
        chatStore.history.length - client.messages.length;
      console.log("postBeginIndex", chatStore.postBeginIndex);
      setChatStore({ ...chatStore });
    } catch (error) {
      setShowRetry(true);
      alert(error);
    } finally {
      setShowGenerating(false);
    }
  };

  // when user click the "send" button or ctrl+Enter in the textarea
  const send = async (msg = "") => {
    const inputMsg = msg;
    if (!inputMsg) {
      console.log("empty message");
      return;
    }
    chatStore.history.push({ role: "user", content: inputMsg.trim() });
    setChatStore({ ...chatStore });
    setInputMsg("");
    await complete();
  };

  const [showSettings, setShowSettings] = useState(false);
  return (
    <div className="grow flex flex-col p-2 dark:text-black">
      <Settings
        chatStore={chatStore}
        setChatStore={setChatStore}
        show={showSettings}
        setShow={setShowSettings}
      />
      <p
        className="cursor-pointer dark:text-white"
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
          <span>Total: {chatStore.totalTokens}</span>{" "}
          <span>Max: {chatStore.maxTokens}</span>{" "}
          <span>Margin: {chatStore.tokenMargin}</span>{" "}
          <span>Message: {chatStore.history.length}</span>{" "}
          <span>Cut: {chatStore.postBeginIndex}</span>
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
          <p className="opacity-60 p-6 rounded bg-white my-3 text-left dark:text-black">
            暂无历史对话记录
            <br />
            ⬆点击上方更改此对话的参数
            <br />
            ↖点击左上角 NEW 新建对话
            <br />
            ⚠回答内容和速度会受到对话历史的影响，因此建议为不相关的问题创建一个单独的对话。
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
        {showGenerating && (
          <p className="p-2 my-2 animate-pulse dark:text-white">
            {generatingMessage
              ? generatingMessage.split("\n").map((line) => <p>{line}</p>)
              : "生成中，请保持网络稳定"}
            ...
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
      </div>
    </div>
  );
}
