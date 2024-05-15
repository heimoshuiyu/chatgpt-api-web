import { IDBPDatabase } from "idb";
import { ChatStore } from "./app";
import { StateUpdater, useRef, useState } from "preact/hooks";

interface ChatStoreSearchResult {
  key: IDBValidKey;
  cs: ChatStore;
  query: string;
  preview: string;
}

export default function Search(props: {
  db: Promise<IDBPDatabase<ChatStore>>;
  setSelectedChatIndex: StateUpdater<number>;
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
        className="m-2 p-2 bg-white rounded-lg h-fit w-2/3 z-20"
      >
        <div className="flex justify-between">
          <span className="m-1 p-1 font-bold">Search</span>
          <button
            className="m-1 p-1 bg-cyan-400 rounded"
            onClick={() => props.setShow(false)}
          >
            Close
          </button>
        </div>
        <hr />
        <div>
          <input
            autoFocus
            className="m-1 p-1 w-full border"
            type="text"
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
                const content = value.contents_for_index
                  .join(" ")
                  .toLowerCase();
                if (content.includes(query)) {
                  const beginIndex: number = content.indexOf(query);
                  const preview = content.slice(
                    Math.max(0, beginIndex - 100),
                    Math.min(content.length, beginIndex + 239)
                  );
                  result.push({
                    key,
                    cs: value,
                    query: query,
                    preview: preview,
                  });
                }
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
        {searchResult.length > 0 && (
          <div className="flex justify-between">
            <button
              className="m-1 p-1 rounded bg-green-300 disabled:bg-slate-400"
              disabled={pageIndex === 0}
              onClick={() => {
                if (pageIndex === 0) {
                  return;
                }
                setPageIndex(pageIndex - 1);
              }}
            >
              Last page
            </button>
            <div className="m-1 p-1">
              Page: {pageIndex + 1} / {Math.floor(searchResult.length / 10) + 1}
            </div>
            <button
              className="m-1 p-1 rounded bg-green-300 disabled:bg-slate-400"
              disabled={pageIndex === Math.floor(searchResult.length / 10)}
              onClick={() => {
                if (pageIndex === Math.floor(searchResult.length / 10)) {
                  return;
                }
                setPageIndex(pageIndex + 1);
              }}
            >
              Next page
            </button>
          </div>
        )}
        <div>
          {searchResult
            .slice(pageIndex * 10, (pageIndex + 1) * 10)
            .map((result: ChatStoreSearchResult) => {
              return (
                <div
                  className="flex justify-start p-1 m-1 rounded border bg-slate-300 cursor-pointer"
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
      </div>
    </div>
  );
}
