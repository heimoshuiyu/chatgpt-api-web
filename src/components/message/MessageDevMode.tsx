import { useContext } from "react";
import { ChatStoreMessage } from "@/types/chatstore";
import { AppChatStoreContext } from "@/pages/App";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { Tr } from "@/translate";

interface MessageDevModeProps {
  chat: ChatStoreMessage;
  messageIndex: number;
  renderMarkdown: boolean;
  setRenderMarkdown: (render: boolean) => void;
  renderColor: boolean;
  setRenderColor: (render: boolean) => void;
}

export function MessageDevMode({
  chat,
  messageIndex,
  renderMarkdown,
  setRenderMarkdown,
  renderColor,
  setRenderColor,
}: MessageDevModeProps) {
  const { chatStore, setChatStore } = useContext(AppChatStoreContext);

  if (!chatStore.develop_mode) {
    return null;
  }

  return (
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
            onChange={() => setRenderMarkdown(!renderMarkdown)}
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
  );
}
