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
  systemMessageContent = "你是一个有用的人工智能助理",
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
const STORAGE_NAME_INDEXES = `${STORAGE_NAME}-indexes`;

export function App() {
  // init indexes
  const initAllChatStoreIndexes: number[] = JSON.parse(
    localStorage.getItem(STORAGE_NAME_INDEXES) ?? "[0]"
  );
  const [allChatStoreIndexes, setAllChatStoreIndexes] = useState(
    initAllChatStoreIndexes
  );
  useEffect(() => {
    if (allChatStoreIndexes.length === 0) allChatStoreIndexes.push(0);
    console.log("saved all chat store indexes", allChatStoreIndexes);
    localStorage.setItem(
      STORAGE_NAME_INDEXES,
      JSON.stringify(allChatStoreIndexes)
    );
  }, [allChatStoreIndexes]);

  // init selected index
  const [selectedChatIndex, setSelectedChatIndex] = useState(
    parseInt(localStorage.getItem(STORAGE_NAME_SELECTED) ?? "0")
  );
  useEffect(() => {
    console.log("set selected chat index", selectedChatIndex);
    localStorage.setItem(STORAGE_NAME_SELECTED, `${selectedChatIndex}`);
  }, [selectedChatIndex]);

  const getChatStoreByIndex = (index: number): ChatStore => {
    const key = `${STORAGE_NAME}-${index}`;
    const val = localStorage.getItem(key);
    if (val === null) return newChatStore();
    return JSON.parse(val) as ChatStore;
  };

  const chatStore = getChatStoreByIndex(selectedChatIndex);
  const setChatStore = (cs: ChatStore) => {
    console.log("saved chat", selectedChatIndex, chatStore);
    localStorage.setItem(
      `${STORAGE_NAME}-${selectedChatIndex}`,
      JSON.stringify(cs)
    );
  };

  return (
    <div className="flex text-sm h-screen bg-slate-200">
      <div className="flex flex-col h-full p-4 border-r-indigo-500 border-2">
        <div className="grow overflow-scroll">
          <button
            className="bg-violet-300 p-1 rounded hover:bg-violet-400"
            onClick={() => {
              const max = Math.max(...allChatStoreIndexes);
              const next = max + 1;
              console.log("save next chat", next);
              localStorage.setItem(
                `${STORAGE_NAME}-${next}`,
                JSON.stringify(
                  newChatStore(
                    chatStore.apiKey,
                    chatStore.systemMessageContent,
                    chatStore.apiEndpoint,
                    chatStore.streamMode
                  )
                )
              );
              allChatStoreIndexes.push(next);
              setAllChatStoreIndexes([...allChatStoreIndexes]);
              setSelectedChatIndex(next);
            }}
          >
            NEW
          </button>
          <ul>
            {allChatStoreIndexes
              .slice()
              .reverse()
              .map((i) => {
                // reverse
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
            console.log("remove item", `${STORAGE_NAME}-${selectedChatIndex}`);
            localStorage.removeItem(`${STORAGE_NAME}-${selectedChatIndex}`);
            const newAllChatStoreIndexes = [
              ...allChatStoreIndexes.filter((v) => v !== selectedChatIndex),
            ];

            if (newAllChatStoreIndexes.length === 0) {
              newAllChatStoreIndexes.push(0);
              setChatStore(
                newChatStore(
                  chatStore.apiKey,
                  chatStore.systemMessageContent,
                  chatStore.apiEndpoint,
                  chatStore.streamMode
                )
              );
            }

            // find nex selected chat index
            const next = newAllChatStoreIndexes[0];
            console.log("next is", next);
            setSelectedChatIndex(next);

            setAllChatStoreIndexes([...newAllChatStoreIndexes]);
          }}
        >
          DEL
        </button>
      </div>
      <ChatBOX chatStore={chatStore} setChatStore={setChatStore} />
    </div>
  );
}
