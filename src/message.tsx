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
import logprobToColor from "./logprob";

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
    <div role="alert" class="alert">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        class="stroke-info h-6 w-6 shrink-0"
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
            className={`chat min-w-16 w-fit p-2 my-2 ${
              chat.role === "assistant" ? "chat-start" : "chat-end"
            } ${chat.hide ? "opacity-50" : ""}`}
          >
            <div
              className={`chat-bubble ${
                chat.role === "assistant"
                  ? renderColor
                    ? "chat-bubble-neutral"
                    : "chat-bubble-secondary"
                  : "chat-bubble-primary"
              }`}
            >
              {chat.hide ? (
                <MessageHide chat={chat} />
              ) : typeof chat.content !== "string" ? (
                <MessageDetail chat={chat} renderMarkdown={renderMarkdown} />
              ) : chat.tool_calls ? (
                <MessageToolCall
                  chat={chat}
                  copyToClipboard={copyToClipboard}
                />
              ) : chat.role === "tool" ? (
                <MessageToolResp
                  chat={chat}
                  copyToClipboard={copyToClipboard}
                />
              ) : renderMarkdown ? (
                // @ts-ignore
                <Markdown markdown={getMessageText(chat)} />
              ) : (
                <div className="message-content">
                  {
                    // only show when content is string or list of message
                    // this check is used to avoid rendering tool call
                    chat.content &&
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
                        : getMessageText(chat))
                  }
                </div>
              )}
            </div>
            <div class="chat-footer opacity-50 flex gap-x-2">
              <TTSPlay chat={chat} />
              <DeleteIcon />
              <button onClick={() => setShowEdit(true)}>Edit</button>
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
              <span onClick={(event: any) => setRenderColor(!renderColor)}>
                <label className="dark:text-white">{Tr("color")}</label>
                <input type="checkbox" checked={renderColor} />
              </span>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
