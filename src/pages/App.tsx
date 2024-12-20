import { openDB } from "idb";
import { useEffect, useState } from "preact/hooks";
import "@/global.css";

import { calculate_token_length } from "@/chatgpt";
import { getDefaultParams } from "@/utils/getDefaultParam";
import ChatBOX from "@/pages/Chatbox";
import { models } from "@/types/models";
import { DefaultModel } from "@/const";
import { Tr, langCodeContext, LANG_OPTIONS } from "@/translate";
import { ChatStore } from "@/types/chatstore";
import { newChatStore } from "@/types/newChatstore";
import { STORAGE_NAME, STORAGE_NAME_SELECTED } from "@/const";
import { upgrade } from "@/indexedDB/upgrade";
import { getTotalCost } from "@/utils/totalCost";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarShortcut,
  MenubarTrigger,
} from "@/components/ui/menubar";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import {
  BoxesIcon,
  ArrowUpDownIcon,
  CircleDollarSignIcon,
  ScissorsIcon,
  WholeWordIcon,
  EllipsisIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

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
    upgrade,
  });

  const { toast } = useToast();

  const getChatStoreByIndex = async (index: number): Promise<ChatStore> => {
    const ret: ChatStore = await (await db).get(STORAGE_NAME, index);
    if (ret === null || ret === undefined) return newChatStore({});
    // handle read from old version chatstore
    if (ret.maxGenTokens === undefined) ret.maxGenTokens = 2048;
    if (ret.maxGenTokens_enabled === undefined) ret.maxGenTokens_enabled = true;
    if (ret.model === undefined) ret.model = DefaultModel;
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

    // update total tokens
    chatStore.totalTokens = calculate_token_length(
      chatStore.systemMessageContent
    );
    for (const msg of chatStore.history
      .filter(({ hide }) => !hide)
      .slice(chatStore.postBeginIndex)) {
      chatStore.totalTokens += msg.token;
    }

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
    const newKey = await (await db).add(STORAGE_NAME, newChatStore(chatStore));
    setSelectedChatIndex(newKey as number);
    setAllChatStoreIndexes(await (await db).getAllKeys(STORAGE_NAME));
  };
  const handleNewChatStore = async () => {
    return handleNewChatStoreWithOldOne(chatStore);
  };

  const handleDEL = async () => {
    console.log("remove item", `${STORAGE_NAME}-${selectedChatIndex}`);
    (await db).delete(STORAGE_NAME, selectedChatIndex);
    const newAllChatStoreIndexes = await (await db).getAllKeys(STORAGE_NAME);

    if (newAllChatStoreIndexes.length === 0) {
      handleNewChatStore();
      return;
    }

    // find nex selected chat index
    const next = newAllChatStoreIndexes[newAllChatStoreIndexes.length - 1];
    console.log("next is", next);
    setSelectedChatIndex(next as number);
    setAllChatStoreIndexes(newAllChatStoreIndexes);

    toast({
      title: "Chat history deleted",
      description: `Chat history ${selectedChatIndex} has been deleted.`,
    });
  };

  const handleCLS = async () => {
    if (!confirm("Are you sure you want to delete **ALL** chat history?"))
      return;

    await (await db).clear(STORAGE_NAME);
    setAllChatStoreIndexes([]);
    setSelectedChatIndex(1);
    window.location.reload();
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
    <>
      <Sidebar>
        <SidebarHeader>
          <Button onClick={handleNewChatStore}>
            <span>{Tr("New")}</span>
          </Button>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Conversation</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {(allChatStoreIndexes as number[])
                  .slice()
                  .reverse()
                  .map((i) => {
                    // reverse
                    return (
                      <SidebarMenuItem
                        key={i}
                        onClick={() => setSelectedChatIndex(i)}
                      >
                        <SidebarMenuButton
                          asChild
                          isActive={i === selectedChatIndex}
                        >
                          <span>{i}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">{Tr("DEL")}</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the
                  chat history.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDEL}>
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {chatStore.develop_mode && (
            <Button onClick={handleCLS} variant="destructive">
              <span>{Tr("CLS")}</span>
            </Button>
          )}
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b">
          <div className="flex items-center gap-2 px-3">
            <SidebarTrigger />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <div className="dropdown lg:hidden flex items-center gap-2">
              <h1 className="text-lg font-bold">{chatStore.model}</h1>{" "}
              <Badge variant="outline">
                {chatStore.totalTokens.toString()}
              </Badge>
              <Popover>
                <PopoverTrigger>
                  <EllipsisIcon />
                </PopoverTrigger>
                <PopoverContent>
                  <p>
                    Tokens: {chatStore.totalTokens}/{chatStore.maxTokens}
                  </p>
                  <p>
                    Cut(s): {chatStore.postBeginIndex}/
                    {chatStore.history.filter(({ hide }) => !hide).length}
                  </p>
                  <p>
                    Cost: ${chatStore.cost.toFixed(4)} / $
                    {getTotalCost().toFixed(2)}
                  </p>
                </PopoverContent>
              </Popover>
            </div>
            <div className="hidden lg:inline-grid">
              <Menubar>
                <MenubarMenu>
                  <MenubarTrigger>
                    <BoxesIcon className="w-4 h-4 mr-2" />
                    {chatStore.model}
                  </MenubarTrigger>
                  <MenubarContent>
                    <MenubarItem>
                      {models[chatStore.model]?.price?.prompt * 1000 * 1000}$ /
                      1M input tokens
                    </MenubarItem>
                  </MenubarContent>
                </MenubarMenu>
                <MenubarMenu>
                  <MenubarTrigger>
                    <ArrowUpDownIcon className="w-4 h-4 mr-2" />
                    {chatStore.streamMode ? Tr("STREAM") : Tr("FETCH")}
                  </MenubarTrigger>
                  <MenubarContent>
                    <MenubarItem>STREAM/FETCH</MenubarItem>
                  </MenubarContent>
                </MenubarMenu>
                <MenubarMenu>
                  <MenubarTrigger>
                    <WholeWordIcon className="w-4 h-4 mr-2" />{" "}
                    {chatStore.totalTokens}
                  </MenubarTrigger>
                  <MenubarContent>
                    <MenubarItem>Max: {chatStore.maxTokens}</MenubarItem>
                  </MenubarContent>
                </MenubarMenu>
                <MenubarMenu>
                  <MenubarTrigger>
                    <ScissorsIcon className="w-4 h-4 mr-2" />
                    {chatStore.postBeginIndex}
                  </MenubarTrigger>
                  <MenubarContent>
                    <MenubarItem>
                      Max:{" "}
                      {chatStore.history.filter(({ hide }) => !hide).length}
                    </MenubarItem>
                  </MenubarContent>
                </MenubarMenu>
                <MenubarMenu>
                  <MenubarTrigger>
                    <CircleDollarSignIcon className="w-4 h-4 mr-2" />
                    {chatStore.cost.toFixed(4)}
                  </MenubarTrigger>
                  <MenubarContent>
                    <MenubarItem>
                      Accumulated: ${getTotalCost().toFixed(2)}
                    </MenubarItem>
                  </MenubarContent>
                </MenubarMenu>
              </Menubar>
            </div>
          </div>
        </header>
        <ChatBOX
          db={db}
          chatStore={chatStore}
          setChatStore={setChatStore}
          selectedChatIndex={selectedChatIndex}
          setSelectedChatIndex={setSelectedChatIndex}
        />
      </SidebarInset>
    </>
  );
}
