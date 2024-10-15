import { STORAGE_NAME } from "@/const";
import { ChatStore } from "@/types/chatstore";
import { IDBPDatabase, IDBPTransaction, StoreNames } from "idb";
import { upgradeV1 } from "@/indexedDB/v1";
import { upgradeV11 } from "./v11";

export async function upgrade(
  db: IDBPDatabase<ChatStore>,
  oldVersion: number,
  newVersion: number,
  transaction: IDBPTransaction<
    ChatStore,
    StoreNames<ChatStore>[],
    "versionchange"
  >,
) {
  if (oldVersion < 1) {
    upgradeV1(db, oldVersion, newVersion, transaction);
  }

  if (oldVersion < 11) {
    upgradeV11(db, oldVersion, newVersion, transaction);
  }
}
