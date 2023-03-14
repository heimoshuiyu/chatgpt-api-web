import { useEffect, useState } from "preact/hooks";
import "./global.css";

import ChatGPT, { Message } from "./chatgpt";
import { createRef } from "preact";

export interface ChatStore {
  systemMessageContent: string;
  history: Message[];
  postBeginIndex: number;
  tokenMargin: number;
  totalTokens: number;
  maxTokens: number;
  apiKey: string;
  apiEndpoint: string;
}

const defaultAPIKEY = () => {
  const queryParameters = new URLSearchParams(window.location.search);
  const key = queryParameters.get("key");
  return key;
};

const defaultSysMessage = () => {
  const queryParameters = new URLSearchParams(window.location.search);
  const sys = queryParameters.get("sys");
  return sys;
};

const defaultAPIEndpoint = () => {
  const queryParameters = new URLSearchParams(window.location.search);
  const sys = queryParameters.get("api");
  return sys;
};

const _defaultAPIEndpoint = "https://api.openai.com/v1/chat/completions";
export const newChatStore = (
  apiKey = "",
  systemMessageContent = "你是一个猫娘，你要模仿猫娘的语气说话",
  apiEndpoint = _defaultAPIEndpoint
): ChatStore => {
  return {
    systemMessageContent: defaultSysMessage() || systemMessageContent,
    history: [],
    postBeginIndex: 0,
    tokenMargin: 1024,
    totalTokens: 0,
    maxTokens: 4096,
    apiKey: defaultAPIKEY() || apiKey,
    apiEndpoint: defaultAPIEndpoint() || apiEndpoint,
  };
};

const STORAGE_NAME = "chatgpt-api-web";

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

  const [selectedChatIndex, setSelectedChatIndex] = useState(0);
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

  const client = new ChatGPT(chatStore.apiKey);

  const _complete = async () => {
    // manually copy status from chatStore to client
    client.apiEndpoint = chatStore.apiEndpoint;
    client.sysMessageContent = chatStore.systemMessageContent;
    client.messages = chatStore.history.slice(chatStore.postBeginIndex);

    // call api, return reponse text
    const response = await client.complete();
    chatStore.history.push({ role: "assistant", content: response });

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
  };

  // wrap the actuall complete api
  const complete = async () => {
    try {
      setShowGenerating(true);
      await _complete();
    } catch (error) {
      alert(error);
    } finally {
      setShowGenerating(false);
    }
  };

  // when user click the "send" button or ctrl+Enter in the textarea
  const send = async () => {
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

  // change api key
  const changAPIKEY = () => {
    const newAPIKEY = prompt(`Current API KEY: ${chatStore.apiKey}`);
    if (!newAPIKEY) return;
    chatStore.apiKey = newAPIKEY;
    setChatStore({ ...chatStore });
  };

  return (
    <div className="flex text-sm h-screen bg-slate-200">
      <div className="flex flex-col h-full p-4 border-r-indigo-500 border-2">
        <div className="grow overflow-scroll">
          <button
            className="bg-violet-300 p-1 rounded hover:bg-violet-400"
            onClick={() => {
              allChatStore.push(
                newChatStore(
                  allChatStore[selectedChatIndex].apiKey,
                  allChatStore[selectedChatIndex].systemMessageContent,
                  allChatStore[selectedChatIndex].apiEndpoint
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
            allChatStore.splice(selectedChatIndex, 1);
            if (allChatStore.length === 0) {
              allChatStore.push(
                newChatStore(
                  oldAPIkey,
                  allChatStore[selectedChatIndex].systemMessageContent,
                  allChatStore[selectedChatIndex].apiEndpoint
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
        <p>
          <div>
            <button
              className="underline"
              onClick={() => {
                const newSysMsgContent = prompt(
                  "Change system message content"
                );
                if (newSysMsgContent === null) return;
                chatStore.systemMessageContent = newSysMsgContent;
                setChatStore({ ...chatStore });
              }}
            >
              {chatStore.systemMessageContent}
            </button>{" "}
            <button className="underline" onClick={changAPIKEY}>
              KEY
            </button>{" "}
            <button
              className="underline"
              onClick={() => {
                const newEndpoint = prompt(
                  `Enter new API endpoint\n(current: ${chatStore.apiEndpoint})\n(default: ${_defaultAPIEndpoint})`
                );
                if (!newEndpoint) return;
                chatStore.apiEndpoint = newEndpoint;
                setChatStore({ ...chatStore });
              }}
            >
              ENDPOINT
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
          {chatStore.history.length === 0 && (
            <p className="opacity-60 p-6 rounded bg-white my-3 text-left">
              喵喵，请先在上方设置 (OPENAI) API KEY
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
            <p className="animate-pulse">Generating... please wait...</p>
          )}
        </div>
        <div className="flex justify-between">
          <textarea
            value={inputMsg}
            onChange={(event: any) => setInputMsg(event.target.value)}
            onKeyPress={(event: any) => {
              console.log(event);
              if (event.ctrlKey && event.code === "Enter") {
                send();
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
              send();
            }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
