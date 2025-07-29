import { useContext } from "react";
import { ChatStoreMessage } from "@/types/chatstore";
import { AppChatStoreContext, AppContext } from "@/pages/App";
import { useToast } from "@/hooks/use-toast";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { langCodeContext } from "@/translate";
import { tr } from "@/translate";
import {
  ChatBubble,
  ChatBubbleMessage,
} from "@/components/ui/chat/chat-bubble";
import { Button } from "@/components/ui/button";
import { LoaderCircleIcon } from "lucide-react";

interface ToolCallMessageProps {
  chat: ChatStoreMessage;
}

export function ToolCallMessage({ chat }: ToolCallMessageProps) {
  const { chatStore, setChatStore } = useContext(AppChatStoreContext);
  const { toast } = useToast();
  const { langCode } = useContext(langCodeContext);
  const { callingTools, setCallingTools } = useContext(AppContext);
  const copyToClipboard = useCopyToClipboard();

  const callMCPTool = async (toolCall: any) => {
    const toolName = toolCall.function.name;
    const toolId = toolCall.id;

    if (!toolId) {
      toast({
        title: tr("Tool call failed", langCode),
        description: tr("Tool call ID is missing", langCode),
        variant: "destructive",
      });
      return;
    }

    // 在 MCP 连接中查找对应的工具
    const connectedServers =
      chatStore.mcpConnections?.filter((conn) => conn.connected) || [];
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
      toast({
        title: tr("Tool call failed", langCode),
        description: `${tr("MCP tool not found", langCode)}: "${toolName}"`,
        variant: "destructive",
      });
      return;
    }

    setCallingTools((prev) => ({ ...prev, [toolId]: true }));

    // 保存当前滚动位置
    const chatContainer = document.querySelector(".overflow-y-auto");
    const currentScrollTop = chatContainer?.scrollTop || 0;

    try {
      // 解析工具参数
      let toolArguments;
      try {
        toolArguments = JSON.parse(toolCall.function.arguments);
      } catch (e) {
        // 如果参数不是有效的 JSON，给出明确的错误信息
        console.warn(
          "Tool arguments is not valid JSON:",
          toolCall.function.arguments
        );
        throw new Error(
          `${tr("Tool arguments are not valid JSON format", langCode)}: ${
            toolCall.function.arguments
          }`
        );
      }

      // 构建 MCP tools/call 请求
      const mcpRequest = {
        method: "tools/call",
        params: {
          name: toolName,
          arguments: toolArguments,
        },
        id: Date.now(), // 使用时间戳作为请求 ID
        jsonrpc: "2.0",
      };

      console.log("Calling MCP tool:", mcpRequest);

      // 发送 MCP 工具调用请求
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
        throw new Error(
          `${tr("MCP tool call failed", langCode)}: ${response.status} ${
            response.statusText
          }`
        );
      }

      // 解析响应
      const responseText = await response.text();
      let mcpResult;

      if (responseText.includes("data: ")) {
        // 解析 SSE 格式
        const lines = responseText.split("\n");
        const dataLine = lines.find((line) => line.startsWith("data: "));
        if (dataLine) {
          const jsonData = dataLine.substring(6);
          mcpResult = JSON.parse(jsonData);
        }
      } else {
        // 普通 JSON 响应
        mcpResult = JSON.parse(responseText);
      }

      console.log("MCP tool result:", mcpResult);

      // 提取结果内容
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

      // 添加工具调用结果消息
      const functionCallOutputMessage: ChatStoreMessage = {
        role: "tool",
        content: outputText,
        tool_call_id: toolId,
        hide: false,
        token: outputText.length / 4, // 估算 token 数量
        example: false,
        audio: null,
        logprobs: null,
        response_model_name: null,
        reasoning_content: null,
        usage: null,
      };

      // 更新聊天记录
      const messageIndex = chatStore.history.findIndex((msg) => msg === chat);
      if (messageIndex !== -1) {
        const newHistory = [...chatStore.history];
        newHistory.splice(messageIndex + 1, 0, functionCallOutputMessage);
        setChatStore({
          ...chatStore,
          history: newHistory,
          totalTokens: chatStore.totalTokens + functionCallOutputMessage.token,
        });

        // 恢复滚动位置，延迟执行确保DOM更新完成
        setTimeout(() => {
          if (chatContainer) {
            chatContainer.scrollTop = currentScrollTop;
          }
        }, 0);
      }

      toast({
        title: tr("MCP tool call succeeded", langCode),
        description: `${tr("Successfully called", langCode)} ${toolName} ${tr(
          "tool",
          langCode
        )}`,
      });
    } catch (error) {
      console.error("MCP tool call error:", error);

      // 出错时也恢复滚动位置
      setTimeout(() => {
        if (chatContainer) {
          chatContainer.scrollTop = currentScrollTop;
        }
      }, 0);

      toast({
        title: tr("MCP tool call failed", langCode),
        description:
          error instanceof Error
            ? error.message
            : tr("Unknown error", langCode),
        variant: "destructive",
      });
    } finally {
      setCallingTools((prev) => ({ ...prev, [toolId]: false }));
    }
  };

  return (
    <ChatBubble className="border-gray-300 dark:border-gray-600">
      <ChatBubbleMessage isLoading={false}>
        <div className="space-y-3">
          {chat.tool_calls?.map((tool_call) => (
            <div
              key={tool_call.id}
              className="bg-gray-100 dark:bg-gray-800/50 p-3 rounded border border-gray-300 dark:border-gray-600"
            >
              <div className="flex items-center justify-between mb-2">
                <strong className="text-sm text-gray-800 dark:text-gray-200">
                  Tool Call
                </strong>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => callMCPTool(tool_call)}
                  disabled={tool_call.id ? callingTools[tool_call.id] : false}
                  className="ml-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600"
                >
                  {tool_call.id && callingTools[tool_call.id] ? (
                    <>
                      <LoaderCircleIcon className="h-4 w-4 animate-spin mr-1" />
                      Calling...
                    </>
                  ) : (
                    "Call MCP Tool"
                  )}
                </Button>
              </div>
              <div className="space-y-1 text-sm">
                <p>
                  <strong>ID: </strong>
                  <span
                    className="p-1 rounded cursor-pointer hover:opacity-70 hover:underline bg-gray-200/70 dark:bg-gray-700/70"
                    onClick={() => copyToClipboard(String(tool_call.id))}
                  >
                    {tool_call?.id}
                  </span>
                </p>
                <p>
                  <strong>Type: </strong>
                  {tool_call?.type}
                </p>
                <p>
                  <strong>Function: </strong>
                  <span
                    className="p-1 rounded cursor-pointer hover:opacity-70 hover:underline bg-gray-200/70 dark:bg-gray-700/70"
                    onClick={() => copyToClipboard(tool_call.function.name)}
                  >
                    {tool_call.function.name}
                  </span>
                </p>
                <div>
                  <strong>Arguments:</strong>
                  <pre
                    className="mt-1 p-2 rounded cursor-pointer hover:opacity-70 hover:underline bg-gray-200/70 dark:bg-gray-700/70 text-xs overflow-auto break-words whitespace-pre-wrap word-break-break-all"
                    onClick={() =>
                      copyToClipboard(tool_call.function.arguments)
                    }
                  >
                    {(() => {
                      try {
                        return JSON.stringify(
                          JSON.parse(tool_call.function.arguments),
                          null,
                          2
                        );
                      } catch {
                        return tool_call.function.arguments;
                      }
                    })()}
                  </pre>
                </div>
              </div>
            </div>
          ))}
          {typeof chat.content === "string" &&
            (chat.content as string).trim() && (
              <div className="text-sm text-muted-foreground">
                {chat.content as string}
              </div>
            )}
        </div>
      </ChatBubbleMessage>
    </ChatBubble>
  );
}
