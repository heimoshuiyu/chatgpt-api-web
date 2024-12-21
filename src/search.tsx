import { IDBPDatabase } from "idb";
import { StateUpdater, useRef, useState, Dispatch } from "preact/hooks";

import { ChatStore } from "@/types/chatstore";
import { MessageDetail } from "./chatgpt";

interface ChatStoreSearchResult {
  key: IDBValidKey;
  cs: ChatStore;
  query: string;
  preview: string;
}

export default function Search(props: {
  db: Promise<IDBPDatabase<ChatStore>>;
  setSelectedChatIndex: Dispatch<StateUpdater<number>>;
  chatStore: ChatStore;
  setShow: (show: boolean) => void;
}) {
  const [searchResult, setSearchResult] = useState<ChatStoreSearchResult[]>([]);
  const [searching, setSearching] = useState<boolean>(false);
  const [searchingNow, setSearchingNow] = useState<number>(0);
  const [pageIndex, setPageIndex] = useState<number>(0);
  const searchAbortRef = useRef<AbortController | null>(null);

  return (
    <div
      onClick={() => props.setShow(false)}
      className="left-0 top-0 overflow-scroll flex justify-center absolute w-screen h-full bg-black bg-opacity-50 z-10"
    >
      <div
        onClick={(event: any) => {
          event.stopPropagation();
        }}
        className="m-2 p-2 bg-base-300 rounded-lg h-fit w-2/3 z-20"
      >
        <div className="flex justify-between">
          <span className="m-1 p-1 font-bold">Search</span>
          <button
            className="m-1 p-1 btn btn-sm btn-secondary"
            onClick={() => props.setShow(false)}
          >
            Close
          </button>
        </div>
        <div>
          <input
            autoFocus
            className="input input-bordered w-full border"
            type="text"
            placeholder="Type Something..."
            onInput={async (event: any) => {
              const query = event.target.value.trim().toLowerCase();
              if (!query) {
                setSearchResult([]);
                return;
              }

              // abort previous search
              if (searchAbortRef.current) {
                searchAbortRef.current.abort();
              }

              // Create a new AbortController for the new operation
              const abortController = new AbortController();
              searchAbortRef.current = abortController;
              const signal = abortController.signal;

              setSearching(true);

              const db = await props.db;
              const resultKeys = await db.getAllKeys("chatgpt-api-web");

              const result: ChatStoreSearchResult[] = [];
              for (const key of resultKeys) {
                // abort the operation if the signal is set
                if (signal.aborted) {
                  return;
                }

                const now = Math.floor(
                  (result.length / resultKeys.length) * 100
                );
                if (now !== searchingNow) setSearchingNow(now);

                const value: ChatStore = await db.get("chatgpt-api-web", key);

                let preview: string = "";
                for (const msg of value.history) {
                  const contentType = typeof msg.content;
                  if (contentType === "string") {
                    if (!msg.content.includes(query)) continue;

                    const beginIndex = msg.content.indexOf(query);
                    preview = msg.content.slice(
                      Math.max(0, beginIndex - 100),
                      Math.min(msg.content.length, beginIndex + 239)
                    ) as string;
                    break;
                  } else if (contentType === "object") {
                    const details = msg.content as MessageDetail[];
                    for (const detail of details) {
                      if (detail.type !== "text") continue;
                      if (!detail.text?.includes(query)) continue;
                      const beginIndex = detail.text.indexOf(query);
                      preview = detail.text.slice(
                        Math.max(0, beginIndex - 100),
                        Math.min(detail.text.length, beginIndex + 239)
                      ) as string;
                      break;
                    }
                  }
                }
                if (preview === "") continue;
                result.push({
                  key,
                  cs: value,
                  query: query,
                  preview: preview,
                });
              }

              // sort by key desc
              result.sort((a, b) => {
                if (a.key < b.key) {
                  return 1;
                }
                if (a.key > b.key) {
                  return -1;
                }
                return 0;
              });
              console.log(result);

              setPageIndex(0);
              setSearchResult(result);
              setSearching(false);
            }}
          />
        </div>
        {searching && <div>Searching {searchingNow}%...</div>}

        <div>
          {searchResult
            .slice(pageIndex * 10, (pageIndex + 1) * 10)
            .map((result: ChatStoreSearchResult) => {
              return (
                <div
                  className="flex justify-start p-1 m-1 rounded border bg-base-200 cursor-pointer"
                  key={result.key}
                  onClick={() => {
                    props.setSelectedChatIndex(parseInt(result.key.toString()));
                    props.setShow(false);
                  }}
                >
                  <div className="m-1 p-1 font-bold">{result.key}</div>
                  <div className="m-1 p-1">{result.preview}</div>
                </div>
              );
            })}
        </div>
        {searchResult.length > 0 && (
          <div className="flex justify-center my-2">
            <div className="join">
              <button
                className="join-item btn btn-sm"
                disabled={pageIndex === 0}
                onClick={() => {
                  if (pageIndex === 0) {
                    return;
                  }
                  setPageIndex(pageIndex - 1);
                }}
              >
                «
              </button>
              <button className="join-item btn btn-sm">
                Page {pageIndex + 1} /{" "}
                {Math.floor(searchResult.length / 10) + 1}
              </button>
              <button
                className="join-item btn btn-sm"
                disabled={pageIndex === Math.floor(searchResult.length / 10)}
                onClick={() => {
                  if (pageIndex === Math.floor(searchResult.length / 10)) {
                    return;
                  }
                  setPageIndex(pageIndex + 1);
                }}
              >
                »
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
