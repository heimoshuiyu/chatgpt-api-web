import { useRef, useState, Dispatch, useContext } from "react";

import { ChatStore } from "@/types/chatstore";
import { MessageDetail } from "../chatgpt";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

import { Input } from "./ui/input";
import { AppContext } from "../pages/App";
import { Button } from "./ui/button";
import { SearchIcon } from "lucide-react";

interface ChatStoreSearchResult {
  key: IDBValidKey;
  cs: ChatStore;
  query: string;
  preview: string;
}

export default function Search() {
  const ctx = useContext(AppContext);
  if (ctx === null) return <></>;
  const { setSelectedChatIndex, db } = ctx;

  const [searchResult, setSearchResult] = useState<ChatStoreSearchResult[]>([]);
  const [searching, setSearching] = useState<boolean>(false);
  const [searchingNow, setSearchingNow] = useState<number>(0);
  const [pageIndex, setPageIndex] = useState<number>(0);
  const searchAbortRef = useRef<AbortController | null>(null);
  const [open, setOpen] = useState<boolean>(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>
        <Button variant="outline" size="icon">
          <SearchIcon />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[80%]">
        <DialogHeader>
          <DialogTitle>Search</DialogTitle>
          <DialogDescription>Search messages by content.</DialogDescription>
        </DialogHeader>
        <div>
          <Input
            autoFocus
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

              const idb = await db;
              const resultKeys = await idb.getAllKeys("chatgpt-api-web");

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

                const value: ChatStore = await idb.get("chatgpt-api-web", key);

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
                  key={result.key as number}
                  onClick={() => {
                    setSelectedChatIndex(parseInt(result.key.toString()));
                    setOpen(false);
                  }}
                >
                  <div className="m-1 p-1 font-bold">
                    {result.key as number}
                  </div>
                  <div className="m-1 p-1">{result.preview}</div>
                </div>
              );
            })}
        </div>
        {searchResult.length > 0 && (
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => {
                    if (pageIndex === 0) return;
                    setPageIndex(pageIndex - 1);
                  }}
                  // disabled={pageIndex === 0}
                />
              </PaginationItem>
              <PaginationItem>
                {pageIndex + 1} of {Math.floor(searchResult.length / 10) + 1}
              </PaginationItem>
              <PaginationItem>
                <PaginationNext
                  onClick={() => {
                    if (pageIndex === Math.floor(searchResult.length / 10))
                      return;
                    setPageIndex(pageIndex + 1);
                  }}
                  // disabled={pageIndex === Math.floor(searchResult.length / 10)}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </DialogContent>
    </Dialog>
  );
}
