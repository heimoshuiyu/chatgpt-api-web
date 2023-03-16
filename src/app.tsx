import { useEffect, useState } from "preact/hooks";
import "./global.css";

import ChatGPT, { Message, ChunkMessage } from "./chatgpt";
import { createRef } from "preact";
import Settings from "./settings";
import getDefaultParams from "./getDefaultParam";

export interface ChatStore {
  systemMessageContent: string;
  history: Message[];
  postBeginIndex: number;
  tokenMargin: number;
  totalTokens: number;
  maxTokens: number;
  apiKey: string;
  apiEndpoint: string;
  streamMode: boolean;
}

const _defaultAPIEndpoint = "https://api.openai.com/v1/chat/completions";
const newChatStore = (
  apiKey = "",
  systemMessageContent = "你是一个猫娘，你要模仿猫娘的语气说话",
  apiEndpoint = _defaultAPIEndpoint,
  streamMode = true
): ChatStore => {
  return {
    systemMessageContent: getDefaultParams("sys", systemMessageContent),
    history: [],
    postBeginIndex: 0,
    tokenMargin: 1024,
    totalTokens: 0,
    maxTokens: 4096,
    apiKey: getDefaultParams("key", apiKey),
    apiEndpoint: getDefaultParams("api", apiEndpoint),
    streamMode: getDefaultParams("mode", streamMode),
  };
};

const STORAGE_NAME = "chatgpt-api-web";
const STORAGE_NAME_SELECTED = `${STORAGE_NAME}-selected`;

export function App() {
  // init all chat store
  const initAllChatStore: ChatStore[] = JSON.parse(
    localStorage.getItem(STORAGE_NAME) || "[]"
  );
  if (initAllChatStore.length === 0) {
    initAllChatStore.push(newChatStore());
    localStorage.setItem(STORAGE_NAME, JSON.stringify(initAllChatStore));
  }
  const [allChatStore, setAllChatStore] = useState(initAllChatStore);

  const [selectedChatIndex, setSelectedChatIndex] = useState(
    parseInt(localStorage.getItem(STORAGE_NAME_SELECTED) ?? "0")
  );
  useEffect(() => {
    localStorage.setItem(STORAGE_NAME_SELECTED, `${selectedChatIndex}`);
  }, [selectedChatIndex]);
  const chatStore = allChatStore[selectedChatIndex];

  const setChatStore = (cs: ChatStore) => {
    allChatStore[selectedChatIndex] = cs;
    setAllChatStore([...allChatStore]);
  };

  useEffect(() => {
    console.log("saved", allChatStore);
    localStorage.setItem(STORAGE_NAME, JSON.stringify(allChatStore));
  }, [allChatStore]);

  const [inputMsg, setInputMsg] = useState("");
  const [showGenerating, setShowGenerating] = useState(false);
  const [generatingMessage, setGeneratingMessage] = useState("");

  const client = new ChatGPT(chatStore.apiKey);

  const _completeWithStreamMode = async () => {
    // call api, return reponse text
    const response = await client.completeWithSteam();
    console.log("response", response);
    const reader = response.body?.getReader();
    const allChunkMessage: string[] = [];
    await new ReadableStream({
      async start(controller) {
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
          setGeneratingMessage(allChunkMessage.join(""));
          if (responseDone) break;
        }

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

  const _completeWithFetchMode = async () => {
    // call api, return reponse text
    const response = await client.complete();
    chatStore.history.push({ role: "assistant", content: response });
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
      if (chatStore.streamMode) {
        await _completeWithStreamMode();
      } else {
        await _completeWithFetchMode();
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
      alert(error);
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
    setChatStore({ ...chatStore });
  };

  const [showSettings, setShowSettings] = useState(false);

  return (
    <div className="flex text-sm h-screen bg-slate-200">
      <Settings
        chatStore={chatStore}
        setChatStore={setChatStore}
        show={showSettings}
        setShow={setShowSettings}
      />
      <div className="flex flex-col h-full p-4 border-r-indigo-500 border-2">
        <div className="grow overflow-scroll">
          <button
            className="bg-violet-300 p-1 rounded hover:bg-violet-400"
            onClick={() => {
              allChatStore.push(
                newChatStore(
                  allChatStore[selectedChatIndex].apiKey,
                  allChatStore[selectedChatIndex].systemMessageContent,
                  allChatStore[selectedChatIndex].apiEndpoint,
                  allChatStore[selectedChatIndex].streamMode
                )
              );
              setAllChatStore([...allChatStore]);
              setSelectedChatIndex(allChatStore.length - 1);
            }}
          >
            NEW
          </button>
          <ul>
            {allChatStore.map((cs, i) => (
              <li>
                <button
                  className={`w-full my-1 p-1 rounded  hover:bg-blue-300 ${
                    i === selectedChatIndex ? "bg-blue-500" : "bg-blue-200"
                  }`}
                  onClick={() => {
                    setSelectedChatIndex(i);
                  }}
                >
                  {i}
                </button>
              </li>
            ))}
          </ul>
        </div>
        <button
          className="rounded bg-rose-400 p-1 my-1 w-full"
          onClick={() => {
            if (!confirm("Are you sure you want to delete this chat history?"))
              return;
            const oldAPIkey = allChatStore[selectedChatIndex].apiKey;
            const oldSystemMessageContent =
              allChatStore[selectedChatIndex].systemMessageContent;
            const oldAPIEndpoint = allChatStore[selectedChatIndex].apiEndpoint;
            const oldMode = allChatStore[selectedChatIndex].streamMode;
            allChatStore.splice(selectedChatIndex, 1);
            if (allChatStore.length === 0) {
              allChatStore.push(
                newChatStore(
                  getDefaultParams("api", oldAPIkey),
                  getDefaultParams("sys", oldSystemMessageContent),
                  getDefaultParams("api", oldAPIEndpoint),
                  getDefaultParams("mode", oldMode)
                )
              );
              setSelectedChatIndex(0);
            } else {
              setSelectedChatIndex(selectedChatIndex - 1);
            }
            setAllChatStore([...allChatStore]);
          }}
        >
          DEL
        </button>
      </div>
      <div className="grow flex flex-col p-4">
        <p className="cursor-pointer" onClick={() => setShowSettings(true)}>
          <div>
            <button className="underline">
              {chatStore.systemMessageContent.length > 13
                ? chatStore.systemMessageContent.slice(0, 10) + "..."
                : chatStore.systemMessageContent}
            </button>{" "}
            <button className="underline">KEY</button>{" "}
            <button className="underline">ENDPOINT</button>{" "}
            <button className="underline">
              {chatStore.streamMode ? "STREAM" : "FETCH"}
            </button>
          </div>
          <div className="text-xs">
            <span>Total: {chatStore.totalTokens}</span>{" "}
            <span>Max: {chatStore.maxTokens}</span>{" "}
            <span>Margin: {chatStore.tokenMargin}</span>{" "}
            <span>
              Message: {chatStore.history.length - chatStore.postBeginIndex}
            </span>{" "}
            <span>Cut: {chatStore.postBeginIndex}</span>
          </div>
        </p>
        <div className="grow overflow-scroll">
          {!chatStore.apiKey && (
            <p className="opacity-60 p-6 rounded bg-white my-3 text-left">
              喵喵，请先在上方设置 (OPENAI) API KEY
            </p>
          )}
          {!chatStore.apiEndpoint && (
            <p className="opacity-60 p-6 rounded bg-white my-3 text-left">
              喵喵，请先在上方设置 API Endpoint
            </p>
          )}
          {chatStore.history.length === 0 && (
            <p className="opacity-60 p-6 rounded bg-white my-3 text-left">
              这里什么都没有哦 QwQ
            </p>
          )}
          {chatStore.history.map((chat, i) => {
            const pClassName =
              chat.role === "assistant"
                ? "p-2 rounded relative bg-white my-2 text-left"
                : "p-2 rounded relative bg-green-400 my-2 text-right";
            const iconClassName =
              chat.role === "user"
                ? "absolute bottom-0 left-0"
                : "absolute bottom-0 right-0";
            const DeleteIcon = () => (
              <button
                className={iconClassName}
                onClick={() => {
                  if (
                    confirm(
                      `Are you sure to delete this message?\n${chat.content.slice(
                        0,
                        39
                      )}...`
                    )
                  ) {
                    chatStore.history.splice(i, 1);
                    setChatStore({ ...chatStore });
                  }
                }}
              >
                🗑️
              </button>
            );
            return (
              <p className={pClassName}>
                {chat.content
                  .split("\n")
                  .filter((line) => line)
                  .map((line) => (
                    <p className="my-1">{line}</p>
                  ))}
                <DeleteIcon />
              </p>
            );
          })}
          {showGenerating && (
            <p className="p-2 my-2 animate-pulse">
              {generatingMessage
                ? generatingMessage.split("\n").map((line) => <p>{line}</p>)
                : "生成中，保持网络稳定喵"}
              ...
            </p>
          )}
        </div>
        <div className="flex justify-between">
          <textarea
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
    </div>
  );
}
