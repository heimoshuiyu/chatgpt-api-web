import { IDBPDatabase } from "idb";
import { createRef } from "preact";
import { StateUpdater, useEffect, useState, Dispatch } from "preact/hooks";
import { Tr, langCodeContext, LANG_OPTIONS } from "@/translate";
import {
  STORAGE_NAME_TEMPLATE,
  STORAGE_NAME_TEMPLATE_API,
  STORAGE_NAME_TEMPLATE_API_IMAGE_GEN,
  STORAGE_NAME_TEMPLATE_API_TTS,
  STORAGE_NAME_TEMPLATE_API_WHISPER,
  STORAGE_NAME_TEMPLATE_TOOLS,
} from "@/const";
import { addTotalCost, getTotalCost } from "@/utils/totalCost";
import ChatGPT, {
  calculate_token_length,
  FetchResponse,
  Message as MessageType,
  MessageDetail,
  ToolCall,
  Logprobs,
  StreamingUsage,
} from "@/chatgpt";
import {
  ChatStore,
  ChatStoreMessage,
  TemplateChatStore,
  TemplateAPI,
  TemplateTools,
} from "../types/chatstore";
import Message from "@/message";
import { models } from "@/types/models";
import Settings from "@/components/Settings";
import { AddImage } from "@/addImage";
import { ListAPIs } from "@/listAPIs";
import { ListToolsTempaltes } from "@/listToolsTemplates";
import { autoHeight } from "@/textarea";
import Search from "@/search";
import Templates from "@/components/Templates";
import VersionHint from "@/components/VersionHint";
import StatusBar from "@/components/StatusBar";
import WhisperButton from "@/components/WhisperButton";
import AddToolMsg from "./AddToolMsg";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChatInput } from "@/components/ui/chat/chat-input";
import {
  ChatBubble,
  ChatBubbleAvatar,
  ChatBubbleMessage,
  ChatBubbleAction,
  ChatBubbleActionWrapper,
} from "@/components/ui/chat/chat-bubble";

import { ChatMessageList } from "@/components/ui/chat/chat-message-list";
import {
  AlertTriangleIcon,
  ArrowUpIcon,
  CornerDownLeftIcon,
  CornerLeftUpIcon,
  CornerUpLeftIcon,
  GlobeIcon,
  ImageIcon,
  InfoIcon,
  KeyIcon,
  SearchIcon,
  Settings2,
  Settings2Icon,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";

export default function ChatBOX(props: {
  db: Promise<IDBPDatabase<ChatStore>>;
  chatStore: ChatStore;
  setChatStore: (cs: ChatStore) => void;
  selectedChatIndex: number;
  setSelectedChatIndex: Dispatch<StateUpdater<number>>;
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
  const [showAddToolMsg, setShowAddToolMsg] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  let default_follow = localStorage.getItem("follow");
  if (default_follow === null) {
    default_follow = "true";
  }
  const [follow, _setFollow] = useState(default_follow === "true");

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

  const _completeWithStreamMode = async (response: Response) => {
    let responseTokenCount = 0;
    const allChunkMessage: string[] = [];
    const allChunkTool: ToolCall[] = [];
    setShowGenerating(true);
    const logprobs: Logprobs = {
      content: [],
    };
    let response_model_name: string | null = null;
    let usage: StreamingUsage | null = null;
    for await (const i of client.processStreamResponse(response)) {
      response_model_name = i.model;
      responseTokenCount += 1;
      if (i.usage) {
        usage = i.usage;
      }

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
    if (response_model_name) {
      cost +=
        responseTokenCount *
        (models[response_model_name]?.price?.completion ?? 0);
      let sum = 0;
      for (const msg of chatStore.history
        .filter(({ hide }) => !hide)
        .slice(chatStore.postBeginIndex)) {
        sum += msg.token;
      }
      cost += sum * (models[response_model_name]?.price?.prompt ?? 0);
      if (usage) {
        // use the response usage if exists
        cost = 0;
        cost +=
          (usage.prompt_tokens ?? 0) *
          (models[response_model_name]?.price?.prompt ?? 0);
        cost +=
          (usage.completion_tokens ?? 0) *
          models[response_model_name]?.price?.completion;
        console.log("usage", usage, "cost", cost);
      }
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
      response_model_name,
    };
    if (allChunkTool.length > 0) newMsg.tool_calls = allChunkTool;

    chatStore.history.push(newMsg);
    // manually copy status from client to chatStore
    chatStore.maxTokens = client.max_tokens;
    chatStore.tokenMargin = client.tokens_margin;
    setChatStore({ ...chatStore });
    setGeneratingMessage("");
    setShowGenerating(false);
  };

  const _completeWithFetchMode = async (response: Response) => {
    const data = (await response.json()) as FetchResponse;
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
      response_model_name: data.model,
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
      response_model_name: null,
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
    <>
      <div className="flex flex-col p-2 gap-2 w-full">
        <div className="flex items-center gap-2 justify-between">
          {true && (
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
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowSearch(true)}
          >
            <SearchIcon />
          </Button>
        </div>
        {showSearch && (
          <Search
            setSelectedChatIndex={props.setSelectedChatIndex}
            db={props.db}
            chatStore={chatStore}
            show={showSearch}
            setShow={setShowSearch}
          />
        )}

        {!chatStore.apiKey && (
          <Alert>
            <KeyIcon className="h-4 w-4" />
            <AlertTitle>Heads up!</AlertTitle>
            <AlertDescription>
              {Tr("Please click above to set")} (OpenAI) API KEY
            </AlertDescription>
          </Alert>
        )}
        {!chatStore.apiEndpoint && (
          <Alert>
            <GlobeIcon className="h-4 w-4" />
            <AlertTitle>Heads up!</AlertTitle>
            <AlertDescription>
              {Tr("Please click above to set")} API Endpoint
            </AlertDescription>
          </Alert>
        )}
        <NavigationMenu>
          <NavigationMenuList>
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
          </NavigationMenuList>
        </NavigationMenu>
      </div>
      <div className="grow flex flex-col p-2 w-full">
        <ChatMessageList>
          {chatStore.history.filter((msg) => !msg.example).length == 0 && (
            <div className="bg-base-200 break-all p-3 my-3 text-left">
              <h2>
                <span>{Tr("Saved prompt templates")}</span>
                <Button
                  variant="link"
                  className="mx-2"
                  onClick={() => {
                    chatStore.systemMessageContent = "";
                    chatStore.toolsString = "";
                    chatStore.history = [];
                    setChatStore({ ...chatStore });
                  }}
                >
                  {Tr("Reset Current")}
                </Button>
              </h2>
              <div className="divider"></div>
              <div className="flex flex-wrap">
                <Templates
                  templates={templates}
                  setTemplates={setTemplates}
                  chatStore={chatStore}
                  setChatStore={setChatStore}
                />
              </div>
            </div>
          )}
          {chatStore.history.length === 0 && (
            <Alert variant="default" className="my-3">
              <InfoIcon className="h-4 w-4" />
              <AlertTitle>{Tr("No chat history here")}</AlertTitle>
              <AlertDescription className="flex flex-col gap-1 mt-5">
                <div className="flex items-center gap-2">
                  <Settings2Icon className="h-4 w-4" />
                  <span>
                    {Tr("Model")}: {chatStore.model}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <ArrowUpIcon className="h-4 w-4" />
                  <span>
                    {Tr("Click above to change the settings of this chat")}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <CornerLeftUpIcon className="h-4 w-4" />
                  <span>{Tr("Click the corner to create a new chat")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <AlertTriangleIcon className="h-4 w-4" />
                  <span>
                    {Tr(
                      "All chat history and settings are stored in the local browser"
                    )}
                  </span>
                </div>
              </AlertDescription>
            </Alert>
          )}
          {chatStore.systemMessageContent.trim() && (
            <ChatBubble variant="received">
              <ChatBubbleMessage>
                <div className="flex flex-col gap-1">
                  <div className="text-sm font-bold">System Prompt</div>
                  <div
                    className="cursor-pointer"
                    onClick={() => setShowSettings(true)}
                  >
                    {chatStore.systemMessageContent}
                  </div>
                </div>
              </ChatBubbleMessage>
              <ChatBubbleActionWrapper>
                <ChatBubbleAction
                  className="size-7"
                  icon={<Settings2Icon className="size-4" />}
                  onClick={() => setShowSettings(true)}
                />
              </ChatBubbleActionWrapper>
            </ChatBubble>
          )}
          {chatStore.history.map((_, messageIndex) => (
            <Message
              chatStore={chatStore}
              setChatStore={setChatStore}
              messageIndex={messageIndex}
            />
          ))}
          {showGenerating && (
            <ChatBubble variant="received">
              <ChatBubbleMessage isLoading>
                {generatingMessage}
              </ChatBubbleMessage>
            </ChatBubble>
          )}
          <p className="text-center">
            {chatStore.history.length > 0 && (
              <Button
                variant="secondary"
                size="sm"
                className="m-2"
                disabled={showGenerating}
                onClick={async () => {
                  const messageIndex = chatStore.history.length - 1;
                  if (chatStore.history[messageIndex].role === "assistant") {
                    chatStore.history[messageIndex].hide = true;
                  }

                  setChatStore({ ...chatStore });
                  await complete();
                }}
              >
                {Tr("Re-Generate")}
              </Button>
            )}
            {chatStore.develop_mode && chatStore.history.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                disabled={showGenerating}
                onClick={async () => {
                  await complete();
                }}
              >
                {Tr("Completion")}
              </Button>
            )}
          </p>
          <p className="p-2 my-2 text-center opacity-50 dark:text-white">
            {chatStore.postBeginIndex !== 0 && (
              <Alert variant="default">
                <InfoIcon className="h-4 w-4" />
                <AlertTitle>{Tr("Chat History Notice")}</AlertTitle>
                <AlertDescription>
                  {Tr("Info: chat history is too long, forget messages")}:{" "}
                  {chatStore.postBeginIndex}
                </AlertDescription>
              </Alert>
            )}
          </p>
          <VersionHint chatStore={chatStore} />
          {showRetry && (
            <p className="text-right p-2 my-2 dark:text-white">
              <Button
                variant="destructive"
                onClick={async () => {
                  setShowRetry(false);
                  await complete();
                }}
              >
                {Tr("Retry")}
              </Button>
            </p>
          )}
          <div ref={messagesEndRef}></div>
        </ChatMessageList>
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
          <div className="flex items-center justify-end gap-2 p-2 m-2 rounded bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Follow
            </label>
            <Switch
              checked={follow}
              onCheckedChange={setFollow}
              aria-label="Toggle auto-scroll"
            />
          </div>
        )}

        <div className="sticky top-0 z-10 bg-background">
          <form className="relative rounded-lg border bg-background focus-within:ring-1 focus-within:ring-ring p-1">
            <ChatInput
              value={inputMsg}
              ref={userInputRef}
              placeholder="Type your message here..."
              onChange={(event: any) => {
                setInputMsg(event.target.value);
                autoHeight(event.target);
              }}
              onKeyPress={(event: any) => {
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
              className="min-h-12 resize-none rounded-lg bg-background border-0 p-3 shadow-none focus-visible:ring-0"
            />
            <div className="flex items-center p-3 pt-0">
              <Button
                variant="ghost"
                size="icon"
                type="button"
                onClick={() => setShowAddImage(true)}
                disabled={showGenerating}
              >
                <ImageIcon className="size-4" />
                <span className="sr-only">Add Image</span>
              </Button>

              {chatStore.whisper_api && chatStore.whisper_key && (
                <>
                  <WhisperButton
                    chatStore={chatStore}
                    inputMsg={inputMsg}
                    setInputMsg={setInputMsg}
                  />
                  <span className="sr-only">Use Microphone</span>
                </>
              )}

              <Button
                size="sm"
                className="ml-auto gap-1.5"
                disabled={showGenerating}
                onClick={() => {
                  send(inputMsg, true);
                  userInputRef.current.value = "";
                  autoHeight(userInputRef.current);
                }}
              >
                Send Message
                <CornerDownLeftIcon className="size-3.5" />
              </Button>
            </div>
          </form>

          <AddImage
            chatStore={chatStore}
            setChatStore={setChatStore}
            setShowAddImage={setShowAddImage}
            images={images}
            showAddImage={showAddImage}
            setImages={setImages}
          />
        </div>
      </div>
    </>
  );
}
