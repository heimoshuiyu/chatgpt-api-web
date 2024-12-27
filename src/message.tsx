import { XMarkIcon } from "@heroicons/react/24/outline";
import Markdown from "react-markdown";
import { useState } from "react";

import { Tr, langCodeContext, LANG_OPTIONS } from "@/translate";
import { ChatStore, ChatStoreMessage } from "@/types/chatstore";
import { calculate_token_length, getMessageText } from "@/chatgpt";
import TTSButton, { TTSPlay } from "@/tts";
import { MessageHide } from "@/messageHide";
import { MessageDetail } from "@/messageDetail";
import { MessageToolCall } from "@/messageToolCall";
import { MessageToolResp } from "@/messageToolResp";
import { EditMessage } from "@/editMessage";
import logprobToColor from "@/logprob";
import {
  ChatBubble,
  ChatBubbleAvatar,
  ChatBubbleMessage,
  ChatBubbleAction,
  ChatBubbleActionWrapper,
} from "@/components/ui/chat/chat-bubble";
import { useToast } from "@/hooks/use-toast";
import {
  ClipboardIcon,
  PencilIcon,
  MessageSquareOffIcon,
  MessageSquarePlusIcon,
} from "lucide-react";

export const isVailedJSON = (str: string): boolean => {
  try {
    JSON.parse(str);
  } catch (e) {
    return false;
  }
  return true;
};

interface Props {
  messageIndex: number;
  chatStore: ChatStore;
  setChatStore: (cs: ChatStore) => void;
}

export default function Message(props: Props) {
  const { chatStore, messageIndex, setChatStore } = props;
  const chat = chatStore.history[messageIndex];
  const [showEdit, setShowEdit] = useState(false);
  const [showCopiedHint, setShowCopiedHint] = useState(false);
  const [renderMarkdown, setRenderWorkdown] = useState(false);
  const [renderColor, setRenderColor] = useState(false);
  const DeleteIcon = () => (
    <button
      onClick={() => {
        chatStore.history[messageIndex].hide =
          !chatStore.history[messageIndex].hide;

        //chatStore.totalTokens =
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
      Delete
    </button>
  );
  const CopiedHint = () => (
    <div role="alert" className="alert">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        className="stroke-info h-6 w-6 shrink-0"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        ></path>
      </svg>
      <span>{Tr("Message copied to clipboard!")}</span>
    </div>
  );

  const { toast } = useToast();
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        description: Tr("Message copied to clipboard!"),
      });
    } catch (err) {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand("copy");
        toast({
          description: Tr("Message copied to clipboard!"),
        });
      } catch (err) {
        toast({
          description: Tr("Failed to copy to clipboard"),
        });
      }
      document.body.removeChild(textArea);
    }
  };

  const CopyIcon = ({ textToCopy }: { textToCopy: string }) => {
    return (
      <>
        <button
          onClick={() => {
            copyToClipboard(textToCopy);
          }}
        >
          Copy
        </button>
      </>
    );
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
      <ChatBubble
        variant={chat.role === "assistant" ? "received" : "sent"}
        className={chat.role !== "assistant" ? "flex-row-reverse" : ""}
      >
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
            // [TODO] It is happening https://github.com/remarkjs/react-markdown/pull/879
            // <Markdown>{getMessageText(chat)}</Markdown>
            <></>
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
            <TTSButton
              chatStore={chatStore}
              chat={chat}
              setChatStore={setChatStore}
            />
          )}
          <TTSPlay chat={chat} />
        </ChatBubbleActionWrapper>
      </ChatBubble>
      <EditMessage
        showEdit={showEdit}
        setShowEdit={setShowEdit}
        chat={chat}
        chatStore={chatStore}
        setChatStore={setChatStore}
      />
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
              <span className="text-sm font-medium">{Tr("example")}</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-primary"
                checked={renderMarkdown}
                onChange={() => setRenderWorkdown(!renderMarkdown)}
              />
              <span className="text-sm font-medium">{Tr("render")}</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-primary"
                checked={renderColor}
                onChange={() => setRenderColor(!renderColor)}
              />
              <span className="text-sm font-medium">{Tr("color")}</span>
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
