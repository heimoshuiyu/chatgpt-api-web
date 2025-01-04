import { useContext, useRef } from "react";
import { useEffect, useState } from "react";
import { Tr } from "@/translate";
import { addTotalCost } from "@/utils/totalCost";
import ChatGPT, {
  calculate_token_length,
  FetchResponse,
  Message as MessageType,
  MessageDetail,
  ToolCall,
  Logprobs,
  Usage,
} from "@/chatgpt";
import { ChatStoreMessage } from "../types/chatstore";
import Message from "@/components/MessageBubble";
import { models } from "@/types/models";
import { AddImage } from "@/addImage";
import { ListAPIs } from "@/listAPIs";
import { ListToolsTemplates } from "@/listToolsTemplates";
import { autoHeight } from "@/utils/textAreaHelp";
import VersionHint from "@/components/VersionHint";
import WhisperButton from "@/components/WhisperButton";
import { Button } from "@/components/ui/button";
import { ChatInput } from "@/components/ui/chat/chat-input";
import {
  ChatBubble,
  ChatBubbleMessage,
  ChatBubbleAction,
  ChatBubbleActionWrapper,
} from "@/components/ui/chat/chat-bubble";

import { ChatMessageList } from "@/components/ui/chat/chat-message-list";
import {
  ArrowDownToDotIcon,
  CornerDownLeftIcon,
  CornerLeftUpIcon,
  CornerRightUpIcon,
  ImageIcon,
  InfoIcon,
  ScissorsIcon,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  NavigationMenu,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";

import { AppContext } from "./App";

export default function ChatBOX() {
  const ctx = useContext(AppContext);
  if (ctx === null) return <></>;
  const {
    db,
    chatStore,
    setChatStore,
    selectedChatIndex,
    setSelectedChatIndex,
  } = ctx;
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

  const messagesEndRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (follow) {
      if (messagesEndRef.current === null) return;
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [showRetry, showGenerating, generatingMessage]);

  const client = new ChatGPT(chatStore.apiKey);

  const _completeWithStreamMode = async (
    response: Response
  ): Promise<Usage> => {
    let responseTokenCount = 0;
    const allChunkMessage: string[] = [];
    const allChunkTool: ToolCall[] = [];
    setShowGenerating(true);
    const logprobs: Logprobs = {
      content: [],
    };
    let response_model_name: string | null = null;
    let usage: Usage | null = null;
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
    setGeneratingMessage("");
    setShowGenerating(false);

    const prompt_tokens = chatStore.history
      .filter(({ hide }) => !hide)
      .slice(chatStore.postBeginIndex, -1)
      .reduce((acc, msg) => acc + msg.token, 0);
    const ret: Usage = {
      prompt_tokens: prompt_tokens,
      completion_tokens: responseTokenCount,
      total_tokens: prompt_tokens + responseTokenCount,
      response_model_name: response_model_name,
      prompt_tokens_details: null,
      completion_tokens_details: null,
    };

    if (usage) {
      ret.prompt_tokens = usage.prompt_tokens ?? prompt_tokens;
      ret.completion_tokens = usage.completion_tokens ?? responseTokenCount;
      ret.total_tokens =
        usage.total_tokens ?? prompt_tokens + responseTokenCount;
      ret.prompt_tokens_details = usage.prompt_tokens_details ?? null;
      ret.completion_tokens_details = usage.completion_tokens_details ?? null;
    }

    return ret;
  };

  const _completeWithFetchMode = async (response: Response): Promise<Usage> => {
    const data = (await response.json()) as FetchResponse;
    const msg = client.processFetchResponse(data);

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

    const ret: Usage = {
      prompt_tokens: data.usage.prompt_tokens ?? 0,
      completion_tokens: data.usage.completion_tokens ?? 0,
      total_tokens: data.usage.total_tokens ?? 0,
      response_model_name: data.model ?? null,
      prompt_tokens_details: data.usage.prompt_tokens_details ?? null,
      completion_tokens_details: data.usage.completion_tokens_details ?? null,
    };

    return ret;
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
      let usage: Usage;
      if (contentType?.startsWith("text/event-stream")) {
        usage = await _completeWithStreamMode(response);
      } else if (contentType?.startsWith("application/json")) {
        usage = await _completeWithFetchMode(response);
      } else {
        throw `unknown response content type ${contentType}`;
      }

      // manually copy status from client to chatStore
      chatStore.maxTokens = client.max_tokens;
      chatStore.tokenMargin = client.tokens_margin;
      chatStore.totalTokens = client.total_tokens;

      console.log("usage", usage);
      // estimate user's input message token
      const aboveTokens = chatStore.history
        .filter(({ hide }) => !hide)
        .slice(chatStore.postBeginIndex, -2)
        .reduce((acc, msg) => acc + msg.token, 0);
      const userMessage = chatStore.history
        .filter(({ hide }) => !hide)
        .slice(-2, -1)[0];
      if (userMessage) {
        userMessage.token = usage.prompt_tokens - aboveTokens;
        console.log("estimate user message token", userMessage.token);
      }
      // [TODO]
      // calculate cost
      if (usage.response_model_name) {
        let cost = 0;

        if (usage.prompt_tokens_details) {
          const cached_prompt_tokens =
            usage.prompt_tokens_details.cached_tokens ?? 0;
          const uncached_prompt_tokens =
            usage.prompt_tokens - cached_prompt_tokens;
          const prompt_price =
            models[usage.response_model_name]?.price?.prompt ?? 0;
          const cached_price =
            models[usage.response_model_name]?.price?.cached_prompt ??
            prompt_price;
          cost +=
            cached_prompt_tokens * cached_price +
            uncached_prompt_tokens * prompt_price;
        } else {
          cost +=
            usage.prompt_tokens *
            (models[usage.response_model_name]?.price?.prompt ?? 0);
        }

        cost +=
          usage.completion_tokens *
          (models[usage.response_model_name]?.price?.completion ?? 0);

        addTotalCost(cost);
        chatStore.cost += cost;
        console.log("cost", cost);
      }

      setShowRetry(false);
      setChatStore({ ...chatStore });
    } catch (error) {
      setShowRetry(true);
      alert(error);
    } finally {
      setShowGenerating(false);
      setSelectedChatIndex(selectedChatIndex);
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

  const userInputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <div className="flex flex-col p-2 gap-2 w-full">
        <NavigationMenu>
          <NavigationMenuList>
            {ctx.templateAPIs.length > 0 && (
              <ListAPIs
                label="Chat API"
                shortLabel="API"
                apiField="apiEndpoint"
                keyField="apiKey"
              />
            )}
            {ctx.templateAPIsWhisper.length > 0 && (
              <ListAPIs
                label="Whisper API"
                shortLabel="Whisper"
                apiField="whisper_api"
                keyField="whisper_key"
              />
            )}
            {ctx.templateAPIsTTS.length > 0 && (
              <ListAPIs
                label="TTS API"
                shortLabel="TTS"
                apiField="tts_api"
                keyField="tts_key"
              />
            )}
            {ctx.templateAPIsImageGen.length > 0 && (
              <ListAPIs
                label="Image Gen API"
                shortLabel="ImgGen"
                apiField="image_gen_api"
                keyField="image_gen_key"
              />
            )}
            {ctx.templateTools.length > 0 && <ListToolsTemplates />}
          </NavigationMenuList>
        </NavigationMenu>
      </div>
      <div className="grow flex flex-col p-2 w-full">
        <ChatMessageList>
          {chatStore.history.length === 0 && (
            <Alert variant="default" className="my-3">
              <InfoIcon className="h-4 w-4" />
              <AlertTitle>
                {Tr("This is a new chat session, start by typing a message")}
              </AlertTitle>
              <AlertDescription className="flex flex-col gap-1 mt-5">
                <div className="flex items-center gap-2">
                  <CornerRightUpIcon className="h-4 w-4" />
                  <span>
                    {Tr(
                      "Settings button located at the top right corner can be used to change the settings of this chat"
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <CornerLeftUpIcon className="h-4 w-4" />
                  <span>
                    {Tr(
                      "'New' button located at the top left corner can be used to create a new chat"
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <ArrowDownToDotIcon className="h-4 w-4" />
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
                    // onClick={() => setShowSettings(true)}
                    // TODO: add a button to show settings
                  >
                    {chatStore.systemMessageContent}
                  </div>
                </div>
              </ChatBubbleMessage>
              <ChatBubbleActionWrapper>
                <ChatBubbleAction
                  className="size-7"
                  icon={<ScissorsIcon className="size-4" />}
                  onClick={() => {
                    chatStore.systemMessageContent = "";
                    chatStore.toolsString = "";
                    chatStore.history = [];
                    setChatStore({ ...chatStore });
                  }}
                />
              </ChatBubbleActionWrapper>
            </ChatBubble>
          )}
          {chatStore.history.map((_, messageIndex) => (
            <Message messageIndex={messageIndex} />
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
          <VersionHint />
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
          <div ref={messagesEndRef as any}></div>
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
      </div>
      <div className="sticky bottom-0 w-full z-20 bg-background">
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
        <form className="relative rounded-lg border bg-background focus-within:ring-1 focus-within:ring-ring p-1">
          <ChatInput
            value={inputMsg}
            ref={userInputRef as any}
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
                <WhisperButton inputMsg={inputMsg} setInputMsg={setInputMsg} />
                <span className="sr-only">Use Microphone</span>
              </>
            )}

            <Button
              size="sm"
              className="ml-auto gap-1.5"
              disabled={showGenerating}
              onClick={() => {
                send(inputMsg, true);
                if (userInputRef.current === null) return;
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
          setShowAddImage={setShowAddImage}
          images={images}
          showAddImage={showAddImage}
          setImages={setImages}
        />
      </div>
    </>
  );
}
