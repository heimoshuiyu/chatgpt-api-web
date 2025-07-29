import { useContext, useRef } from "react";
import { useEffect, useState } from "react";
import { langCodeContext, tr, Tr } from "@/translate";
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
import { ImageUploadDrawer } from "@/components/ImageUploadDrawer";
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
  InfoIcon,
  ScissorsIcon,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import { AppChatStoreContext, AppContext } from "./App";
import { ImageGenDrawer } from "@/components/ImageGenDrawer";
import { useToast } from "@/hooks/use-toast";

const createMessageFromCurrentBuffer = (
  chunkMessages: string[],
  reasoningChunks: string[],
  tools: ToolCall[],
  response_count: number
): ChatStoreMessage => {
  return {
    role: "assistant",
    content: chunkMessages.join(""),
    reasoning_content: reasoningChunks.join(""),
    tool_calls: tools.length > 0 ? tools : undefined,
    // 补全其他必填字段的默认值（根据你的类型定义）
    hide: false,
    token: calculate_token_length(
      chunkMessages.join("") + reasoningChunks.join("")
    ), // 需要实际的token计算逻辑
    example: false,
    audio: null,
    logprobs: null,
    response_model_name: null,
    usage: null,
    response_count,
  };
};

export default function ChatBOX() {
  const { db, selectedChatIndex, setSelectedChatIndex, handleNewChatStore, callingTools, setCallingTools } =
    useContext(AppContext);
  const { langCode, setLangCode } = useContext(langCodeContext);
  const { chatStore, setChatStore } = useContext(AppChatStoreContext);
  const { toast } = useToast();
  // prevent error
  const [inputMsg, setInputMsg] = useState("");
  const [images, setImages] = useState<MessageDetail[]>([]);
  const [showAddImage, setShowAddImage] = useState(false);
  const [showGenImage, setShowGenImage] = useState(false);
  const [showGenerating, setShowGenerating] = useState(false);
  const [generatingMessage, setGeneratingMessage] = useState("");
  const [showRetry, setShowRetry] = useState(false);
  let default_follow = localStorage.getItem("follow");
  if (default_follow === null) {
    default_follow = "true";
  }
  const [follow, _setFollow] = useState(default_follow === "true");

  // Get auto call MCP setting from localStorage
  const getAutoCallMCP = (): boolean => {
    const stored = localStorage.getItem("autoCallMCP");
    return stored ? JSON.parse(stored) : false;
  };

  // Auto call MCP tools function
  const autoCallMCPTools = async (
    assistantMessage: ChatStoreMessage
  ): Promise<boolean> => {
    if (
      !getAutoCallMCP() ||
      !assistantMessage.tool_calls ||
      assistantMessage.tool_calls.length === 0
    ) {
      return false;
    }

    console.log(
      "Auto calling MCP tools for message with",
      assistantMessage.tool_calls.length,
      "tool calls"
    );

    const connectedServers =
      chatStore.mcpConnections?.filter((conn) => conn.connected) || [];
    let allToolCallsCompleted = true;

    // Set all tool calls to loading state
    const toolCallIds = assistantMessage.tool_calls.map((tc) => tc.id).filter((id): id is string => Boolean(id));
    const loadingState = toolCallIds.reduce((acc, id) => ({ ...acc, [id as string]: true }), {});
    setCallingTools((prev) => ({ ...prev, ...loadingState }));

    for (const toolCall of assistantMessage.tool_calls) {
      const toolName = toolCall.function.name;
      const toolId = toolCall.id;

      if (!toolId) {
        console.warn("Tool call ID is missing for tool:", toolName);
        allToolCallsCompleted = false;
        continue;
      }

      // Find the corresponding tool in MCP connections
      let foundConnection = null;
      let foundTool = null;

      for (const connection of connectedServers) {
        const tool = connection.tools.find((t) => t.name === toolName);
        if (tool) {
          foundConnection = connection;
          foundTool = tool;
          break;
        }
      }

      if (!foundConnection || !foundTool) {
        console.warn(`MCP tool not found: "${toolName}"`);
        allToolCallsCompleted = false;
        continue;
      }

      try {
        // Parse tool arguments
        let toolArguments;
        try {
          toolArguments = JSON.parse(toolCall.function.arguments);
        } catch (e) {
          console.warn(
            "Tool arguments is not valid JSON:",
            toolCall.function.arguments
          );
          allToolCallsCompleted = false;
          continue;
        }

        // Build MCP tools/call request
        const mcpRequest = {
          method: "tools/call",
          params: {
            name: toolName,
            arguments: toolArguments,
          },
          id: Date.now(), // Use timestamp as request ID
          jsonrpc: "2.0",
        };

        console.log("Auto calling MCP tool:", mcpRequest);

        // Send MCP tool call request
        const response = await fetch(foundConnection.config.url, {
          method: "POST",
          headers: {
            Accept: "application/json, text/event-stream",
            "Content-Type": "application/json; charset=utf-8",
            "Mcp-Session-Id": foundConnection.sessionId,
          },
          body: JSON.stringify(mcpRequest),
        });

        if (!response.ok) {
          console.error(
            `MCP tool call failed: ${response.status} ${response.statusText}`
          );
          allToolCallsCompleted = false;
          continue;
        }

        // Parse response
        const responseText = await response.text();
        let mcpResult;

        if (responseText.includes("data: ")) {
          // Parse SSE format
          const lines = responseText.split("\n");
          const dataLine = lines.find((line) => line.startsWith("data: "));
          if (dataLine) {
            const jsonData = dataLine.substring(6);
            mcpResult = JSON.parse(jsonData);
          }
        } else {
          // Regular JSON response
          mcpResult = JSON.parse(responseText);
        }

        console.log("MCP tool result:", mcpResult);

        // Extract result content
        const resultContent = mcpResult?.result?.content;
        let outputText = "";

        if (Array.isArray(resultContent)) {
          outputText = resultContent
            .filter((item) => item.type === "text")
            .map((item) => item.text)
            .join("\n");
        } else if (typeof resultContent === "string") {
          outputText = resultContent;
        } else {
          outputText = JSON.stringify(resultContent);
        }

        // Add tool call result message
        const functionCallOutputMessage: ChatStoreMessage = {
          role: "tool",
          content: outputText,
          tool_call_id: toolId,
          hide: false,
          token: outputText.length / 4, // Estimate token count
          example: false,
          audio: null,
          logprobs: null,
          response_model_name: null,
          reasoning_content: null,
          usage: null,
        };

        // Update chat history
        chatStore.history.push(functionCallOutputMessage);
        chatStore.totalTokens += functionCallOutputMessage.token;

        console.log(`Auto called MCP tool "${toolName}" successfully`);
      } catch (error) {
        console.error("Auto MCP tool call error:", error);
        allToolCallsCompleted = false;
      }
    }

    // Clear loading states for all tool calls
    const clearingState = toolCallIds.reduce((acc, id) => ({ ...acc, [id as string]: false }), {});
    setCallingTools((prev) => ({ ...prev, ...clearingState }));

    if (allToolCallsCompleted && assistantMessage.tool_calls.length > 0) {
      setChatStore({ ...chatStore });
      return true; // Signal that we should regenerate
    }

    return false;
  };

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
  }, [showRetry, showGenerating, generatingMessage, chatStore]);

  const client = new ChatGPT(chatStore.apiKey);

  const _completeWithStreamMode = async (
    response: Response,
    signal: AbortSignal
  ): Promise<ChatStoreMessage> => {
    let responseTokenCount = 0; // including reasoning content and normal content
    const allChunkMessage: string[] = [];
    const allReasoningContentChunk: string[] = [];
    const allChunkTool: ToolCall[] = [];
    setShowGenerating(true);
    const logprobs: Logprobs = {
      content: [],
    };
    let response_model_name: string | null = null;
    let usage: Usage | null = null;

    try {
      for await (const i of client.processStreamResponse(response, signal)) {
        if (signal?.aborted) break;
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

        if (c?.delta?.content) {
          allChunkMessage.push(c?.delta?.content ?? "");
        }
        if (c?.delta?.reasoning_content) {
          allReasoningContentChunk.push(c?.delta?.reasoning_content ?? "");
        }

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
          (allReasoningContentChunk.length
            ? "<think>\n" + allReasoningContentChunk.join("") + "\n</think>\n"
            : "") +
            allChunkMessage.join("") +
            allChunkTool.map((tool) => {
              return `Tool Call ID: ${tool.id}\nType: ${tool.type}\nFunction: ${tool.function.name}\nArguments: ${tool.function.arguments}`;
            }) +
            "\n" +
            responseTokenCount +
            " response count"
        );
      }
    } catch (e: any) {
      if (e.name === "AbortError") {
        // 1. 立即保存当前buffer中的内容
        if (allChunkMessage.length > 0 || allReasoningContentChunk.length > 0) {
          const partialMsg = createMessageFromCurrentBuffer(
            allChunkMessage,
            allReasoningContentChunk,
            allChunkTool,
            responseTokenCount
          );
          chatStore.history.push(partialMsg);
          setChatStore({ ...chatStore });
        }
        // 2. 不隐藏错误，重新抛出给上层
        throw e;
      }
      // 其他错误直接抛出
      throw e;
    } finally {
      setShowGenerating(false);
      setGeneratingMessage("");
    }

    const content = allChunkMessage.join("");
    const reasoning_content = allReasoningContentChunk.join("");

    console.log("save logprobs", logprobs);

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

    const newMsg: ChatStoreMessage = {
      role: "assistant",
      content,
      reasoning_content,
      hide: false,
      token:
        responseTokenCount -
        (usage?.completion_tokens_details?.reasoning_tokens ?? 0),
      example: false,
      audio: null,
      logprobs,
      response_model_name,
      usage: usage ?? {
        prompt_tokens: prompt_tokens,
        completion_tokens: responseTokenCount,
        total_tokens: prompt_tokens + responseTokenCount,
        response_model_name: response_model_name,
        prompt_tokens_details: null,
        completion_tokens_details: null,
      },
      response_count: responseTokenCount,
    };
    if (allChunkTool.length > 0) newMsg.tool_calls = allChunkTool;

    return newMsg;
  };

  const _completeWithFetchMode = async (
    response: Response
  ): Promise<ChatStoreMessage> => {
    const data = (await response.json()) as FetchResponse;
    const msg = client.processFetchResponse(data);

    setShowGenerating(false);

    const usage: Usage = {
      prompt_tokens: data.usage.prompt_tokens ?? 0,
      completion_tokens: data.usage.completion_tokens ?? 0,
      total_tokens: data.usage.total_tokens ?? 0,
      response_model_name: data.model ?? null,
      prompt_tokens_details: data.usage.prompt_tokens_details ?? null,
      completion_tokens_details: data.usage.completion_tokens_details ?? null,
    };

    const ret: ChatStoreMessage = {
      role: "assistant",
      content: msg.content,
      tool_calls: msg.tool_calls,
      hide: false,
      token: data.usage?.completion_tokens_details
        ? data.usage.completion_tokens -
          data.usage.completion_tokens_details.reasoning_tokens
        : (data.usage.completion_tokens ?? calculate_token_length(msg.content)),
      example: false,
      audio: null,
      logprobs: data.choices[0]?.logprobs,
      response_model_name: data.model,
      reasoning_content: data.choices[0]?.message?.reasoning_content ?? null,
      usage,
    };

    return ret;
  };

  // wrap the actuall complete api
  const complete = async (skipAutoMCP = false) => {
    // manually copy status from chatStore to client
    client.apiEndpoint = chatStore.apiEndpoint;
    client.sysMessageContent = chatStore.systemMessageContent;

    // Combine existing tools with MCP tools
    let combinedToolsString = chatStore.toolsString;

    // Collect tools from connected MCP servers
    const connectedMCPServers =
      chatStore.mcpConnections?.filter((conn) => conn.connected) || [];
    if (connectedMCPServers.length > 0) {
      const mcpTools: any[] = [];

      // Convert MCP tools to the required format
      connectedMCPServers.forEach((connection) => {
        connection.tools.forEach((mcpTool) => {
          mcpTools.push({
            type: "function",
            function: {
              name: mcpTool.name,
              description: mcpTool.description,
              parameters: mcpTool.inputSchema,
            },
          });
        });
      });

      // Merge with existing tools
      let existingTools: any[] = [];
      if (chatStore.toolsString.trim()) {
        try {
          existingTools = JSON.parse(chatStore.toolsString);
        } catch (e) {
          console.error("Error parsing existing toolsString:", e);
          existingTools = [];
        }
      }

      // Combine existing tools with MCP tools
      const allTools = [...existingTools, ...mcpTools];
      combinedToolsString = JSON.stringify(allTools);

      console.log(
        `Combined ${existingTools.length} existing tools with ${mcpTools.length} MCP tools from ${connectedMCPServers.length} servers`
      );
    }

    client.toolsString = combinedToolsString;
    client.tokens_margin = chatStore.tokenMargin;
    client.temperature = chatStore.temperature;
    client.enable_temperature = chatStore.temperature_enabled;
    client.top_p = chatStore.top_p;
    client.enable_top_p = chatStore.top_p_enabled;
    client.frequency_penalty = chatStore.frequency_penalty;
    client.frequency_penalty_enabled = chatStore.frequency_penalty_enabled;
    client.presence_penalty = chatStore.presence_penalty;
    client.presence_penalty_enabled = chatStore.presence_penalty_enabled;
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

    const created_at = new Date();

    try {
      setShowGenerating(true);
      abortControllerRef.current = new AbortController();
      const response = await client._fetch(
        chatStore.streamMode,
        chatStore.logprobs,
        abortControllerRef.current.signal
      );
      const responsed_at = new Date();
      const contentType = response.headers.get("content-type");
      let cs: ChatStoreMessage;
      if (contentType?.startsWith("text/event-stream")) {
        cs = await _completeWithStreamMode(
          response,
          abortControllerRef.current.signal
        );
      } else if (contentType?.startsWith("application/json")) {
        cs = await _completeWithFetchMode(response);
      } else {
        throw `unknown response content type ${contentType}`;
      }
      const usage = cs.usage;
      if (!usage) {
        throw "panic: usage is null";
      }
      console.log("usage", usage);

      const completed_at = new Date();
      cs.created_at = created_at.toISOString();
      cs.responsed_at = responsed_at.toISOString();
      cs.completed_at = completed_at.toISOString();

      chatStore.history.push(cs);
      console.log("new chatStore", cs);

      // manually copy status from client to chatStore
      chatStore.maxTokens = client.max_tokens;
      chatStore.tokenMargin = client.tokens_margin;
      chatStore.totalTokens = client.total_tokens;

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
      if (usage.response_model_name || chatStore.chatPrice) {
        let cost = 0;

        // Use custom pricing if available, otherwise fall back to model pricing
        const pricing =
          chatStore.chatPrice || models[usage.response_model_name ?? ""]?.price;

        if (!pricing) {
          console.warn(
            `No pricing information found for model: ${usage.response_model_name}`
          );
        } else {
          if (usage.prompt_tokens_details) {
            const cached_prompt_tokens =
              usage.prompt_tokens_details.cached_tokens ?? 0;
            const uncached_prompt_tokens =
              usage.prompt_tokens - cached_prompt_tokens;
            const prompt_price = pricing.prompt ?? 0;
            const cached_price = pricing.cached_prompt ?? prompt_price;
            cost +=
              cached_prompt_tokens * cached_price +
              uncached_prompt_tokens * prompt_price;
          } else {
            cost += usage.prompt_tokens * (pricing.prompt ?? 0);
          }

          cost += usage.completion_tokens * (pricing.completion ?? 0);
        }

        addTotalCost(cost);
        chatStore.cost += cost;
        console.log("cost calculation:", {
          model: usage.response_model_name,
          usingCustomPricing: !!chatStore.chatPrice,
          pricing: pricing,
          promptTokens: usage.prompt_tokens,
          completionTokens: usage.completion_tokens,
          cachedTokens: usage.prompt_tokens_details?.cached_tokens,
          totalCost: cost,
        });
      }

      setShowRetry(false);
      setChatStore({ ...chatStore });

      // Auto call MCP tools if enabled and not skipped
      if (!skipAutoMCP && getAutoCallMCP()) {
        const shouldRegenerate = await autoCallMCPTools(cs);
        if (shouldRegenerate) {
          await complete(true); // Regenerate with skipAutoMCP=true to prevent infinite recursion
        }
      }
    } catch (error: any) {
      if (error.name === "AbortError") {
        console.log("abort complete");
        return;
      }
      setShowRetry(true);
      alert(error);
    } finally {
      setShowGenerating(false);
      setSelectedChatIndex(selectedChatIndex);
    }
  };

  // when user click the "send" button or ctrl+Enter in the textarea
  const send = async (msg = "", call_complete = true) => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 0);

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
      reasoning_content: null,
      usage: null,
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
  const abortControllerRef = useRef<AbortController>(new AbortController());

  return (
    <>
      <div className="grow flex flex-col w-full">
        <ChatMessageList>
          {chatStore.history.length === 0 && (
            <Alert variant="default" className="my-3">
              <InfoIcon className="h-4 w-4" />
              <AlertTitle>
                <Tr>This is a new chat session, start by typing a message</Tr>
              </AlertTitle>
              <AlertDescription className="flex flex-col gap-1 mt-5">
                <div className="flex items-center gap-2">
                  <CornerRightUpIcon className="h-4 w-4" />
                  <span>
                    <Tr>
                      Settings button located at the top right corner can be
                      used to change the settings of this chat
                    </Tr>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <CornerLeftUpIcon className="h-4 w-4" />
                  <span>
                    <Tr>
                      'New' button located at the top left corner can be used to
                      create a new chat
                    </Tr>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <ArrowDownToDotIcon className="h-4 w-4" />
                  <span>
                    <Tr>
                      All chat history and settings are stored in the local
                      browser
                    </Tr>
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
            <Message messageIndex={messageIndex} key={messageIndex} />
          ))}
          {showGenerating && (
            <ChatBubble variant="received">
              <ChatBubbleMessage isLoading>
                {generatingMessage}
              </ChatBubbleMessage>
            </ChatBubble>
          )}
          <p className="text-center">
            {chatStore.history.length > 0 && !showGenerating && (
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
                <Tr>Re-Generate</Tr>
              </Button>
            )}
            {chatStore.history.length > 0 && !showGenerating && (
              <Button
                variant="secondary"
                size="sm"
                className="m-2"
                disabled={showGenerating}
                onClick={() => {
                  handleNewChatStore();
                }}
              >
                <Tr>New Chat</Tr>
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
                <Tr>Completion</Tr>
              </Button>
            )}
          </p>
          {chatStore.postBeginIndex !== 0 && (
            <p className="p-2 my-2 text-center opacity-50 dark:text-white">
              <Alert variant="default">
                <InfoIcon className="h-4 w-4" />
                <AlertTitle>
                  <Tr>Chat History Notice</Tr>
                </AlertTitle>
                <AlertDescription>
                  <Tr>Info: chat history is too long, forget messages</Tr>:{" "}
                  {chatStore.postBeginIndex}
                </AlertDescription>
              </Alert>
            </p>
          )}
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
                <Tr>Retry</Tr>
              </Button>
            </p>
          )}
        </ChatMessageList>
        <div id="message-end" ref={messagesEndRef as any}></div>
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
          <div className="flex items-center justify-between gap-2 p-2 m-2 rounded bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                <Tr>Follow</Tr>
              </label>
              <Switch
                checked={follow}
                onCheckedChange={setFollow}
                aria-label="Toggle auto-scroll"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                className="ml-auto gap-1.5"
                variant="destructive"
                onClick={() => {
                  abortControllerRef.current.abort();
                  setShowGenerating(false);
                  setGeneratingMessage("");
                }}
              >
                <Tr>Stop Generating</Tr>
                <ScissorsIcon className="size-3.5" />
              </Button>
            </div>
          </div>
        )}
        <form className="relative rounded-lg border bg-background focus-within:ring-1 focus-within:ring-ring p-1">
          <ChatInput
            value={inputMsg}
            ref={userInputRef as any}
            placeholder={tr("Type your message here...", langCode)}
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
            <ImageUploadDrawer
              images={images}
              setImages={setImages}
              disableFactor={[showGenerating]}
            />
            <ImageGenDrawer disableFactor={[showGenerating]} />

            <WhisperButton inputMsg={inputMsg} setInputMsg={setInputMsg} />

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
              <Tr>Send</Tr>
              <CornerDownLeftIcon className="size-3.5" />
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}
