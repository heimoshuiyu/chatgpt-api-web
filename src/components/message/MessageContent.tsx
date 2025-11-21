import { ChatStoreMessage } from "@/types/chatstore";
import { getMessageText } from "@/chatgpt";
import { MarkdownRenderer } from "./MessageRenderer";
import { HiddenMessage } from "./MessageTypes/HiddenMessage";
import { MessageDetail } from "./MessageTypes/MessageDetail";
import { ToolCallMessage } from "./MessageTypes/ToolCallMessage";
import { ToolResponseMessage } from "./MessageTypes/ToolResponseMessage";
import { TTSPlay } from "./MessageTTS";
import logprobToColor from "@/utils/logprob";

interface MessageContentProps {
  chat: ChatStoreMessage;
  renderMarkdown: boolean;
  renderColor: boolean;
  messageIndex: number;
}

export function MessageContent({
  chat,
  renderMarkdown,
  renderColor,
  messageIndex,
}: MessageContentProps) {
  if (chat.hide) {
    return <HiddenMessage text={getMessageText(chat)} />;
  }

  if (typeof chat.content !== "string") {
    return (
      <>
        <MessageDetail chat={chat} renderMarkdown={renderMarkdown} />
        <TTSPlay chat={chat} messageIndex={messageIndex} />
      </>
    );
  }

  if (chat.tool_calls) {
    return (
      <>
        <ToolCallMessage chat={chat} />
        <TTSPlay chat={chat} messageIndex={messageIndex} />
      </>
    );
  }

  if (chat.role === "tool") {
    return (
      <>
        <ToolResponseMessage chat={chat} />
        <TTSPlay chat={chat} messageIndex={messageIndex} />
      </>
    );
  }

  if (renderMarkdown && chat.role === "assistant") {
    const MarkdownComponent = MarkdownRenderer;
    
    return (
      <>
        <MarkdownComponent
          content={getMessageText(chat)}
          disallowedElements={["script", "iframe", "object", "embed", "hr"]}
        />
        <TTSPlay chat={chat} messageIndex={messageIndex} />
      </>
    );
  }

  return (
    <>
      <div className="message-content max-w-full md:max-w-[100%]">
        {chat.content &&
          (chat.logprobs && renderColor
            ? chat.logprobs.content
                .filter((c) => c.token)
                .map((c) => (
                  <div
                    key={c.token}
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
      <TTSPlay chat={chat} messageIndex={messageIndex} />
    </>
  );
}
