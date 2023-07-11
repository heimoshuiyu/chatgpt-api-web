import { useState } from "preact/hooks";
import { ChatStore } from "./app";
import { calculate_token_length } from "./chatgpt";

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
      Message Copied to clipboard!
    </span>
  );

  const CopyIcon = () => {
    return (
      <>
        <button
          onClick={() => {
            navigator.clipboard.writeText(chat.content);
            setShowCopiedHint(true);
            setTimeout(() => setShowCopiedHint(false), 1000);
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
            <p className="message-content">
              {chat.hide
                ? chat.content.split("\n")[0].slice(0, 16) + "... (deleted)"
                : chat.content}
            </p>
            <div className="w-full flex justify-between">
              <DeleteIcon />
              <CopyIcon />
            </div>
          </div>
          {showCopiedHint && <CopiedHint />}
          {chatStore.develop_mode && (
            <div>
              token{" "}
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
              <button onClick={() => setShowEdit(true)}>🖋</button>
              {showEdit && (
                <div
                  className={
                    "absolute bg-black bg-opacity-50 w-full h-full top-0 left-0 pt-5 px-5 pb-20 rounded z-10"
                  }
                >
                  <textarea
                    className={"relative w-full h-full"}
                    value={chat.content}
                    onChange={(event: any) => {
                      chat.content = event.target.value;
                      chat.token = calculate_token_length(chat.content);
                      setChatStore({ ...chatStore });
                    }}
                  ></textarea>
                  <div className={"w-full flex justify-center"}>
                    <button
                      className={"m-2 p-1 rounded bg-green-500"}
                      onClick={() => {
                        setShowEdit(false);
                      }}
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
              <span>
                <label>example</label>
                <input
                  type="checkbox"
                  checked={chat.example}
                  onChange={(event: any) => {
                    chat.example = event.target.checked;
                    setChatStore({ ...chatStore });
                  }}
                />
              </span>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
