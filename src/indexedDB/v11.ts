import { ChatStore } from "@/types/chatstore";
import { STORAGE_NAME } from "@/const";
import { IDBPDatabase, IDBPTransaction, StoreNames } from "idb";

export async function upgradeV11(
  db: IDBPDatabase<ChatStore>,
  oldVersion: number,
  newVersion: number,
  transaction: IDBPTransaction<
    ChatStore,
    StoreNames<ChatStore>[],
    "versionchange"
  >,
) {
  if (oldVersion < 11 && oldVersion >= 1) {
    alert("Start upgrading storage, just a sec... (Click OK to continue)");
  }
  if (
    transaction
      .objectStore(STORAGE_NAME)
      .indexNames.contains("contents_for_index")
  ) {
    transaction.objectStore(STORAGE_NAME).deleteIndex("contents_for_index");
  }
}
