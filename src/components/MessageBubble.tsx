import { LightBulbIcon, XMarkIcon } from "@heroicons/react/24/outline";
import Markdown from "react-markdown";
import remarkMath from "remark-math";
import remarkGfm from "remark-gfm";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";
import "katex/dist/katex.min.css";
import {
  useContext,
  useState,
  useMemo,
  useInsertionEffect,
  useEffect,
} from "react";
import { ChatStoreMessage } from "@/types/chatstore";
import { addTotalCost } from "@/utils/totalCost";

import { Tr, tr, langCodeContext } from "@/translate";
import { getMessageText } from "@/chatgpt";
import { EditMessage } from "@/components/editMessage";
import logprobToColor from "@/utils/logprob";
import {
  ChatBubble,
  ChatBubbleMessage,
  ChatBubbleAction,
  ChatBubbleActionWrapper,
} from "@/components/ui/chat/chat-bubble";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import {
  ClipboardIcon,
  PencilIcon,
  MessageSquareOffIcon,
  MessageSquarePlusIcon,
  AudioLinesIcon,
  LoaderCircleIcon,
  ChevronsUpDownIcon,
} from "lucide-react";
import { AppChatStoreContext, AppContext } from "@/pages/App";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

interface HideMessageProps {
  chat: ChatStoreMessage;
}

function MessageHide({ chat }: HideMessageProps) {
  return (
    <>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>{getMessageText(chat).trim().slice(0, 28)} ...</span>
      </div>
      <div className="flex mt-2 justify-center">
        <Badge variant="destructive">
          <Tr>Removed from context</Tr>
        </Badge>
      </div>
    </>
  );
}

interface MessageDetailProps {
  chat: ChatStoreMessage;
  renderMarkdown: boolean;
}
function MessageDetail({ chat, renderMarkdown }: MessageDetailProps) {
  if (typeof chat.content === "string") {
    return <div></div>;
  }
  return (
    <div>
      {chat.content.map((mdt) =>
        mdt.type === "text" ? (
          chat.hide ? (
            mdt.text?.trim().slice(0, 16) + " ..."
          ) : renderMarkdown ? (
            <Markdown
              remarkPlugins={[remarkMath, remarkGfm]}
              rehypePlugins={[rehypeKatex, rehypeHighlight]}
              className={"prose max-w-none break-words overflow-wrap-anywhere"}
              components={{
                p: ({ children }: any) => (
                  <p className="break-words whitespace-pre-wrap overflow-wrap-anywhere">
                    {children}
                  </p>
                ),
                code: ({ children }: any) => (
                  <code className="break-all whitespace-pre-wrap">
                    {children}
                  </code>
                ),
                pre: ({ children }: any) => (
                  <pre className="break-words whitespace-pre-wrap overflow-x-auto">
                    {children}
                  </pre>
                ),
              }}
            >
              {mdt.text}
            </Markdown>
          ) : (
            mdt.text
          )
        ) : (
          <img
            className="my-2 rounded-md max-w-64 max-h-64"
            src={mdt.image_url?.url}
            key={mdt.image_url?.url}
            onClick={() => {
              window.open(mdt.image_url?.url, "_blank");
            }}
          />
        )
      )}
    </div>
  );
}

interface ToolCallMessageProps {
  chat: ChatStoreMessage;
  copyToClipboard: (text: string) => void;
}
function MessageToolCall({ chat, copyToClipboard }: ToolCallMessageProps) {
  const { chatStore, setChatStore } = useContext(AppChatStoreContext);
  const { toast } = useToast();
  const { langCode } = useContext(langCodeContext);
  const { callingTools, setCallingTools } = useContext(AppContext);

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
                  <Tr>Tool Call</Tr>
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
                      <Tr>Calling...</Tr>
                    </>
                  ) : (
                    <Tr>Call MCP Tool</Tr>
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
                  <strong>
                    <Tr>Type</Tr>:{" "}
                  </strong>
                  {tool_call?.type}
                </p>
                <p>
                  <strong>
                    <Tr>Function</Tr>:{" "}
                  </strong>
                  <span
                    className="p-1 rounded cursor-pointer hover:opacity-70 hover:underline bg-gray-200/70 dark:bg-gray-700/70"
                    onClick={() => copyToClipboard(tool_call.function.name)}
                  >
                    {tool_call.function.name}
                  </span>
                </p>
                <div>
                  <strong>
                    <Tr>Arguments</Tr>:
                  </strong>
                  <pre
                    className="mt-1 p-2 rounded cursor-pointer hover:opacity-70 hover:underline bg-gray-200/70 dark:bg-gray-700/70 text-xs overflow-auto"
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

interface ToolRespondMessageProps {
  chat: ChatStoreMessage;
  copyToClipboard: (text: string) => void;
}
function MessageToolResp({ chat, copyToClipboard }: ToolRespondMessageProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <ChatBubble
      variant="sent"
      className="flex-row-reverse border-gray-200 dark:border-gray-800 !bg-gray-50 dark:!bg-gray-900/40"
    >
      <ChatBubbleMessage isLoading={false} className="p-0">
        <div className="bg-gray-100 dark:bg-gray-800/50 p-3 rounded border border-gray-300 dark:border-gray-600">
          <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <div className="flex items-center justify-between mb-2">
              <strong className="text-sm text-gray-800 dark:text-gray-200">
                Tool Response ID:{" "}
                <span
                  className="p-1 mx-1 rounded cursor-pointer hover:opacity-70 hover:underline bg-gray-200/70 dark:bg-gray-700/70"
                  onClick={() => copyToClipboard(String(chat.tool_call_id))}
                >
                  {chat.tool_call_id}
                </span>
              </strong>
              <CollapsibleTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="ml-2 opacity-100"
                >
                  <ChevronsUpDownIcon className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                  <span className="sr-only">Toggle</span>
                </Button>
              </CollapsibleTrigger>
            </div>
            <CollapsibleContent>
              <div className="text-sm">
                <pre className="whitespace-pre-wrap font-sans text-gray-900 dark:text-gray-100 break-all overflow-wrap-anywhere overflow-x-auto">
                  {chat.content as string}
                </pre>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </ChatBubbleMessage>
    </ChatBubble>
  );
}

interface TTSProps {
  chat: ChatStoreMessage;
}
interface TTSPlayProps {
  chat: ChatStoreMessage;
}
export function TTSPlay(props: TTSPlayProps) {
  const src = useMemo(() => {
    if (props.chat.audio instanceof Blob) {
      return URL.createObjectURL(props.chat.audio);
    }
    return "";
  }, [props.chat.audio]);

  if (props.chat.hide) {
    return <></>;
  }
  if (props.chat.audio instanceof Blob) {
    return <audio className="w-64" src={src} controls />;
  }
  return <></>;
}
function TTSButton(props: TTSProps) {
  const [generating, setGenerating] = useState(false);
  const { chatStore, setChatStore } = useContext(AppChatStoreContext);

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => {
        const api = chatStore.tts_api;
        const api_key = chatStore.tts_key;
        const model = "tts-1";
        const input = getMessageText(props.chat);
        const voice = chatStore.tts_voice;

        const body: Record<string, any> = {
          model,
          input,
          voice,
          response_format: chatStore.tts_format || "mp3",
        };
        if (chatStore.tts_speed_enabled) {
          body["speed"] = chatStore.tts_speed;
        }

        setGenerating(true);

        fetch(api, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${api_key}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        })
          .then((response) => response.blob())
          .then((blob) => {
            // update price
            const cost = (input.length * 0.015) / 1000;
            chatStore.cost += cost;
            addTotalCost(cost);
            setChatStore({ ...chatStore });

            // save blob
            props.chat.audio = blob;
            setChatStore({ ...chatStore });

            const url = URL.createObjectURL(blob);
            const audio = new Audio(url);
            audio.play();
          })
          .finally(() => {
            setGenerating(false);
          });
      }}
    >
      {generating ? (
        <LoaderCircleIcon className="h-4 w-4 animate-spin" />
      ) : (
        <AudioLinesIcon className="h-4 w-4" />
      )}
    </Button>
  );
}

export default function Message(props: { messageIndex: number }) {
  const { messageIndex } = props;
  const { chatStore, setChatStore } = useContext(AppChatStoreContext);

  const chat = chatStore.history[messageIndex];
  const [showEdit, setShowEdit] = useState(false);
  const { defaultRenderMD } = useContext(AppContext);
  const [renderMarkdown, setRenderWorkdown] = useState(defaultRenderMD);
  const [renderColor, setRenderColor] = useState(false);

  useEffect(() => {
    setRenderWorkdown(defaultRenderMD);
  }, [defaultRenderMD]);

  const { toast } = useToast();
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        description: <Tr>Message copied to clipboard!</Tr>,
      });
    } catch (err) {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand("copy");
        toast({
          description: <Tr>Message copied to clipboard!</Tr>,
        });
      } catch (err) {
        toast({
          description: <Tr>Failed to copy to clipboard</Tr>,
        });
      }
      document.body.removeChild(textArea);
    }
  };

  return (
    <>
      {chatStore.postBeginIndex !== 0 &&
        !chatStore.history[messageIndex].hide &&
        chatStore.postBeginIndex ===
          chatStore.history.slice(0, messageIndex).filter(({ hide }) => !hide)
            .length && (
          <div className="flex items-center relative justify-center">
            <hr className="w-full h-px my-4 border-0" />
            <span className="absolute px-3 rounded p-1">
              Above messages are "forgotten"
            </span>
          </div>
        )}
      {chat.role === "assistant" ? (
        <div className="pb-4">
          {chat.reasoning_content ? (
            <Card className="bg-muted hover:bg-muted/80 mb-5 w-full">
              <Collapsible>
                <div className="flex items-center justify-between px-3 py-1">
                  <div className="flex items-center">
                    <h4 className="font-semibold text-sm">
                      Think Content of {chat.response_model_name}
                    </h4>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <LightBulbIcon className="h-3 w-3 text-gray-500" />
                        <span className="sr-only">Toggle</span>
                      </Button>
                    </CollapsibleTrigger>
                  </div>
                </div>
                <CollapsibleContent className="ml-5 text-gray-500 message-content p">
                  {chat.reasoning_content.trim()}
                </CollapsibleContent>
              </Collapsible>
            </Card>
          ) : null}
          <div>
            {chat.hide ? (
              <MessageHide chat={chat} />
            ) : typeof chat.content !== "string" ? (
              <MessageDetail chat={chat} renderMarkdown={renderMarkdown} />
            ) : chat.tool_calls ? (
              <MessageToolCall chat={chat} copyToClipboard={copyToClipboard} />
            ) : renderMarkdown ? (
              <Markdown
                remarkPlugins={[remarkMath, remarkGfm]}
                rehypePlugins={[rehypeKatex, rehypeHighlight]}
                disallowedElements={[
                  "script",
                  "iframe",
                  "object",
                  "embed",
                  "hr",
                ]}
                className={
                  "prose max-w-none break-words overflow-wrap-anywhere"
                }
                components={{
                  p: ({ children, node }: any) => {
                    if (node?.parent?.type === "listItem") {
                      return (
                        <span className="break-words whitespace-pre-wrap overflow-wrap-anywhere">
                          {children}
                        </span>
                      );
                    }
                    return (
                      <p className="break-words whitespace-pre-wrap overflow-wrap-anywhere">
                        {children}
                      </p>
                    );
                  },
                  code: ({ children }: any) => (
                    <code className="break-all whitespace-pre-wrap">
                      {children}
                    </code>
                  ),
                  pre: ({ children }: any) => (
                    <pre className="break-words whitespace-pre-wrap overflow-x-auto">
                      {children}
                    </pre>
                  ),
                }}
              >
                {getMessageText(chat)}
              </Markdown>
            ) : (
              <div className="message-content max-w-full md:max-w-[100%]">
                {chat.content &&
                  (chat.logprobs && renderColor
                    ? chat.logprobs.content
                        .filter((c) => c.token)
                        .map((c) => (
                          <div
                            style={{
                              backgroundColor: logprobToColor(c.logprob),
                              display: "inline",
                            }}
                          >
                            {c.token}
                          </div>
                        ))
                    : getMessageText(chat))}
              </div>
            )}
            <TTSPlay chat={chat} />
          </div>
          <div className="flex md:opacity-0 hover:opacity-100 transition-opacity">
            <ChatBubbleAction
              icon={
                chat.hide ? (
                  <MessageSquarePlusIcon className="size-4" />
                ) : (
                  <MessageSquareOffIcon className="size-4" />
                )
              }
              onClick={() => {
                chatStore.history[messageIndex].hide =
                  !chatStore.history[messageIndex].hide;
                chatStore.totalTokens = 0;
                for (const i of chatStore.history
                  .filter(({ hide }) => !hide)
                  .slice(chatStore.postBeginIndex)
                  .map(({ token }) => token)) {
                  chatStore.totalTokens += i;
                }
                setChatStore({ ...chatStore });
              }}
            />
            <ChatBubbleAction
              icon={<PencilIcon className="size-4" />}
              onClick={() => setShowEdit(true)}
            />
            <ChatBubbleAction
              icon={<ClipboardIcon className="size-4" />}
              onClick={() => copyToClipboard(getMessageText(chat))}
            />
            {chatStore.tts_api && chatStore.tts_key && (
              <TTSButton chat={chat} />
            )}
          </div>
        </div>
      ) : (
        <ChatBubble variant="sent" className="flex-row-reverse">
          <ChatBubbleMessage isLoading={false}>
            {chat.hide ? (
              <MessageHide chat={chat} />
            ) : typeof chat.content !== "string" ? (
              <MessageDetail chat={chat} renderMarkdown={renderMarkdown} />
            ) : chat.tool_calls ? (
              <MessageToolCall chat={chat} copyToClipboard={copyToClipboard} />
            ) : chat.role === "tool" ? (
              <MessageToolResp chat={chat} copyToClipboard={copyToClipboard} />
            ) : renderMarkdown ? (
              <Markdown
                remarkPlugins={[remarkMath, remarkGfm]}
                rehypePlugins={[rehypeKatex, rehypeHighlight]}
                className={"max-w-none break-words overflow-wrap-anywhere"}
                components={{
                  p: ({ children, node }: any) => {
                    if (node?.parent?.type === "listItem") {
                      return (
                        <span className="break-words whitespace-pre-wrap overflow-wrap-anywhere">
                          {children}
                        </span>
                      );
                    }
                    return (
                      <p className="break-words whitespace-pre-wrap overflow-wrap-anywhere">
                        {children}
                      </p>
                    );
                  },
                  code: ({ children }: any) => (
                    <code className="break-all whitespace-pre-wrap">
                      {children}
                    </code>
                  ),
                  pre: ({ children }: any) => (
                    <pre className="break-words whitespace-pre-wrap overflow-x-auto">
                      {children}
                    </pre>
                  ),
                }}
              >
                {getMessageText(chat)}
              </Markdown>
            ) : (
              <div className="message-content">
                {chat.content &&
                  (chat.logprobs && renderColor
                    ? chat.logprobs.content
                        .filter((c) => c.token)
                        .map((c) => (
                          <div
                            style={{
                              backgroundColor: logprobToColor(c.logprob),
                              display: "inline",
                            }}
                          >
                            {c.token}
                          </div>
                        ))
                    : getMessageText(chat))}
              </div>
            )}
            <TTSPlay chat={chat} />
          </ChatBubbleMessage>
          <ChatBubbleActionWrapper>
            <ChatBubbleAction
              icon={
                chat.hide ? (
                  <MessageSquarePlusIcon className="size-4" />
                ) : (
                  <MessageSquareOffIcon className="size-4" />
                )
              }
              onClick={() => {
                chatStore.history[messageIndex].hide =
                  !chatStore.history[messageIndex].hide;
                chatStore.totalTokens = 0;
                for (const i of chatStore.history
                  .filter(({ hide }) => !hide)
                  .slice(chatStore.postBeginIndex)
                  .map(({ token }) => token)) {
                  chatStore.totalTokens += i;
                }
                setChatStore({ ...chatStore });
              }}
            />
            <ChatBubbleAction
              icon={<PencilIcon className="size-4" />}
              onClick={() => setShowEdit(true)}
            />
            <ChatBubbleAction
              icon={<ClipboardIcon className="size-4" />}
              onClick={() => copyToClipboard(getMessageText(chat))}
            />
            {chatStore.tts_api && chatStore.tts_key && (
              <TTSButton chat={chat} />
            )}
          </ChatBubbleActionWrapper>
        </ChatBubble>
      )}
      <EditMessage showEdit={showEdit} setShowEdit={setShowEdit} chat={chat} />
      {chatStore.develop_mode && (
        <div
          className={`flex flex-wrap items-center gap-2 mt-2 ${
            chat.role !== "assistant" ? "justify-end" : ""
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="text-sm">token</span>
            <input
              type="number"
              value={chat.token}
              className="h-8 w-16 rounded-md border border-input bg-background px-2 text-sm"
              readOnly
            />
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-sm opacity-70 hover:opacity-100 h-8 w-8"
              onClick={() => {
                chatStore.history.splice(messageIndex, 1);
                chatStore.postBeginIndex = Math.max(
                  chatStore.postBeginIndex - 1,
                  0
                );
                chatStore.totalTokens = 0;
                for (const i of chatStore.history
                  .filter(({ hide }) => !hide)
                  .slice(chatStore.postBeginIndex)
                  .map(({ token }) => token)) {
                  chatStore.totalTokens += i;
                }
                setChatStore({ ...chatStore });
              }}
            >
              <XMarkIcon className="size-4" />
            </button>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-primary"
                checked={chat.example}
                onChange={() => {
                  chat.example = !chat.example;
                  setChatStore({ ...chatStore });
                }}
              />
              <span className="text-sm font-medium">
                <Tr>example</Tr>
              </span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-primary"
                checked={renderMarkdown}
                onChange={() => setRenderWorkdown(!renderMarkdown)}
              />
              <span className="text-sm font-medium">
                <Tr>render</Tr>
              </span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-primary"
                checked={renderColor}
                onChange={() => setRenderColor(!renderColor)}
              />
              <span className="text-sm font-medium">
                <Tr>color</Tr>
              </span>
            </label>
            {chat.response_model_name && (
              <>
                <span className="opacity-50">{chat.response_model_name}</span>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
