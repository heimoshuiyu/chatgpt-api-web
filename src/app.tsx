import { IDBPDatabase, openDB } from "idb";
import { useEffect, useState } from "preact/hooks";
import "@/global.css";

import { calculate_token_length } from "@/chatgpt";
import { getDefaultParams } from "@/utils/getDefaultParam";
import ChatBOX from "@/chatbox";
import { DefaultModel } from "@/const";
import { Tr, langCodeContext, LANG_OPTIONS } from "@/translate";
import { ChatStore } from "@/types/chatstore";
import { newChatStore } from "@/types/newChatstore";
import {
  STORAGE_NAME,
  STORAGE_NAME_INDEXES,
  STORAGE_NAME_SELECTED
} from '@/const';


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
    parseInt(localStorage.getItem(STORAGE_NAME_SELECTED) ?? "1"),
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
          localStorage.getItem(STORAGE_NAME_INDEXES) ?? "[]",
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
            "v2.0.0 Update: Imported chat history from localStorage to indexedDB. 🎉",
          );
        }
      }

      if (oldVersion < 11) {
        if (oldVersion < 11 && oldVersion >= 1) {
          alert(
            "Start upgrading storage, just a sec... (Click OK to continue)",
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
          },
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
    if (ret === null || ret === undefined) return newChatStore({});
    // handle read from old version chatstore
    if (ret.maxGenTokens === undefined) ret.maxGenTokens = 2048;
    if (ret.maxGenTokens_enabled === undefined) ret.maxGenTokens_enabled = true;
    if (ret.model === undefined) ret.model = DefaultModel;
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

  const [chatStore, _setChatStore] = useState(newChatStore({}));
  const setChatStore = async (chatStore: ChatStore) => {
    // building field for search
    chatStore.contents_for_index = BuildFiledForSearch(chatStore);

    console.log("recalculate postBeginIndex");
    const max = chatStore.maxTokens - chatStore.tokenMargin;
    let sum = 0;
    chatStore.postBeginIndex = chatStore.history.filter(
      ({ hide }) => !hide,
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
      chatStore.systemMessageContent,
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
    [],
  );

  const handleNewChatStoreWithOldOne = async (chatStore: ChatStore) => {
    const newKey = await (await db).add(STORAGE_NAME, newChatStore(chatStore));
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
          <ul className="pt-2">
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
                `${STORAGE_NAME}-${selectedChatIndex}`,
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
                    "Are you sure you want to delete **ALL** chat history?",
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
