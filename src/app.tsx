import { useEffect, useState } from "preact/hooks";
import "./global.css";

import { Message } from "./chatgpt";
import getDefaultParams from "./getDefaultParam";
import ChatBOX from "./chatbox";

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
            {allChatStore
              .slice()
              .reverse()
              .map((cs, _i) => {
                // reverse
                const i = allChatStore.length - _i - 1;
                return (
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
                );
              })}
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
              setSelectedChatIndex(Math.max(selectedChatIndex - 1, 0));
            }
            setAllChatStore([...allChatStore]);
          }}
        >
          DEL
        </button>
      </div>
      <ChatBOX chatStore={chatStore} setChatStore={setChatStore} />
    </div>
  );
}
