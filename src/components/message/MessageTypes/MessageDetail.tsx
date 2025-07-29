import { ChatStoreMessage } from "@/types/chatstore";
import { getMessageText } from "@/chatgpt";
import { MarkdownRenderer } from "../MessageRenderer";
import { HiddenMessage } from "./HiddenMessage";

interface MessageDetailProps {
  chat: ChatStoreMessage;
  renderMarkdown: boolean;
}

export function MessageDetail({ chat, renderMarkdown }: MessageDetailProps) {
  if (typeof chat.content === "string") {
    return <div></div>;
  }

  return (
    <div>
      {chat.content.map((mdt) =>
        mdt.type === "text" ? (
          chat.hide ? (
            <HiddenMessage text={mdt.text || ""} maxLength={16} />
          ) : renderMarkdown ? (
            <MarkdownRenderer content={mdt.text || ""} />
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
