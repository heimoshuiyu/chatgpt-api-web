import { Tr, langCodeContext, LANG_OPTIONS } from "./translate";
import { useState, useEffect, StateUpdater } from "preact/hooks";
import { ChatStore, ChatStoreMessage } from "./app";
import { calculate_token_length, getMessageText } from "./chatgpt";
import Markdown from "preact-markdown";
import TTSButton, { TTSPlay } from "./tts";
import { MessageHide } from "./messageHide";
import { MessageDetail } from "./messageDetail";
import { MessageToolCall } from "./messageToolCall";
import { MessageToolResp } from "./messageToolResp";
import { EditMessage } from "./editMessage";

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
  update_total_tokens: () => void;
}

export default function Message(props: Props) {
  const { chatStore, messageIndex, setChatStore } = props;
  const chat = chatStore.history[messageIndex];
  const [showEdit, setShowEdit] = useState(false);
  const [showCopiedHint, setShowCopiedHint] = useState(false);
  const [renderMarkdown, setRenderWorkdown] = useState(false);
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
      🗑️
    </button>
  );
  const CopiedHint = () => (
    <span
      className={
        "bg-purple-400 p-1 rounded shadow-md absolute z-20 left-1/2 top-3/4 transform -translate-x-1/2 -translate-y-1/2"
      }
    >
      {Tr("Message copied to clipboard!")}
    </span>
  );

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setShowCopiedHint(true);
    setTimeout(() => setShowCopiedHint(false), 1000);
  };

  const CopyIcon = ({ textToCopy }: { textToCopy: string }) => {
    return (
      <>
        <button
          onClick={() => {
            copyToClipboard(textToCopy);
          }}
        >
          📋
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
            <hr className="w-full h-px my-4 border-0 bg-slate-800 dark:bg-white" />
            <span className="absolute px-3 bg-slate-800 text-white rounded p-1 dark:bg-white dark:text-black">
              Above messages are "forgotten"
            </span>
          </div>
        )}
      <div
        className={`flex ${
          chat.role === "assistant" ? "justify-start" : "justify-end"
        }`}
      >
        <div>
          <div
            className={`w-fit p-2 rounded my-2 ${
              chat.role === "assistant"
                ? "bg-white dark:bg-gray-700 dark:text-white"
                : "bg-green-400"
            } ${chat.hide ? "opacity-50" : ""}`}
          >
            {chat.hide ? (
              <MessageHide chat={chat} />
            ) : typeof chat.content !== "string" ? (
              <MessageDetail chat={chat} renderMarkdown={renderMarkdown} />
            ) : chat.tool_calls ? (
              <MessageToolCall chat={chat} copyToClipboard={copyToClipboard} />
            ) : chat.role === "tool" ? (
              <MessageToolResp chat={chat} copyToClipboard={copyToClipboard} />
            ) : renderMarkdown ? (
              // @ts-ignore
              <Markdown markdown={getMessageText(chat)} />
            ) : (
              <div className="message-content">
                {
                  // only show when content is string or list of message
                  // this check is used to avoid rendering tool call
                  chat.content && getMessageText(chat)
                }
              </div>
            )}
            <hr className="mt-2" />
            <TTSPlay chat={chat} />
            <div className="w-full flex justify-between">
              <DeleteIcon />
              <button onClick={() => setShowEdit(true)}>🖋</button>
              {chatStore.tts_api && chatStore.tts_key && (
                <TTSButton
                  chatStore={chatStore}
                  chat={chat}
                  setChatStore={setChatStore}
                />
              )}
              <CopyIcon textToCopy={getMessageText(chat)} />
            </div>
          </div>
          {showEdit && (
            <EditMessage
              setShowEdit={setShowEdit}
              chat={chat}
              chatStore={chatStore}
              setChatStore={setChatStore}
            />
          )}
          {showCopiedHint && <CopiedHint />}
          {chatStore.develop_mode && (
            <div>
              <span className="dark:text-white">token</span>
              <input
                value={chat.token}
                className="w-20"
                onChange={(event: any) => {
                  chat.token = parseInt(event.target.value);
                  props.update_total_tokens();
                  setChatStore({ ...chatStore });
                }}
              />
              <button
                onClick={() => {
                  chatStore.history.splice(messageIndex, 1);
                  chatStore.postBeginIndex = Math.max(
                    chatStore.postBeginIndex - 1,
                    0
                  );
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
                ❌
              </button>
              <span
                onClick={(event: any) => {
                  chat.example = !chat.example;
                  setChatStore({ ...chatStore });
                }}
              >
                <label className="dark:text-white">{Tr("example")}</label>
                <input type="checkbox" checked={chat.example} />
              </span>
              <span
                onClick={(event: any) => setRenderWorkdown(!renderMarkdown)}
              >
                <label className="dark:text-white">{Tr("render")}</label>
                <input type="checkbox" checked={renderMarkdown} />
              </span>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
