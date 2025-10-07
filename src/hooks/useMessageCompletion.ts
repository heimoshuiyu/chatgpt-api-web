import { useContext } from "react";
import ChatGPT, {
  FetchResponse,
  ToolCall,
  Logprobs,
  Usage,
  calculate_token_length,
} from "@/chatgpt";
import { ChatStoreMessage } from "@/types/chatstore";
import { AppChatStoreContext } from "@/pages/App";
import { addTotalCost } from "@/utils/totalCost";
import { models } from "@/types/models";

export enum StreamErrorType {
  NETWORK_ERROR = "network_error",
  HTTP_ERROR = "http_error",
  PARSE_ERROR = "parse_error",
  TIMEOUT_ERROR = "timeout_error",
  ABORT_ERROR = "abort_error",
  RATE_LIMIT_ERROR = "rate_limit_error",
  UNKNOWN_ERROR = "unknown_error",
}

export interface StreamError {
  type: StreamErrorType;
  message: string;
  statusCode?: number;
  details?: any;
  errorBody?: string; // 服务器返回的原始HTTP响应体
}

export interface MessageCompletionHook {
  completeWithStreamMode: (
    response: Response,
    signal: AbortSignal,
    setGeneratingMessage?: (message: string) => void
  ) => Promise<ChatStoreMessage>;
  completeWithFetchMode: (response: Response) => Promise<ChatStoreMessage>;
  complete: (
    onMCPToolCall?: (message: ChatStoreMessage) => void,
    setGeneratingMessage?: (message: string) => void
  ) => Promise<void>;
}

export const createStreamError = (
  error: any,
  statusCode?: number,
  errorBody?: string
): StreamError => {
  // 使用服务器返回的响应体作为主要错误信息
  let message = errorBody || error.message || "Unknown error occurred";

  // 如果没有响应体，使用状态码生成基本错误描述
  if (!errorBody && statusCode) {
    if (statusCode === 401) {
      message = "Authentication failed: Invalid API key or token";
    } else if (statusCode === 403) {
      message =
        "Access forbidden: You don't have permission to access this resource";
    } else if (statusCode === 404) {
      message = "Resource not found: The requested endpoint does not exist";
    } else if (statusCode === 429) {
      message =
        "Rate limit exceeded: Too many requests, please try again later";
    } else if (statusCode >= 400 && statusCode < 500) {
      message = `Client error (${statusCode})`;
    } else if (statusCode >= 500) {
      message = `Server error (${statusCode})`;
    }
  }

  if (error.name === "AbortError") {
    return {
      type: StreamErrorType.ABORT_ERROR,
      message: "Request was cancelled",
      errorBody,
    };
  }

  if (error.name === "TimeoutError" || error.message?.includes("timeout")) {
    return {
      type: StreamErrorType.TIMEOUT_ERROR,
      message,
      errorBody,
    };
  }

  if (error.message?.includes("fetch") || error.message?.includes("network")) {
    return {
      type: StreamErrorType.NETWORK_ERROR,
      message,
      errorBody,
    };
  }

  if (statusCode === 401) {
    return {
      type: StreamErrorType.HTTP_ERROR,
      message,
      statusCode,
      errorBody,
    };
  }

  if (statusCode === 403) {
    return {
      type: StreamErrorType.HTTP_ERROR,
      message,
      statusCode,
      errorBody,
    };
  }

  if (statusCode === 404) {
    return {
      type: StreamErrorType.HTTP_ERROR,
      message,
      statusCode,
      errorBody,
    };
  }

  if (statusCode === 429) {
    return {
      type: StreamErrorType.RATE_LIMIT_ERROR,
      message,
      statusCode,
      errorBody,
    };
  }

  if (statusCode && statusCode >= 400 && statusCode < 500) {
    return {
      type: StreamErrorType.HTTP_ERROR,
      message,
      statusCode,
      errorBody,
    };
  }

  if (statusCode && statusCode >= 500) {
    return {
      type: StreamErrorType.HTTP_ERROR,
      message,
      statusCode,
      errorBody,
    };
  }

  if (error.message?.includes("JSON") || error.message?.includes("parse")) {
    return {
      type: StreamErrorType.PARSE_ERROR,
      message,
      details: error.message,
      errorBody,
    };
  }

  return {
    type: StreamErrorType.UNKNOWN_ERROR,
    message,
    details: error,
    errorBody,
  };
};

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
    hide: false,
    token: calculate_token_length(
      chunkMessages.join("") + reasoningChunks.join("")
    ),
    example: false,
    audio: null,
    logprobs: null,
    response_model_name: null,
    usage: null,
    response_count,
  };
};

export function useMessageCompletion(): MessageCompletionHook {
  const { chatStore, setChatStore } = useContext(AppChatStoreContext);
  const client = new ChatGPT(chatStore.apiKey);

  const completeWithStreamMode = async (
    response: Response,
    signal: AbortSignal,
    setGeneratingMessage?: (message: string) => void
  ): Promise<ChatStoreMessage> => {
    let responseTokenCount = 0; // including reasoning content and normal content
    const allChunkMessage: string[] = [];
    const allReasoningContentChunk: string[] = [];
    const allChunkTool: ToolCall[] = [];
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

        setGeneratingMessage?.(
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
      const streamError = createStreamError(e, response.status);

      // 保存部分内容（如果有）
      if (allChunkMessage.length > 0 || allReasoningContentChunk.length > 0) {
        const partialMsg = createMessageFromCurrentBuffer(
          allChunkMessage,
          allReasoningContentChunk,
          allChunkTool,
          responseTokenCount
        );
        partialMsg.error = streamError;
        partialMsg.incomplete = true;
        chatStore.history.push(partialMsg);
        setChatStore({ ...chatStore });
      }

      // 添加错误信息到控制台
      console.error("Stream processing error:", {
        type: streamError.type,
        message: streamError.message,
        statusCode: streamError.statusCode,
        details: streamError.details,
        chunksReceived: responseTokenCount,
        hasPartialContent:
          allChunkMessage.length > 0 || allReasoningContentChunk.length > 0,
      });

      // 重新抛出错误，包含增强的错误信息
      const enhancedError = new Error(streamError.message);
      enhancedError.name = "StreamError";
      (enhancedError as any).streamError = streamError;
      throw enhancedError;
    }

    setGeneratingMessage?.("");

    const content = allChunkMessage.join("");
    const reasoning_content = allReasoningContentChunk.join("");

    console.log("save logprobs", logprobs);

    // manually copy status from client to chatStore
    chatStore.maxTokens = client.max_tokens;
    chatStore.tokenMargin = client.tokens_margin;

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

  const completeWithFetchMode = async (
    response: Response
  ): Promise<ChatStoreMessage> => {
    try {
      const data = (await response.json()) as FetchResponse;
      const msg = client.processFetchResponse(data);

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
          : (data.usage.completion_tokens ??
            calculate_token_length(msg.content)),
        example: false,
        audio: null,
        logprobs: data.choices[0]?.logprobs,
        response_model_name: data.model,
        reasoning_content: data.choices[0]?.message?.reasoning_content ?? null,
        usage,
      };

      return ret;
    } catch (e: any) {
      const streamError = createStreamError(e, response.status);
      console.error("Fetch mode error:", {
        type: streamError.type,
        message: streamError.message,
        statusCode: streamError.statusCode,
        details: streamError.details,
      });

      const enhancedError = new Error(streamError.message);
      enhancedError.name = "FetchError";
      (enhancedError as any).streamError = streamError;
      throw enhancedError;
    }
  };

  const complete = async (
    onMCPToolCall?: (message: ChatStoreMessage) => void,
    setGeneratingMessage?: (message: string) => void
  ) => {
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
        const ret: any = {
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
    client.enable_thinking = chatStore.enable_thinking;
    client.enable_thinking_enabled = chatStore.enable_thinking_enabled;

    const created_at = new Date();

    try {
      const abortController = new AbortController();

      // 添加超时处理
      const timeoutId = setTimeout(() => {
        abortController.abort();
      }, 120000); // 2分钟超时

      const response = await client._fetch(
        chatStore.streamMode,
        chatStore.logprobs,
        abortController.signal
      );

      clearTimeout(timeoutId);

      // 检查HTTP状态码
      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error");
        const streamError = createStreamError(
          new Error(`HTTP ${response.status}: ${errorText}`),
          response.status,
          errorText
        );

        console.error("HTTP request failed:", {
          status: response.status,
          statusText: response.statusText,
          url: response.url,
          headers: Object.fromEntries(response.headers.entries()),
          errorBody: errorText,
        });

        const enhancedError = new Error(streamError.message);
        enhancedError.name = "HttpError";
        (enhancedError as any).streamError = streamError;
        throw enhancedError;
      }

      const responsed_at = new Date();
      const contentType = response.headers.get("content-type");
      let cs: ChatStoreMessage;
      if (contentType?.startsWith("text/event-stream")) {
        cs = await completeWithStreamMode(
          response,
          abortController.signal,
          setGeneratingMessage
        );
      } else if (contentType?.startsWith("application/json")) {
        cs = await completeWithFetchMode(response);
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

      setChatStore({ ...chatStore });

      // Check if there are MCP tool calls to execute
      if (cs.tool_calls && cs.tool_calls.length > 0 && onMCPToolCall) {
        // Check if any of the tool calls are MCP tools
        const connectedServers =
          chatStore.mcpConnections?.filter((conn) => conn.connected) || [];
        const hasMcpToolCalls = cs.tool_calls.some((toolCall) => {
          const toolName = toolCall.function.name;
          return connectedServers.some((connection) =>
            connection.tools.some((tool) => tool.name === toolName)
          );
        });

        if (hasMcpToolCalls) {
          // Show confirmation dialog for MCP tool calls
          console.log(
            "Showing MCP confirmation dialog for tools:",
            cs.tool_calls?.map((tc) => tc.function.name)
          );
          onMCPToolCall(cs);
        }
      }
    } catch (error: any) {
      const streamError =
        (error as any).streamError || createStreamError(error);

      console.error("Complete request failed:", {
        type: streamError.type,
        message: streamError.message,
        statusCode: streamError.statusCode,
        details: streamError.details,
      });

      if (
        error.name === "AbortError" ||
        streamError.type === StreamErrorType.ABORT_ERROR
      ) {
        console.log("Request was aborted");
        return;
      }

      throw error;
    }
  };

  return {
    completeWithStreamMode,
    completeWithFetchMode,
    complete,
  };
}
