import { IDBPDatabase, openDB } from "idb";
import { createContext, useContext, useEffect, useState, useRef } from "react"; // 添加了useRef
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
  STORAGE_NAME_TEMPLATE,
  STORAGE_NAME_TEMPLATE_API,
  STORAGE_NAME_TEMPLATE_API_IMAGE_GEN,
  STORAGE_NAME_TEMPLATE_API_TTS,
  STORAGE_NAME_TEMPLATE_API_WHISPER,
  STORAGE_NAME_TEMPLATE_TOOLS,
  STORAGE_NAME_TEMPLATE_MCP_SERVERS,
} from "@/const";
import {
  ChatStoreMessage,
  TemplateChatStore,
  TemplateAPI,
  TemplateTools,
  TemplateMCPServer,
} from "../types/chatstore";

interface AppContextType {
  db: Promise<IDBPDatabase<ChatStore>>;
  selectedChatIndex: number;
  setSelectedChatIndex: (i: number) => void;
  templates: TemplateChatStore[];
  setTemplates: (t: TemplateChatStore[]) => void;
  templateAPIs: TemplateAPI[];
  setTemplateAPIs: (t: TemplateAPI[]) => void;
  templateAPIsWhisper: TemplateAPI[];
  setTemplateAPIsWhisper: (t: TemplateAPI[]) => void;
  templateAPIsTTS: TemplateAPI[];
  setTemplateAPIsTTS: (t: TemplateAPI[]) => void;
  templateAPIsImageGen: TemplateAPI[];
  setTemplateAPIsImageGen: (t: TemplateAPI[]) => void;
  templateTools: TemplateTools[];
  setTemplateTools: (t: TemplateTools[]) => void;
  templateMCPServers: TemplateMCPServer[];
  setTemplateMCPServers: (t: TemplateMCPServer[]) => void;
  defaultRenderMD: boolean;
  setDefaultRenderMD: (b: boolean) => void;
  callingTools: { [key: string]: boolean };
  setCallingTools: (
    tools:
      | { [key: string]: boolean }
      | ((prev: { [key: string]: boolean }) => { [key: string]: boolean })
  ) => void;
  handleNewChatStore: () => Promise<void>;
  handleNewChatStoreWithOldOne: (chatStore: ChatStore) => Promise<void>;
}

interface AppChatStoreContextType {
  chatStore: ChatStore;
  setChatStore: (cs: ChatStore) => Promise<void>;
}

export const AppContext = createContext<AppContextType>(null as any);
export const AppChatStoreContext = createContext<AppChatStoreContextType>(
  null as any
);

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
  SidebarProvider,
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

import { useToast } from "@/hooks/use-toast";
import { ModeToggle } from "@/components/ModeToggle";

import Search from "@/components/Search";

import Navbar from "@/components/navbar";
import ConversationTitle from "@/components/ConversationTitle.";
import ImportDialog from "@/components/ImportDialog";

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
    if (ret === null || ret === undefined) {
      const newStore = newChatStore({});
      toast({
        title: "New chat created",
        description: `Current API Endpoint: ${newStore.apiEndpoint}`,
      });
      return newStore;
    }
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

  // all chat store indexes
  const [allChatStoreIndexes, setAllChatStoreIndexes] = useState<IDBValidKey>(
    []
  );

  const handleNewChatStoreWithOldOne = async (chatStore: ChatStore) => {
    const newKey = await (await db).add(STORAGE_NAME, newChatStore(chatStore));
    setSelectedChatIndex(newKey as number);
    setAllChatStoreIndexes(await (await db).getAllKeys(STORAGE_NAME));
    toast({
      title: "New chat created",
      description: `Current API Endpoint: ${chatStore.apiEndpoint}`,
    });
  };
  const handleNewChatStore = async () => {
    let currentChatStore = await getChatStoreByIndex(selectedChatIndex);
    return handleNewChatStoreWithOldOne(currentChatStore);
  };

  const handleDEL = async () => {
    console.log("remove item", `${STORAGE_NAME}-${selectedChatIndex}`);
    (await db).delete(STORAGE_NAME, selectedChatIndex);
    const newAllChatStoreIndexes = await (await db).getAllKeys(STORAGE_NAME);

    if (newAllChatStoreIndexes.length === 0) {
      await handleNewChatStore();
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

  const [showImportDialog, setShowImportDialog] = useState(false);
  // if there are any params in URL, show the alert dialog to import configure
  useEffect(() => {
    const run = async () => {
      const params = new URLSearchParams(window.location.search);
      if (
        params.get("api") ||
        params.get("key") ||
        params.get("sys") ||
        params.get("mode") ||
        params.get("model") ||
        params.get("max") ||
        params.get("temp") ||
        params.get("dev") ||
        params.get("whisper-api") ||
        params.get("whisper-key") ||
        params.get("tts-api") ||
        params.get("tts-key")
      ) {
        setShowImportDialog(true);
      }
      await db;
      const allidx = await (await db).getAllKeys(STORAGE_NAME);
      if (allidx.length === 0) {
        handleNewChatStore();
      }
      setAllChatStoreIndexes(await (await db).getAllKeys(STORAGE_NAME));
      /*
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
      */

      // Hide loading screen and show app
      const loadingScreen = document.getElementById("loading-screen");
      const app = document.getElementById("app");
      if (loadingScreen && app) {
        // Add loaded class to app for fade-in effect
        app.classList.add("loaded");

        // Hide loading screen with fade-out effect
        loadingScreen.style.opacity = "0";

        // Remove loading screen from DOM after transition
        setTimeout(() => {
          loadingScreen.remove();
        }, 500);
      }
    };
    run();
  }, []);

  const [templates, _setTemplates] = useState(
    JSON.parse(
      localStorage.getItem(STORAGE_NAME_TEMPLATE) || "[]"
    ) as TemplateChatStore[]
  );
  const [templateAPIs, _setTemplateAPIs] = useState(
    JSON.parse(
      localStorage.getItem(STORAGE_NAME_TEMPLATE_API) || "[]"
    ) as TemplateAPI[]
  );
  const [templateAPIsWhisper, _setTemplateAPIsWhisper] = useState(
    JSON.parse(
      localStorage.getItem(STORAGE_NAME_TEMPLATE_API_WHISPER) || "[]"
    ) as TemplateAPI[]
  );
  const [templateAPIsTTS, _setTemplateAPIsTTS] = useState(
    JSON.parse(
      localStorage.getItem(STORAGE_NAME_TEMPLATE_API_TTS) || "[]"
    ) as TemplateAPI[]
  );
  const [templateAPIsImageGen, _setTemplateAPIsImageGen] = useState(
    JSON.parse(
      localStorage.getItem(STORAGE_NAME_TEMPLATE_API_IMAGE_GEN) || "[]"
    ) as TemplateAPI[]
  );
  const [templateTools, _setTemplateTools] = useState(
    JSON.parse(
      localStorage.getItem(STORAGE_NAME_TEMPLATE_TOOLS) || "[]"
    ) as TemplateTools[]
  );
  const [templateMCPServers, _setTemplateMCPServers] = useState(
    JSON.parse(
      localStorage.getItem(STORAGE_NAME_TEMPLATE_MCP_SERVERS) || "[]"
    ) as TemplateMCPServer[]
  );
  const setTemplates = (templates: TemplateChatStore[]) => {
    localStorage.setItem(STORAGE_NAME_TEMPLATE, JSON.stringify(templates));
    _setTemplates(templates);
  };
  const setTemplateAPIs = (templateAPIs: TemplateAPI[]) => {
    localStorage.setItem(
      STORAGE_NAME_TEMPLATE_API,
      JSON.stringify(templateAPIs)
    );
    _setTemplateAPIs(templateAPIs);
  };
  const setTemplateAPIsWhisper = (templateAPIWhisper: TemplateAPI[]) => {
    localStorage.setItem(
      STORAGE_NAME_TEMPLATE_API_WHISPER,
      JSON.stringify(templateAPIWhisper)
    );
    _setTemplateAPIsWhisper(templateAPIWhisper);
  };
  const setTemplateAPIsTTS = (templateAPITTS: TemplateAPI[]) => {
    localStorage.setItem(
      STORAGE_NAME_TEMPLATE_API_TTS,
      JSON.stringify(templateAPITTS)
    );
    _setTemplateAPIsTTS(templateAPITTS);
  };
  const setTemplateAPIsImageGen = (templateAPIImageGen: TemplateAPI[]) => {
    localStorage.setItem(
      STORAGE_NAME_TEMPLATE_API_IMAGE_GEN,
      JSON.stringify(templateAPIImageGen)
    );
    _setTemplateAPIsImageGen(templateAPIImageGen);
  };
  const setTemplateTools = (templateTools: TemplateTools[]) => {
    localStorage.setItem(
      STORAGE_NAME_TEMPLATE_TOOLS,
      JSON.stringify(templateTools)
    );
    _setTemplateTools(templateTools);
  };
  const setTemplateMCPServers = (templateMCPServers: TemplateMCPServer[]) => {
    localStorage.setItem(
      STORAGE_NAME_TEMPLATE_MCP_SERVERS,
      JSON.stringify(templateMCPServers)
    );
    _setTemplateMCPServers(templateMCPServers);
  };
  const [defaultRenderMD, _setDefaultRenderMD] = useState(
    localStorage.getItem("defaultRenderMD") === "true"
  );
  const setDefaultRenderMD = (defaultRenderMD: boolean) => {
    localStorage.setItem("defaultRenderMD", `${defaultRenderMD}`);
    _setDefaultRenderMD(defaultRenderMD);
  };

  // Global state for tracking calling tools status
  const [callingTools, setCallingTools] = useState<{ [key: string]: boolean }>(
    {}
  );

  console.log("[PERFORMANCE!] reading localStorage");

  return (
    <AppContext.Provider
      value={{
        db,
        selectedChatIndex,
        setSelectedChatIndex,
        templates,
        setTemplates,
        templateAPIs,
        setTemplateAPIs,
        templateAPIsWhisper,
        setTemplateAPIsWhisper,
        templateAPIsTTS,
        setTemplateAPIsTTS,
        templateAPIsImageGen,
        setTemplateAPIsImageGen,
        templateTools,
        setTemplateTools,
        templateMCPServers,
        setTemplateMCPServers,
        defaultRenderMD,
        setDefaultRenderMD,
        callingTools,
        setCallingTools,
        handleNewChatStore,
        handleNewChatStoreWithOldOne,
      }}
    >
      <SidebarProvider defaultOpen={true}>
        <Sidebar>
          <SidebarHeader>
            <Button onClick={handleNewChatStore}>
              <span>
                <Tr>New Chat</Tr>
              </span>
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
                            <span>
                              <ConversationTitle
                                chatStoreIndex={i}
                                selectedChatStoreIndex={selectedChatIndex}
                              />
                            </span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter>
            <div className="flex items-start gap-2">
              <ModeToggle />
              <Search />
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <Tr>Delete Chat</Tr>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete
                    the chat history.
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
          </SidebarFooter>
          <SidebarRail />
        </Sidebar>
        <SidebarInset>
          <AppChatStoreProvider
            selectedChatIndex={selectedChatIndex}
            getChatStoreByIndex={getChatStoreByIndex}
          >
            <ImportDialog
              open={showImportDialog}
              setOpen={setShowImportDialog}
            />
            <Navbar />
            <ChatBOX />
          </AppChatStoreProvider>
        </SidebarInset>
      </SidebarProvider>
    </AppContext.Provider>
  );
}

const AppChatStoreProvider = ({
  children,
  selectedChatIndex,
  getChatStoreByIndex,
}: {
  children: React.ReactNode;
  selectedChatIndex: number;
  getChatStoreByIndex: (index: number) => Promise<ChatStore>;
}) => {
  const ctx = useContext(AppContext);
  const { toast } = useToast();
  const tabId = useRef<string>(Math.random().toString(36).substr(2, 9)).current;

  useEffect(() => {
    const channel = new BroadcastChannel("chat-store-access");

    // 页面激活状态处理
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        channel.postMessage({
          type: "open",
          index: selectedChatIndex,
          tabId,
        });
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // 消息处理逻辑
    const handleMessage = (event: MessageEvent) => {
      // 忽略自身消息和无关索引消息
      if (event.data.tabId === tabId) return;
      if (event.data.index !== selectedChatIndex) return;

      // 根据消息类型处理
      switch (event.data.type) {
        case "open":
          // 收到open消息时发送确认回复并显示警告
          channel.postMessage({
            type: "ack",
            index: selectedChatIndex,
            tabId,
          });
          showConflictWarning();
          break;

        case "ack":
          // 收到确认回复时显示警告
          showConflictWarning();
          break;
      }
    };

    // 立即发送初始查询
    channel.postMessage({
      type: "open",
      index: selectedChatIndex,
      tabId,
    });

    // 绑定事件监听器
    channel.addEventListener("message", handleMessage);

    // 清理函数
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      channel.removeEventListener("message", handleMessage);
      channel.close();
    };
  }, [selectedChatIndex, toast, tabId]);

  // 警告提示统一处理
  const showConflictWarning = () => {
    toast({
      title: "访问冲突警告",
      description: "当前会话已在其他浏览器标签打开, 请注意数据一致性！",
      variant: "destructive",
      duration: 8000,
    });
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
    (await ctx.db).put(STORAGE_NAME, chatStore, selectedChatIndex);

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

  return (
    <AppChatStoreContext.Provider
      value={{
        chatStore,
        setChatStore,
      }}
    >
      {children}
    </AppChatStoreContext.Provider>
  );
};
