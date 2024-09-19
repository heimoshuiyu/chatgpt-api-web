import { IDBPDatabase, openDB } from "idb";
import { useEffect, useState } from "preact/hooks";
import "./global.css";

import { calculate_token_length, Logprobs, Message } from "./chatgpt";
import getDefaultParams from "./getDefaultParam";
import ChatBOX from "./chatbox";
import models, { defaultModel } from "./models";
import { Tr, langCodeContext, LANG_OPTIONS } from "./translate";

import CHATGPT_API_WEB_VERSION from "./CHATGPT_API_WEB_VERSION";

export interface ChatStoreMessage extends Message {
  hide: boolean;
  token: number;
  example: boolean;
  audio: Blob | null;
  logprobs: Logprobs | null;
}

export interface TemplateAPI {
  name: string;
  key: string;
  endpoint: string;
}

export interface TemplateTools {
  name: string;
  toolsString: string;
}

export interface ChatStore {
  chatgpt_api_web_version: string;
  systemMessageContent: string;
  toolsString: string;
  history: ChatStoreMessage[];
  postBeginIndex: number;
  tokenMargin: number;
  totalTokens: number;
  maxTokens: number;
  maxGenTokens: number;
  maxGenTokens_enabled: boolean;
  apiKey: string;
  apiEndpoint: string;
  streamMode: boolean;
  model: string;
  responseModelName: string;
  cost: number;
  temperature: number;
  temperature_enabled: boolean;
  top_p: number;
  top_p_enabled: boolean;
  presence_penalty: number;
  frequency_penalty: number;
  develop_mode: boolean;
  whisper_api: string;
  whisper_key: string;
  tts_api: string;
  tts_key: string;
  tts_voice: string;
  tts_speed: number;
  tts_speed_enabled: boolean;
  tts_format: string;
  image_gen_api: string;
  image_gen_key: string;
  json_mode: boolean;
  logprobs: boolean;
  contents_for_index: string[];
}

const _defaultAPIEndpoint = "https://api.openai.com/v1/chat/completions";
export const newChatStore = (
  apiKey = "",
  systemMessageContent = "",
  apiEndpoint = _defaultAPIEndpoint,
  streamMode = true,
  model = defaultModel,
  temperature = 0.7,
  dev = false,
  whisper_api = "https://api.openai.com/v1/audio/transcriptions",
  whisper_key = "",
  tts_api = "https://api.openai.com/v1/audio/speech",
  tts_key = "",
  tts_speed = 1.0,
  tts_speed_enabled = false,
  tts_format = "mp3",
  toolsString = "",
  image_gen_api = "https://api.openai.com/v1/images/generations",
  image_gen_key = "",
  json_mode = false,
  logprobs = false
): ChatStore => {
  return {
    chatgpt_api_web_version: CHATGPT_API_WEB_VERSION,
    systemMessageContent: getDefaultParams("sys", systemMessageContent),
    toolsString,
    history: [],
    postBeginIndex: 0,
    tokenMargin: 1024,
    totalTokens: 0,
    maxTokens: getDefaultParams(
      "max",
      models[getDefaultParams("model", model)]?.maxToken ?? 2048
    ),
    maxGenTokens: 2048,
    maxGenTokens_enabled: false,
    apiKey: getDefaultParams("key", apiKey),
    apiEndpoint: getDefaultParams("api", apiEndpoint),
    streamMode: getDefaultParams("mode", streamMode),
    model: getDefaultParams("model", model),
    responseModelName: "",
    cost: 0,
    temperature: getDefaultParams("temp", temperature),
    temperature_enabled: true,
    top_p: 1,
    top_p_enabled: false,
    presence_penalty: 0,
    frequency_penalty: 0,
    develop_mode: getDefaultParams("dev", dev),
    whisper_api: getDefaultParams("whisper-api", whisper_api),
    whisper_key: getDefaultParams("whisper-key", whisper_key),
    tts_api: getDefaultParams("tts-api", tts_api),
    tts_key: getDefaultParams("tts-key", tts_key),
    tts_voice: "alloy",
    tts_speed: tts_speed,
    tts_speed_enabled: tts_speed_enabled,
    image_gen_api: image_gen_api,
    image_gen_key: image_gen_key,
    json_mode: json_mode,
    tts_format: tts_format,
    logprobs,
    contents_for_index: [],
  };
};

export const STORAGE_NAME = "chatgpt-api-web";
const STORAGE_NAME_SELECTED = `${STORAGE_NAME}-selected`;
const STORAGE_NAME_INDEXES = `${STORAGE_NAME}-indexes`;
const STORAGE_NAME_TOTALCOST = `${STORAGE_NAME}-totalcost`;
export const STORAGE_NAME_TEMPLATE = `${STORAGE_NAME}-template`;
export const STORAGE_NAME_TEMPLATE_API = `${STORAGE_NAME_TEMPLATE}-api`;
export const STORAGE_NAME_TEMPLATE_API_WHISPER = `${STORAGE_NAME_TEMPLATE}-api-whisper`;
export const STORAGE_NAME_TEMPLATE_API_TTS = `${STORAGE_NAME_TEMPLATE}-api-tts`;
export const STORAGE_NAME_TEMPLATE_API_IMAGE_GEN = `${STORAGE_NAME_TEMPLATE}-api-image-gen`;
export const STORAGE_NAME_TEMPLATE_TOOLS = `${STORAGE_NAME_TEMPLATE}-tools`;

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

export function BuildFiledForSearch(chatStore: ChatStore): string[] {
  const contents_for_index: string[] = [];

  if (chatStore.systemMessageContent.trim()) {
    contents_for_index.push(chatStore.systemMessageContent.trim());
  }

  for (const msg of chatStore.history) {
    if (typeof msg.content === "string") {
      contents_for_index.push(msg.content);
      continue;
    }

    for (const chunk of msg.content) {
      if (chunk.type === "text") {
        const text = chunk.text;
        if (text?.trim()) {
          contents_for_index.push(text);
        }
      }
    }
  }

  return contents_for_index;
}

export function App() {
  // init selected index
  const [selectedChatIndex, setSelectedChatIndex] = useState(
    parseInt(localStorage.getItem(STORAGE_NAME_SELECTED) ?? "1")
  );
  console.log("selectedChatIndex", selectedChatIndex);
  useEffect(() => {
    console.log("set selected chat index", selectedChatIndex);
    localStorage.setItem(STORAGE_NAME_SELECTED, `${selectedChatIndex}`);
  }, [selectedChatIndex]);

  const db = openDB<ChatStore>(STORAGE_NAME, 11, {
    async upgrade(db, oldVersion, newVersion, transaction) {
      if (oldVersion < 1) {
        const store = db.createObjectStore(STORAGE_NAME, {
          autoIncrement: true,
        });

        // copy from localStorage to indexedDB
        const allChatStoreIndexes: number[] = JSON.parse(
          localStorage.getItem(STORAGE_NAME_INDEXES) ?? "[]"
        );
        let keyCount = 0;
        for (const i of allChatStoreIndexes) {
          console.log("importing chatStore from localStorage", i);
          const key = `${STORAGE_NAME}-${i}`;
          const val = localStorage.getItem(key);
          if (val === null) continue;
          store.add(JSON.parse(val));
          keyCount += 1;
        }
        setSelectedChatIndex(keyCount);
        if (keyCount > 0) {
          alert(
            "v2.0.0 Update: Imported chat history from localStorage to indexedDB. 🎉"
          );
        }
      }

      if (oldVersion < 11) {
        if (oldVersion < 11 && oldVersion >= 1) {
          alert(
            "Start upgrading storage, just a sec... (Click OK to continue)"
          );
        }
        if (
          transaction
            .objectStore(STORAGE_NAME)
            .indexNames.contains("contents_for_index")
        ) {
          transaction
            .objectStore(STORAGE_NAME)
            .deleteIndex("contents_for_index");
        }
        transaction.objectStore(STORAGE_NAME).createIndex(
          "contents_for_index", // name
          "contents_for_index", // keyPath
          {
            multiEntry: true,
            unique: false,
          }
        );

        // iter through all chatStore and update contents_for_index
        const store = transaction.objectStore(STORAGE_NAME);
        const allChatStoreIndexes = await store.getAllKeys();
        for (const i of allChatStoreIndexes) {
          const chatStore: ChatStore = await store.get(i);

          chatStore.contents_for_index = BuildFiledForSearch(chatStore);
          await store.put(chatStore, i);
        }
      }
    },
  });

  const getChatStoreByIndex = async (index: number): Promise<ChatStore> => {
    const ret: ChatStore = await (await db).get(STORAGE_NAME, index);
    if (ret === null || ret === undefined) return newChatStore();
    // handle read from old version chatstore
    if (ret.maxGenTokens === undefined) ret.maxGenTokens = 2048;
    if (ret.maxGenTokens_enabled === undefined) ret.maxGenTokens_enabled = true;
    if (ret.model === undefined) ret.model = defaultModel;
    if (ret.responseModelName === undefined) ret.responseModelName = "";
    if (ret.toolsString === undefined) ret.toolsString = "";
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

  const [chatStore, _setChatStore] = useState(newChatStore());
  const setChatStore = async (chatStore: ChatStore) => {
    // building field for search
    chatStore.contents_for_index = BuildFiledForSearch(chatStore);

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

    // manually estimate token
    chatStore.totalTokens = calculate_token_length(
      chatStore.systemMessageContent
    );
    for (const msg of chatStore.history
      .filter(({ hide }) => !hide)
      .slice(chatStore.postBeginIndex)) {
      chatStore.totalTokens += msg.token;
    }

    console.log("saved chat", selectedChatIndex, chatStore);
    (await db).put(STORAGE_NAME, chatStore, selectedChatIndex);

    _setChatStore(chatStore);
  };
  useEffect(() => {
    const run = async () => {
      _setChatStore(await getChatStoreByIndex(selectedChatIndex));
    };
    run();
  }, [selectedChatIndex]);

  // all chat store indexes
  const [allChatStoreIndexes, setAllChatStoreIndexes] = useState<IDBValidKey>(
    []
  );

  const handleNewChatStoreWithOldOne = async (chatStore: ChatStore) => {
    const newKey = await (
      await db
    ).add(
      STORAGE_NAME,
      newChatStore(
        chatStore.apiKey,
        chatStore.systemMessageContent,
        chatStore.apiEndpoint,
        chatStore.streamMode,
        chatStore.model,
        chatStore.temperature,
        !!chatStore.develop_mode,
        chatStore.whisper_api,
        chatStore.whisper_key,
        chatStore.tts_api,
        chatStore.tts_key,
        chatStore.tts_speed,
        chatStore.tts_speed_enabled,
        chatStore.tts_format,
        chatStore.toolsString,
        chatStore.image_gen_api,
        chatStore.image_gen_key,
        chatStore.json_mode,
        false // logprobs default to false
      )
    );
    setSelectedChatIndex(newKey as number);
    setAllChatStoreIndexes(await (await db).getAllKeys(STORAGE_NAME));
  };
  const handleNewChatStore = async () => {
    return handleNewChatStoreWithOldOne(chatStore);
  };

  // if there are any params in URL, create a new chatStore
  useEffect(() => {
    const run = async () => {
      const chatStore = await getChatStoreByIndex(selectedChatIndex);
      const api = getDefaultParams("api", "");
      const key = getDefaultParams("key", "");
      const sys = getDefaultParams("sys", "");
      const mode = getDefaultParams("mode", "");
      const model = getDefaultParams("model", "");
      const max = getDefaultParams("max", 0);
      console.log("max is", max, "chatStore.max is", chatStore.maxTokens);
      // only create new chatStore if the params in URL are NOT
      // equal to the current selected chatStore
      if (
        (api && api !== chatStore.apiEndpoint) ||
        (key && key !== chatStore.apiKey) ||
        (sys && sys !== chatStore.systemMessageContent) ||
        (mode && mode !== (chatStore.streamMode ? "stream" : "fetch")) ||
        (model && model !== chatStore.model) ||
        (max !== 0 && max !== chatStore.maxTokens)
      ) {
        console.log("create new chatStore because of params in URL");
        handleNewChatStoreWithOldOne(chatStore);
      }
      await db;
      const allidx = await (await db).getAllKeys(STORAGE_NAME);
      if (allidx.length === 0) {
        handleNewChatStore();
      }
      setAllChatStoreIndexes(await (await db).getAllKeys(STORAGE_NAME));
    };
    run();
  }, []);

  return (
    <div className="flex text-sm h-full">
      <div className="flex flex-col h-full p-2 bg-primary">
        <div className="grow overflow-scroll">
          <button
            className="btn btn-sm btn-info p-1 my-1 w-full"
            onClick={handleNewChatStore}
          >
            {Tr("NEW")}
          </button>
          <ul class="pt-2">
            {(allChatStoreIndexes as number[])
              .slice()
              .reverse()
              .map((i) => {
                // reverse
                return (
                  <li>
                    <button
                      className={`w-full my-1 p-1 btn btn-sm ${
                        i === selectedChatIndex ? "btn-accent" : "btn-secondary"
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
        <div>
          <button
            className="btn btn-warning btn-sm p-1 my-1 w-full"
            onClick={async () => {
              if (
                !confirm("Are you sure you want to delete this chat history?")
              )
                return;
              console.log(
                "remove item",
                `${STORAGE_NAME}-${selectedChatIndex}`
              );
              (await db).delete(STORAGE_NAME, selectedChatIndex);
              const newAllChatStoreIndexes = await (
                await db
              ).getAllKeys(STORAGE_NAME);

              if (newAllChatStoreIndexes.length === 0) {
                handleNewChatStore();
                return;
              }

              // find nex selected chat index
              const next =
                newAllChatStoreIndexes[newAllChatStoreIndexes.length - 1];
              console.log("next is", next);
              setSelectedChatIndex(next as number);
              setAllChatStoreIndexes(newAllChatStoreIndexes);
            }}
          >
            {Tr("DEL")}
          </button>
          {chatStore.develop_mode && (
            <button
              className="btn btn-sm btn-warning p-1 my-1 w-full"
              onClick={async () => {
                if (
                  !confirm(
                    "Are you sure you want to delete **ALL** chat history?"
                  )
                )
                  return;

                await (await db).clear(STORAGE_NAME);
                setAllChatStoreIndexes([]);
                setSelectedChatIndex(1);
                window.location.reload();
              }}
            >
              {Tr("CLS")}
            </button>
          )}
        </div>
      </div>
      <ChatBOX
        db={db}
        chatStore={chatStore}
        setChatStore={setChatStore}
        selectedChatIndex={selectedChatIndex}
        setSelectedChatIndex={setSelectedChatIndex}
      />
    </div>
  );
}
