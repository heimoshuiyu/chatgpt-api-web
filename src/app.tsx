import { useEffect, useState } from "preact/hooks";
import "./global.css";

import { calculate_token_length, Message } from "./chatgpt";
import getDefaultParams from "./getDefaultParam";
import ChatBOX from "./chatbox";
import models from "./models";

import CHATGPT_API_WEB_VERSION from "./CHATGPT_API_WEB_VERSION";

export interface ChatStoreMessage extends Message {
  hide: boolean;
  token: number;
}

export interface ChatStore {
  chatgpt_api_web_version: string;
  systemMessageContent: string;
  history: ChatStoreMessage[];
  postBeginIndex: number;
  tokenMargin: number;
  totalTokens: number;
  maxTokens: number;
  apiKey: string;
  apiEndpoint: string;
  streamMode: boolean;
  model: string;
  responseModelName: string;
  cost: number;
}

const _defaultAPIEndpoint = "https://api.openai.com/v1/chat/completions";
const newChatStore = (
  apiKey = "",
  systemMessageContent = "Follow my instructions carefully",
  apiEndpoint = _defaultAPIEndpoint,
  streamMode = true,
  model = "gpt-3.5-turbo-0613"
): ChatStore => {
  return {
    chatgpt_api_web_version: CHATGPT_API_WEB_VERSION,
    systemMessageContent: getDefaultParams("sys", systemMessageContent),
    history: [],
    postBeginIndex: 0,
    tokenMargin: 1024,
    totalTokens: 0,
    maxTokens: models[getDefaultParams("model", model)]?.maxToken ?? 4096,
    apiKey: getDefaultParams("key", apiKey),
    apiEndpoint: getDefaultParams("api", apiEndpoint),
    streamMode: getDefaultParams("mode", streamMode),
    model: getDefaultParams("model", model),
    responseModelName: "",
    cost: 0,
  };
};

const STORAGE_NAME = "chatgpt-api-web";
const STORAGE_NAME_SELECTED = `${STORAGE_NAME}-selected`;
const STORAGE_NAME_INDEXES = `${STORAGE_NAME}-indexes`;
const STORAGE_NAME_TOTALCOST = `${STORAGE_NAME}-totalcost`;

export function addTotalCost(cost: number) {
  let totalCost = getTotalCost();
  totalCost += cost;
  localStorage.setItem(STORAGE_NAME_TOTALCOST, `${totalCost}`);
}

export function getTotalCost(): number {
  let totalCost = parseFloat(
    localStorage.getItem(STORAGE_NAME_TOTALCOST) ?? "0"
  );
  return totalCost;
}

export function clearTotalCost() {
  localStorage.setItem(STORAGE_NAME_TOTALCOST, `0`);
}

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
    const ret = JSON.parse(val) as ChatStore;
    // handle read from old version chatstore
    if (ret.model === undefined) ret.model = "gpt-3.5-turbo";
    if (ret.responseModelName === undefined) ret.responseModelName = "";
    if (ret.chatgpt_api_web_version === undefined)
      // this is from old version becasue it is undefined,
      // so no higher than v1.3.0
      ret.chatgpt_api_web_version = "v1.2.2";
    for (const message of ret.history) {
      if (message.hide === undefined) message.hide = false;
      if (message.token === undefined)
        message.token = calculate_token_length(message.content);
    }
    if (ret.cost === undefined) ret.cost = 0;
    return ret;
  };

  const [chatStore, _setChatStore] = useState(
    getChatStoreByIndex(selectedChatIndex)
  );
  const setChatStore = (chatStore: ChatStore) => {
    console.log("saved chat", selectedChatIndex, chatStore);
    localStorage.setItem(
      `${STORAGE_NAME}-${selectedChatIndex}`,
      JSON.stringify(chatStore)
    );

    console.log("recalculate postBeginIndex");
    const max = chatStore.maxTokens - chatStore.tokenMargin;
    let sum = 0;
    chatStore.postBeginIndex = chatStore.history.filter(
      ({ hide }) => !hide
    ).length;
    for (const msg of chatStore.history
      .filter(({ hide }) => !hide)
      .slice()
      .reverse()) {
      if (sum + msg.token > max) break;
      sum += msg.token;
      chatStore.postBeginIndex -= 1;
    }
    chatStore.postBeginIndex =
      chatStore.postBeginIndex < 0 ? 0 : chatStore.postBeginIndex;

    _setChatStore(chatStore);
  };
  useEffect(() => {
    _setChatStore(getChatStoreByIndex(selectedChatIndex));
  }, [selectedChatIndex]);

  const handleNewChatStore = () => {
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
          chatStore.streamMode,
          chatStore.model
        )
      )
    );
    allChatStoreIndexes.push(next);
    setAllChatStoreIndexes([...allChatStoreIndexes]);
    setSelectedChatIndex(next);
  };

  // if there are any params in URL, create a new chatStore
  useEffect(() => {
    const api = getDefaultParams("api", "");
    const key = getDefaultParams("key", "");
    const sys = getDefaultParams("sys", "");
    const mode = getDefaultParams("mode", "");
    const model = getDefaultParams("model", "");
    // only create new chatStore if the params in URL are NOT
    // equal to the current selected chatStore
    if (
      (api && api !== chatStore.apiEndpoint) ||
      (key && key !== chatStore.apiKey) ||
      (sys && sys !== chatStore.systemMessageContent) ||
      (mode && mode !== (chatStore.streamMode ? "stream" : "fetch")) ||
      (model && model !== chatStore.model)
    ) {
      handleNewChatStore();
    }
  }, []);

  return (
    <div className="flex text-sm h-full bg-slate-200 dark:bg-slate-800 dark:text-white">
      <div className="flex flex-col h-full p-2 border-r-indigo-500 border-2 dark:border-slate-800 dark:border-r-indigo-500 dark:text-black">
        <div className="grow overflow-scroll">
          <button
            className="bg-violet-300 p-1 rounded hover:bg-violet-400"
            onClick={handleNewChatStore}
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
                      className={`w-full my-1 p-1 rounded  hover:bg-blue-500 ${
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
                  chatStore.streamMode,
                  chatStore.model
                )
              );
            }

            // find nex selected chat index
            const next =
              newAllChatStoreIndexes[newAllChatStoreIndexes.length - 1];
            console.log("next is", next);
            setSelectedChatIndex(next);

            setAllChatStoreIndexes([...newAllChatStoreIndexes]);
          }}
        >
          DEL
        </button>
      </div>
      <ChatBOX
        chatStore={chatStore}
        setChatStore={setChatStore}
        selectedChatIndex={selectedChatIndex}
        setSelectedChatIndex={setSelectedChatIndex}
      />
    </div>
  );
}
