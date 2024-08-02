import { Tr, langCodeContext, LANG_OPTIONS } from "./translate";
import structuredClone from "@ungap/structured-clone";
import { createRef } from "preact";
import { StateUpdater, useEffect, useState } from "preact/hooks";
import {
  ChatStore,
  ChatStoreMessage,
  STORAGE_NAME_TEMPLATE,
  STORAGE_NAME_TEMPLATE_API,
  STORAGE_NAME_TEMPLATE_API_IMAGE_GEN,
  STORAGE_NAME_TEMPLATE_API_TTS,
  STORAGE_NAME_TEMPLATE_API_WHISPER,
  STORAGE_NAME_TEMPLATE_TOOLS,
  TemplateAPI,
  TemplateTools,
  addTotalCost,
  getTotalCost,
} from "./app";
import ChatGPT, {
  calculate_token_length,
  ChunkMessage,
  FetchResponse,
  Message as MessageType,
  MessageDetail,
  ToolCall,
  Logprobs,
} from "./chatgpt";
import Message from "./message";
import models from "./models";
import Settings from "./settings";
import getDefaultParams from "./getDefaultParam";
import { AddImage } from "./addImage";
import { ListAPIs } from "./listAPIs";
import { ListToolsTempaltes } from "./listToolsTemplates";
import { autoHeight } from "./textarea";
import Search from "./search";
import { IDBPDatabase } from "idb";
import {
  MagnifyingGlassIcon,
  CubeIcon,
  BanknotesIcon,
  DocumentTextIcon,
  ChatBubbleLeftEllipsisIcon,
  ScissorsIcon,
  SwatchIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";

export interface TemplateChatStore extends ChatStore {
  name: string;
}

export default function ChatBOX(props: {
  db: Promise<IDBPDatabase<ChatStore>>;
  chatStore: ChatStore;
  setChatStore: (cs: ChatStore) => void;
  selectedChatIndex: number;
  setSelectedChatIndex: StateUpdater<number>;
}) {
  const { chatStore, setChatStore } = props;
  // prevent error
  if (chatStore === undefined) return <div></div>;
  const [inputMsg, setInputMsg] = useState("");
  const [images, setImages] = useState<MessageDetail[]>([]);
  const [showAddImage, setShowAddImage] = useState(false);
  const [showGenerating, setShowGenerating] = useState(false);
  const [generatingMessage, setGeneratingMessage] = useState("");
  const [showRetry, setShowRetry] = useState(false);
  const [isRecording, setIsRecording] = useState("Mic");
  const [showAddToolMsg, setShowAddToolMsg] = useState(false);
  const [newToolCallID, setNewToolCallID] = useState("");
  const [newToolContent, setNewToolContent] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  let default_follow = localStorage.getItem("follow");
  if (default_follow === null) {
    default_follow = "true";
  }
  const [follow, _setFollow] = useState(default_follow === "true");
  const mediaRef = createRef();

  const setFollow = (follow: boolean) => {
    console.log("set follow", follow);
    localStorage.setItem("follow", follow.toString());
    _setFollow(follow);
  };

  const messagesEndRef = createRef();
  useEffect(() => {
    if (follow) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [showRetry, showGenerating, generatingMessage]);

  const client = new ChatGPT(chatStore.apiKey);

  const update_total_tokens = () => {
    // manually estimate token
    client.total_tokens = calculate_token_length(
      chatStore.systemMessageContent
    );
    for (const msg of chatStore.history
      .filter(({ hide }) => !hide)
      .slice(chatStore.postBeginIndex)) {
      client.total_tokens += msg.token;
    }
    chatStore.totalTokens = client.total_tokens;
  };

  const _completeWithStreamMode = async (response: Response) => {
    let responseTokenCount = 0;
    const allChunkMessage: string[] = [];
    const allChunkTool: ToolCall[] = [];
    setShowGenerating(true);
    const logprobs: Logprobs = {
      content: [],
    };
    for await (const i of client.processStreamResponse(response)) {
      chatStore.responseModelName = i.model;
      responseTokenCount += 1;

      const c = i.choices[0];

      // skip if choice is empty (e.g. azure)
      if (!c) continue;

      const logprob = c?.logprobs?.content[0]?.logprob;
      if (logprob !== undefined) {
        logprobs.content.push({
          token: c?.delta?.content ?? "",
          logprob,
        });
        console.log(c?.delta?.content, logprob);
      }

      allChunkMessage.push(c?.delta?.content ?? "");
      const tool_calls = c?.delta?.tool_calls;
      if (tool_calls) {
        for (const tool_call of tool_calls) {
          // init
          if (tool_call.id) {
            allChunkTool.push({
              id: tool_call.id,
              type: tool_call.type,
              index: tool_call.index,
              function: {
                name: tool_call.function.name,
                arguments: "",
              },
            });
            continue;
          }

          // update tool call arguments
          const tool = allChunkTool.find(
            (tool) => tool.index === tool_call.index
          );

          if (!tool) {
            console.log("tool (by index) not found", tool_call.index);
            continue;
          }

          tool.function.arguments += tool_call.function.arguments;
        }
      }
      setGeneratingMessage(
        allChunkMessage.join("") +
          allChunkTool.map((tool) => {
            return `Tool Call ID: ${tool.id}\nType: ${tool.type}\nFunction: ${tool.function.name}\nArguments: ${tool.function.arguments}`;
          })
      );
    }
    setShowGenerating(false);
    const content = allChunkMessage.join("");

    // estimate cost
    let cost = 0;
    if (chatStore.responseModelName) {
      cost +=
        responseTokenCount *
        (models[chatStore.responseModelName]?.price?.completion ?? 0);
      let sum = 0;
      for (const msg of chatStore.history
        .filter(({ hide }) => !hide)
        .slice(chatStore.postBeginIndex)) {
        sum += msg.token;
      }
      cost += sum * (models[chatStore.responseModelName]?.price?.prompt ?? 0);
    }

    console.log("cost", cost);
    chatStore.cost += cost;
    addTotalCost(cost);

    console.log("save logprobs", logprobs);
    const newMsg: ChatStoreMessage = {
      role: "assistant",
      content,
      hide: false,
      token: responseTokenCount,
      example: false,
      audio: null,
      logprobs,
    };
    if (allChunkTool.length > 0) newMsg.tool_calls = allChunkTool;

    chatStore.history.push(newMsg);
    // manually copy status from client to chatStore
    chatStore.maxTokens = client.max_tokens;
    chatStore.tokenMargin = client.tokens_margin;
    update_total_tokens();
    setChatStore({ ...chatStore });
    setGeneratingMessage("");
    setShowGenerating(false);
  };

  const _completeWithFetchMode = async (response: Response) => {
    const data = (await response.json()) as FetchResponse;
    chatStore.responseModelName = data.model ?? "";
    if (data.model) {
      let cost = 0;
      cost +=
        (data.usage.prompt_tokens ?? 0) *
        (models[data.model]?.price?.prompt ?? 0);
      cost +=
        (data.usage.completion_tokens ?? 0) *
        (models[data.model]?.price?.completion ?? 0);
      chatStore.cost += cost;
      addTotalCost(cost);
    }
    const msg = client.processFetchResponse(data);

    // estimate user's input message token
    let aboveToken = 0;
    for (const msg of chatStore.history
      .filter(({ hide }) => !hide)
      .slice(chatStore.postBeginIndex, -1)) {
      aboveToken += msg.token;
    }
    if (data.usage.prompt_tokens) {
      const userMessageToken = data.usage.prompt_tokens - aboveToken;
      console.log("set user message token");
      if (chatStore.history.filter((msg) => !msg.hide).length > 0) {
        chatStore.history.filter((msg) => !msg.hide).slice(-1)[0].token =
          userMessageToken;
      }
    }

    chatStore.history.push({
      role: "assistant",
      content: msg.content,
      tool_calls: msg.tool_calls,
      hide: false,
      token:
        data.usage.completion_tokens ?? calculate_token_length(msg.content),
      example: false,
      audio: null,
      logprobs: data.choices[0]?.logprobs,
    });
    setShowGenerating(false);
  };

  // wrap the actuall complete api
  const complete = async () => {
    // manually copy status from chatStore to client
    client.apiEndpoint = chatStore.apiEndpoint;
    client.sysMessageContent = chatStore.systemMessageContent;
    client.toolsString = chatStore.toolsString;
    client.tokens_margin = chatStore.tokenMargin;
    client.temperature = chatStore.temperature;
    client.enable_temperature = chatStore.temperature_enabled;
    client.top_p = chatStore.top_p;
    client.enable_top_p = chatStore.top_p_enabled;
    client.frequency_penalty = chatStore.frequency_penalty;
    client.presence_penalty = chatStore.presence_penalty;
    client.json_mode = chatStore.json_mode;
    client.messages = chatStore.history
      // only copy non hidden message
      .filter(({ hide }) => !hide)
      .slice(chatStore.postBeginIndex)
      // only copy content and role attribute to client for posting
      .map(({ content, role, example, tool_call_id, tool_calls }) => {
        const ret: MessageType = {
          content,
          role,
          tool_calls,
        };

        if (example) {
          ret.name =
            ret.role === "assistant" ? "example_assistant" : "example_user";
          ret.role = "system";
        }

        if (tool_call_id) ret.tool_call_id = tool_call_id;

        return ret;
      });
    client.model = chatStore.model;
    client.max_tokens = chatStore.maxTokens;
    client.max_gen_tokens = chatStore.maxGenTokens;
    client.enable_max_gen_tokens = chatStore.maxGenTokens_enabled;

    try {
      setShowGenerating(true);
      const response = await client._fetch(
        chatStore.streamMode,
        chatStore.logprobs
      );
      const contentType = response.headers.get("content-type");
      if (contentType?.startsWith("text/event-stream")) {
        await _completeWithStreamMode(response);
      } else if (contentType?.startsWith("application/json")) {
        await _completeWithFetchMode(response);
      } else {
        throw `unknown response content type ${contentType}`;
      }
      // manually copy status from client to chatStore
      chatStore.maxTokens = client.max_tokens;
      chatStore.tokenMargin = client.tokens_margin;
      chatStore.totalTokens = client.total_tokens;

      console.log("postBeginIndex", chatStore.postBeginIndex);
      setShowRetry(false);
      setChatStore({ ...chatStore });
    } catch (error) {
      setShowRetry(true);
      alert(error);
    } finally {
      setShowGenerating(false);
      props.setSelectedChatIndex(props.selectedChatIndex);
    }
  };

  // when user click the "send" button or ctrl+Enter in the textarea
  const send = async (msg = "", call_complete = true) => {
    const inputMsg = msg.trim();
    if (!inputMsg && images.length === 0) {
      console.log("empty message");
      return;
    }
    if (call_complete) chatStore.responseModelName = "";

    let content: string | MessageDetail[] = inputMsg;
    if (images.length > 0) {
      content = images;
    }
    if (images.length > 0 && inputMsg.trim()) {
      content = [{ type: "text", text: inputMsg }, ...images];
    }
    chatStore.history.push({
      role: "user",
      content,
      hide: false,
      token: calculate_token_length(inputMsg.trim()),
      example: false,
      audio: null,
      logprobs: null,
    });

    // manually calculate token length
    chatStore.totalTokens +=
      calculate_token_length(inputMsg.trim()) + calculate_token_length(images);
    client.total_tokens = chatStore.totalTokens;

    setChatStore({ ...chatStore });
    setInputMsg("");
    setImages([]);
    if (call_complete) {
      await complete();
    }
  };

  const [showSettings, setShowSettings] = useState(false);

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
  const [toolsTemplates, _setToolsTemplates] = useState(
    JSON.parse(
      localStorage.getItem(STORAGE_NAME_TEMPLATE_TOOLS) || "[]"
    ) as TemplateTools[]
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
    _setToolsTemplates(templateTools);
  };
  const userInputRef = createRef();

  return (
    <div className="grow flex flex-col p-2 w-full">
      {showSettings && (
        <Settings
          chatStore={chatStore}
          setChatStore={setChatStore}
          setShow={setShowSettings}
          selectedChatStoreIndex={props.selectedChatIndex}
          templates={templates}
          setTemplates={setTemplates}
          templateAPIs={templateAPIs}
          setTemplateAPIs={setTemplateAPIs}
          templateAPIsWhisper={templateAPIsWhisper}
          setTemplateAPIsWhisper={setTemplateAPIsWhisper}
          templateAPIsTTS={templateAPIsTTS}
          setTemplateAPIsTTS={setTemplateAPIsTTS}
          templateAPIsImageGen={templateAPIsImageGen}
          setTemplateAPIsImageGen={setTemplateAPIsImageGen}
          templateTools={toolsTemplates}
          setTemplateTools={setTemplateTools}
        />
      )}
      {showSearch && (
        <Search
          setSelectedChatIndex={props.setSelectedChatIndex}
          db={props.db}
          chatStore={chatStore}
          setShow={setShowSearch}
        />
      )}

      <div class="navbar bg-base-100 p-0">
        <div class="navbar-start">
          <div class="dropdown lg:hidden">
            <div tabindex={0} role="button" class="btn btn-ghost btn-circle">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 6h16M4 12h16M4 18h7"
                />
              </svg>
            </div>
            <ul
              tabindex={0}
              class="menu menu-sm dropdown-content bg-base-100 rounded-box z-[1] mt-3 w-52 p-2 shadow"
            >
              <li>
                <p>
                  <ChatBubbleLeftEllipsisIcon className="h-4 w-4" />
                  Tokens: {chatStore.totalTokens}/{chatStore.maxTokens}
                </p>
              </li>
              <li>
                <p>
                  <ScissorsIcon className="h-4 w-4" />
                  Cut:
                  {chatStore.postBeginIndex}/
                  {chatStore.history.filter(({ hide }) => !hide).length}
                </p>
              </li>
              <li>
                <p>
                  <BanknotesIcon className="h-4 w-4" />
                  Cost: ${chatStore.cost.toFixed(4)}
                </p>
              </li>
            </ul>
          </div>
        </div>
        <div
          class="navbar-center cursor-pointer py-1"
          onClick={() => {
            setShowSettings(true);
          }}
        >
          {/* the long staus bar */}
          <div class="stats shadow hidden lg:inline-grid">
            <div class="stat">
              <div class="stat-figure text-secondary">
                <CubeIcon className="h-10 w-10" />
              </div>
              <div class="stat-title">Model</div>
              <div class="stat-value text-base">{chatStore.model}</div>
              <div class="stat-desc">
                {models[chatStore.model]?.price?.prompt * 1000 * 1000} $/M
                tokens
              </div>
            </div>
            <div class="stat">
              <div class="stat-figure text-secondary">
                <SwatchIcon className="h-10 w-10" />
              </div>
              <div class="stat-title">Mode</div>
              <div class="stat-value text-base">
                {chatStore.streamMode ? Tr("STREAM") : Tr("FETCH")}
              </div>
              <div class="stat-desc">STREAM/FETCH</div>
            </div>

            <div class="stat">
              <div class="stat-figure text-secondary">
                <ChatBubbleLeftEllipsisIcon className="h-10 w-10" />
              </div>
              <div class="stat-title">Tokens</div>
              <div class="stat-value text-base">{chatStore.totalTokens}</div>
              <div class="stat-desc">Max: {chatStore.maxTokens}</div>
            </div>

            <div class="stat">
              <div class="stat-figure text-secondary">
                <ScissorsIcon className="h-10 w-10" />
              </div>
              <div class="stat-title">Cut</div>
              <div class="stat-value text-base">{chatStore.postBeginIndex}</div>
              <div class="stat-desc">
                Max: {chatStore.history.filter(({ hide }) => !hide).length}
              </div>
            </div>

            <div class="stat">
              <div class="stat-figure text-secondary">
                <BanknotesIcon className="h-10 w-10" />
              </div>
              <div class="stat-title">Cost</div>
              <div class="stat-value text-base">
                ${chatStore.cost.toFixed(4)}
              </div>
              <div class="stat-desc">
                Accumulated: ${getTotalCost().toFixed(2)}
              </div>
            </div>
          </div>

          {/* the short status bar */}
          <div class="indicator lg:hidden">
            {chatStore.totalTokens !== 0 && (
              <span class="indicator-item badge badge-primary">
                Tokens: {chatStore.totalTokens}
              </span>
            )}
            <a class="btn btn-ghost text-base sm:text-xl p-0">
              <SparklesIcon className="h-4 w-4 hidden sm:block" />
              {chatStore.model}
            </a>
          </div>
        </div>
        <div class="navbar-end">
          <button
            class="btn btn-ghost btn-circle"
            onClick={(event) => {
              // stop propagation to parent
              event.stopPropagation();

              setShowSearch(true);
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </button>
          <button
            class="btn btn-ghost btn-circle hidden sm:block"
            onClick={() => setShowSettings(true)}
          >
            <div class="indicator">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="1.5"
                stroke="currentColor"
                class="h-6 w-6"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z"
                />
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                />
              </svg>

              <span class="badge badge-xs badge-primary indicator-item"></span>
            </div>
          </button>
        </div>
      </div>
      {/* <div
        className="relative cursor-pointer rounded p-2"
        onClick={() => setShowSettings(true)}
      >
        <button
          className="absolute right-1 rounded p-1 m-1"
          onClick={(event) => {
            // stop propagation to parent
            event.stopPropagation();

            setShowSearch(true);
          }}
        >
          <MagnifyingGlassIcon class="w-5 h-5" />
        </button>
        <div class="hidden lg:inline-grid"></div>
        <div class="lg:hidden">
          <div>
            <button className="underline">
              {chatStore.systemMessageContent.length > 16
                ? chatStore.systemMessageContent.slice(0, 16) + ".."
                : chatStore.systemMessageContent}
            </button>{" "}
            <button className="underline">
              {chatStore.streamMode ? Tr("STREAM") : Tr("FETCH")}
            </button>{" "}
            {chatStore.toolsString.trim() && (
              <button className="underline">TOOL</button>
            )}
          </div>
          <div className="text-xs">
            <span class="underline">{chatStore.model}</span>{" "}
            <span>
              Tokens:{" "}
              <span class="underline">
                {chatStore.totalTokens}/{chatStore.maxTokens}
              </span>
            </span>{" "}
            <span>
              {Tr("Cut")}:{" "}
              <span class="underline">
                {chatStore.postBeginIndex}/
                {chatStore.history.filter(({ hide }) => !hide).length}
              </span>{" "}
            </span>{" "}
            <span>
              {Tr("Cost")}:{" "}
              <span className="underline">${chatStore.cost.toFixed(4)}</span>
            </span>
          </div>
        </div>
      </div> */}
      <div className="grow overflow-scroll">
        {!chatStore.apiKey && (
          <p className="bg-base-200 p-6 rounded my-3 text-left">
            {Tr("Please click above to set")} (OpenAI) API KEY
          </p>
        )}
        {!chatStore.apiEndpoint && (
          <p className="bg-base-200 p-6 rounded my-3 text-left">
            {Tr("Please click above to set")} API Endpoint
          </p>
        )}
        {templateAPIs.length > 0 && (
          <ListAPIs
            label="API"
            tmps={templateAPIs}
            setTmps={setTemplateAPIs}
            chatStore={chatStore}
            setChatStore={setChatStore}
            apiField="apiEndpoint"
            keyField="apiKey"
          />
        )}

        {templateAPIsWhisper.length > 0 && (
          <ListAPIs
            label="Whisper API"
            tmps={templateAPIsWhisper}
            setTmps={setTemplateAPIsWhisper}
            chatStore={chatStore}
            setChatStore={setChatStore}
            apiField="whisper_api"
            keyField="whisper_key"
          />
        )}

        {templateAPIsTTS.length > 0 && (
          <ListAPIs
            label="TTS API"
            tmps={templateAPIsTTS}
            setTmps={setTemplateAPIsTTS}
            chatStore={chatStore}
            setChatStore={setChatStore}
            apiField="tts_api"
            keyField="tts_key"
          />
        )}

        {templateAPIsImageGen.length > 0 && (
          <ListAPIs
            label="Image Gen API"
            tmps={templateAPIsImageGen}
            setTmps={setTemplateAPIsImageGen}
            chatStore={chatStore}
            setChatStore={setChatStore}
            apiField="image_gen_api"
            keyField="image_gen_key"
          />
        )}

        {toolsTemplates.length > 0 && (
          <ListToolsTempaltes
            templateTools={toolsTemplates}
            setTemplateTools={setTemplateTools}
            chatStore={chatStore}
            setChatStore={setChatStore}
          />
        )}

        {chatStore.history.filter((msg) => !msg.example).length == 0 && (
          <div className="bg-base-200 break-all p-3 my-3 text-left">
            <h2>
              <span>{Tr("Saved prompt templates")}</span>
              <button
                className="mx-2 underline cursor-pointer"
                onClick={() => {
                  chatStore.systemMessageContent = "";
                  chatStore.toolsString = "";
                  chatStore.history = [];
                  setChatStore({ ...chatStore });
                }}
              >
                {Tr("Reset Current")}
              </button>
            </h2>
            <div class="divider"></div>
            <div className="flex flex-wrap">
              {templates.map((t, index) => (
                <div
                  className="cursor-pointer rounded bg-green-400 w-fit p-2 m-1 flex flex-col"
                  onClick={() => {
                    const newChatStore: ChatStore = structuredClone(t);
                    // @ts-ignore
                    delete newChatStore.name;
                    if (!newChatStore.apiEndpoint) {
                      newChatStore.apiEndpoint = getDefaultParams(
                        "api",
                        chatStore.apiEndpoint
                      );
                    }
                    if (!newChatStore.apiKey) {
                      newChatStore.apiKey = getDefaultParams(
                        "key",
                        chatStore.apiKey
                      );
                    }
                    if (!newChatStore.whisper_api) {
                      newChatStore.whisper_api = getDefaultParams(
                        "whisper-api",
                        chatStore.whisper_api
                      );
                    }
                    if (!newChatStore.whisper_key) {
                      newChatStore.whisper_key = getDefaultParams(
                        "whisper-key",
                        chatStore.whisper_key
                      );
                    }
                    if (!newChatStore.tts_api) {
                      newChatStore.tts_api = getDefaultParams(
                        "tts-api",
                        chatStore.tts_api
                      );
                    }
                    if (!newChatStore.tts_key) {
                      newChatStore.tts_key = getDefaultParams(
                        "tts-key",
                        chatStore.tts_key
                      );
                    }
                    if (!newChatStore.image_gen_api) {
                      newChatStore.image_gen_api = getDefaultParams(
                        "image-gen-api",
                        chatStore.image_gen_api
                      );
                    }
                    if (!newChatStore.image_gen_key) {
                      newChatStore.image_gen_key = getDefaultParams(
                        "image-gen-key",
                        chatStore.image_gen_key
                      );
                    }
                    newChatStore.cost = 0;

                    // manage undefined value because of version update
                    newChatStore.toolsString = newChatStore.toolsString || "";

                    setChatStore({ ...newChatStore });
                  }}
                >
                  <span className="w-full text-center">{t.name}</span>
                  <hr className="mt-2" />
                  <span className="flex justify-between">
                    <button
                      onClick={(event) => {
                        // prevent triggert other event
                        event.stopPropagation();

                        const name = prompt("Give template a name");
                        if (!name) {
                          return;
                        }
                        t.name = name;
                        setTemplates(structuredClone(templates));
                      }}
                    >
                      🖋
                    </button>
                    <button
                      onClick={(event) => {
                        // prevent triggert other event
                        event.stopPropagation();

                        if (!confirm("Are you sure to delete this template?")) {
                          return;
                        }
                        templates.splice(index, 1);
                        setTemplates(structuredClone(templates));
                      }}
                    >
                      ❌
                    </button>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        {chatStore.history.length === 0 && (
          <p className="break-all opacity-60 p-6 rounded bg-white my-3 text-left dark:text-black">
            {Tr("No chat history here")}
            <br />⚙{Tr("Model")}: {chatStore.model}
            <br />⬆{Tr("Click above to change the settings of this chat")}
            <br />↖{Tr("Click the conor to create a new chat")}
            <br />⚠
            {Tr(
              "All chat history and settings are stored in the local browser"
            )}
            <br />
          </p>
        )}
        {chatStore.systemMessageContent.trim() && (
          <div class="chat chat-start">
            <div class="chat-header">Prompt</div>
            <div
              class="chat-bubble chat-bubble-accent cursor-pointer message-content"
              onClick={() => setShowSettings(true)}
            >
              {chatStore.systemMessageContent}
            </div>
          </div>
        )}

        {chatStore.history.map((_, messageIndex) => (
          <Message
            chatStore={chatStore}
            setChatStore={setChatStore}
            messageIndex={messageIndex}
            update_total_tokens={update_total_tokens}
          />
        ))}
        {showGenerating && (
          <p className="p-2 my-2 animate-pulse message-content">
            {generatingMessage || Tr("Generating...")}
            ...
          </p>
        )}
        <p className="text-center">
          {chatStore.history.length > 0 && (
            <button
              className="btn btn-sm btn-warning disabled:line-through disabled:btn-neutral disabled:text-white m-2 p-2"
              disabled={showGenerating}
              onClick={async () => {
                const messageIndex = chatStore.history.length - 1;
                if (chatStore.history[messageIndex].role === "assistant") {
                  chatStore.history[messageIndex].hide = true;
                }

                //chatStore.totalTokens =
                update_total_tokens();
                setChatStore({ ...chatStore });

                await complete();
              }}
            >
              {Tr("Re-Generate")}
            </button>
          )}
          {chatStore.develop_mode && chatStore.history.length > 0 && (
            <button
              className="btn btn-outline btn-sm btn-warning disabled:line-through disabled:bg-neural"
              disabled={showGenerating}
              onClick={async () => {
                await complete();
              }}
            >
              {Tr("Completion")}
            </button>
          )}
        </p>
        <p className="p-2 my-2 text-center opacity-50 dark:text-white">
          {chatStore.responseModelName && (
            <>
              {Tr("Generated by")} {chatStore.responseModelName}
            </>
          )}
          {chatStore.postBeginIndex !== 0 && (
            <>
              <br />
              {Tr("Info: chat history is too long, forget messages")}:{" "}
              {chatStore.postBeginIndex}
            </>
          )}
        </p>
        {chatStore.chatgpt_api_web_version < "v1.3.0" && (
          <p className="p-2 my-2 text-center dark:text-white">
            <br />
            {Tr("Warning: current chatStore version")}:{" "}
            {chatStore.chatgpt_api_web_version} {"< v1.3.0"}
            <br />
            v1.3.0
            引入与旧版不兼容的消息裁切算法。继续使用旧版可能会导致消息裁切过多或过少（表现为失去上下文或输出不完整）。
            <br />
            请在左上角创建新会话：）
          </p>
        )}
        {chatStore.chatgpt_api_web_version < "v1.4.0" && (
          <p className="p-2 my-2 text-center dark:text-white">
            <br />
            {Tr("Warning: current chatStore version")}:{" "}
            {chatStore.chatgpt_api_web_version} {"< v1.4.0"}
            <br />
            v1.4.0 增加了更多参数，继续使用旧版可能因参数确实导致未定义的行为
            <br />
            请在左上角创建新会话：）
          </p>
        )}
        {chatStore.chatgpt_api_web_version < "v1.6.0" && (
          <p className="p-2 my-2 text-center dark:text-white">
            <br />
            提示：当前会话版本 {chatStore.chatgpt_api_web_version}
            {Tr("Warning: current chatStore version")}:{" "}
            {chatStore.chatgpt_api_web_version} {"< v1.6.0"}
            。
            <br />
            v1.6.0 开始保存会话模板时会将 apiKey 和 apiEndpoint
            设置为空，继续使用旧版可能在保存读取模板时出现问题
            <br />
            请在左上角创建新会话：）
          </p>
        )}
        {showRetry && (
          <p className="text-right p-2 my-2 dark:text-white">
            <button
              className="p-1 rounded bg-rose-500"
              onClick={async () => {
                setShowRetry(false);
                await complete();
              }}
            >
              {Tr("Retry")}
            </button>
          </p>
        )}
        <div ref={messagesEndRef}></div>
      </div>
      {images.length > 0 && (
        <div className="flex flex-wrap">
          {images.map((image, index) => (
            <div className="flex flex-col">
              {image.type === "image_url" && (
                <img
                  className="rounded m-1 p-1 border-2 border-gray-400 max-h-32 max-w-xs"
                  src={image.image_url?.url}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {generatingMessage && (
        <span
          class="p-2 m-2 rounded bg-white dark:text-black dark:bg-white dark:bg-opacity-50"
          style={{ textAlign: "right" }}
          onClick={() => {
            setFollow(!follow);
          }}
        >
          <label>Follow</label>
          <input type="checkbox" checked={follow} />
        </span>
      )}

      <div className="flex justify-between my-1">
        <button
          className="btn btn-primary disabled:line-through disabled:text-white disabled:bg-neutral m-1 p-1"
          disabled={showGenerating || !chatStore.apiKey}
          onClick={() => {
            setShowAddImage(!showAddImage);
          }}
        >
          Image
        </button>
        {showAddImage && (
          <AddImage
            chatStore={chatStore}
            setChatStore={setChatStore}
            setShowAddImage={setShowAddImage}
            images={images}
            setImages={setImages}
          />
        )}
        <textarea
          autofocus
          value={inputMsg}
          ref={userInputRef}
          onChange={(event: any) => {
            setInputMsg(event.target.value);
            autoHeight(event.target);
          }}
          onKeyPress={(event: any) => {
            console.log(event);
            if (event.ctrlKey && event.code === "Enter") {
              send(event.target.value, true);
              setInputMsg("");
              event.target.value = "";
              autoHeight(event.target);
              return;
            }
            autoHeight(event.target);
            setInputMsg(event.target.value);
          }}
          className="textarea textarea-bordered textarea-sm grow w-0"
          style={{
            lineHeight: "1.39",
          }}
          placeholder="Type here..."
        ></textarea>
        <button
          className="btn btn-primary disabled:btn-neutral disabled:line-through m-1 p-1"
          disabled={showGenerating}
          onClick={() => {
            send(inputMsg, true);
            userInputRef.current.value = "";
            autoHeight(userInputRef.current);
          }}
        >
          {Tr("Send")}
        </button>
        {chatStore.whisper_api &&
          chatStore.whisper_key &&
          (chatStore.whisper_key || chatStore.apiKey) && (
            <button
              className={`btn disabled:line-through disabled:btn-neutral disabled:text-white m-1 p-1 ${
                isRecording === "Recording" ? "btn-error" : "btn-success"
              } ${isRecording !== "Mic" ? "animate-pulse" : ""}`}
              disabled={isRecording === "Transcribing"}
              ref={mediaRef}
              onClick={async () => {
                if (isRecording === "Recording") {
                  // @ts-ignore
                  window.mediaRecorder.stop();
                  setIsRecording("Transcribing");
                  return;
                }

                // build prompt
                const prompt = [chatStore.systemMessageContent]
                  .concat(
                    chatStore.history
                      .filter(({ hide }) => !hide)
                      .slice(chatStore.postBeginIndex)
                      .map(({ content }) => {
                        if (typeof content === "string") {
                          return content;
                        } else {
                          return content.map((c) => c?.text).join(" ");
                        }
                      })
                  )
                  .concat([inputMsg])
                  .join(" ");
                console.log({ prompt });

                setIsRecording("Recording");
                console.log("start recording");

                try {
                  const mediaRecorder = new MediaRecorder(
                    await navigator.mediaDevices.getUserMedia({
                      audio: true,
                    }),
                    { audioBitsPerSecond: 64 * 1000 }
                  );

                  // mount mediaRecorder to ref
                  // @ts-ignore
                  window.mediaRecorder = mediaRecorder;

                  mediaRecorder.start();
                  const audioChunks: Blob[] = [];
                  mediaRecorder.addEventListener("dataavailable", (event) => {
                    audioChunks.push(event.data);
                  });
                  mediaRecorder.addEventListener("stop", async () => {
                    // Stop the MediaRecorder
                    mediaRecorder.stop();
                    // Stop the media stream
                    mediaRecorder.stream.getTracks()[0].stop();

                    setIsRecording("Transcribing");
                    const audioBlob = new Blob(audioChunks);
                    const audioUrl = URL.createObjectURL(audioBlob);
                    console.log({ audioUrl });
                    const audio = new Audio(audioUrl);
                    // audio.play();
                    const reader = new FileReader();
                    reader.readAsDataURL(audioBlob);

                    // file-like object with mimetype
                    const blob = new Blob([audioBlob], {
                      type: "application/octet-stream",
                    });

                    reader.onloadend = async () => {
                      try {
                        const base64data = reader.result;

                        // post to openai whisper api
                        const formData = new FormData();
                        // append file
                        formData.append("file", blob, "audio.ogg");
                        formData.append("model", "whisper-1");
                        formData.append("response_format", "text");
                        formData.append("prompt", prompt);

                        const response = await fetch(chatStore.whisper_api, {
                          method: "POST",
                          headers: {
                            Authorization: `Bearer ${
                              chatStore.whisper_key || chatStore.apiKey
                            }`,
                          },
                          body: formData,
                        });

                        const text = await response.text();

                        setInputMsg(inputMsg ? inputMsg + " " + text : text);
                      } catch (error) {
                        alert(error);
                        console.log(error);
                      } finally {
                        setIsRecording("Mic");
                      }
                    };
                  });
                } catch (error) {
                  alert(error);
                  console.log(error);
                  setIsRecording("Mic");
                }
              }}
            >
              {isRecording}
            </button>
          )}
        {chatStore.develop_mode && (
          <button
            className="btn disabled:line-through disabled:btn-neutral disabled:text-white m-1 p-1"
            disabled={showGenerating || !chatStore.apiKey}
            onClick={() => {
              chatStore.history.push({
                role: "assistant",
                content: inputMsg,
                token:
                  calculate_token_length(inputMsg) +
                  calculate_token_length(images),
                hide: false,
                example: false,
                audio: null,
                logprobs: null,
              });
              update_total_tokens();
              setInputMsg("");
              setChatStore({ ...chatStore });
            }}
          >
            {Tr("AI")}
          </button>
        )}
        {chatStore.develop_mode && (
          <button
            className="btn disabled:line-through disabled:btn-neutral disabled:text-white m-1 p-1"
            disabled={showGenerating || !chatStore.apiKey}
            onClick={() => {
              send(inputMsg, false);
            }}
          >
            {Tr("User")}
          </button>
        )}
        {chatStore.develop_mode && (
          <button
            className="btn disabled:line-through disabled:btn-neutral disabled:text-white m-1 p-1"
            disabled={showGenerating || !chatStore.apiKey}
            onClick={() => {
              setShowAddToolMsg(true);
            }}
          >
            {Tr("Tool")}
          </button>
        )}
        {showAddToolMsg && (
          <div
            className="absolute z-10 bg-black bg-opacity-50 w-full h-full flex justify-center items-center left-0 top-0 overflow-scroll"
            onClick={() => {
              setShowAddToolMsg(false);
            }}
          >
            <div
              className="bg-white rounded p-2 z-20 flex flex-col"
              onClick={(event) => {
                event.stopPropagation();
              }}
            >
              <h2>Add Tool Message</h2>
              <hr className="my-2" />
              <span>
                <label>tool_call_id</label>
                <input
                  className="rounded m-1 p-1 border-2 border-gray-400"
                  type="text"
                  value={newToolCallID}
                  onChange={(event: any) =>
                    setNewToolCallID(event.target.value)
                  }
                />
              </span>
              <span>
                <label>Content</label>
                <textarea
                  className="rounded m-1 p-1 border-2 border-gray-400"
                  rows={5}
                  value={newToolContent}
                  onChange={(event: any) =>
                    setNewToolContent(event.target.value)
                  }
                ></textarea>
              </span>
              <span className={`flex justify-between p-2`}>
                <button
                  className="btn btn-info m-1 p-1"
                  onClick={() => setShowAddToolMsg(false)}
                >
                  {Tr("Cancle")}
                </button>
                <button
                  className="rounded m-1 p-1 border-2 bg-cyan-400 hover:bg-cyan-600"
                  onClick={() => {
                    if (!newToolCallID.trim()) {
                      alert("tool_call_id is empty");
                      return;
                    }
                    if (!newToolContent.trim()) {
                      alert("content is empty");
                      return;
                    }
                    chatStore.history.push({
                      role: "tool",
                      tool_call_id: newToolCallID.trim(),
                      content: newToolContent.trim(),
                      token: calculate_token_length(newToolContent),
                      hide: false,
                      example: false,
                      audio: null,
                      logprobs: null,
                    });
                    update_total_tokens();
                    setChatStore({ ...chatStore });
                    setNewToolCallID("");
                    setNewToolContent("");
                    setShowAddToolMsg(false);
                  }}
                >
                  {Tr("Add")}
                </button>
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
