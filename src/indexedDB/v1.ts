import { STORAGE_NAME, STORAGE_NAME_INDEXES } from "@/const";
import { ChatStore } from "@/types/chatstore";
import { IDBPDatabase, IDBPTransaction, StoreNames } from "idb";

export async function upgradeV1(
  db: IDBPDatabase<ChatStore>,
  oldVersion: number,
  newVersion: number,
  transaction: IDBPTransaction<
    ChatStore,
    StoreNames<ChatStore>[],
    "versionchange"
  >,
) {
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
  // setSelectedChatIndex(keyCount);
  if (keyCount > 0) {
    alert(
      "v2.0.0 Update: Imported chat history from localStorage to indexedDB. 🎉",
    );
  }
}
