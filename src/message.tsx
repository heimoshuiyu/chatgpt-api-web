import { Tr, langCodeContext, LANG_OPTIONS } from "./translate";
import { useState, useEffect, StateUpdater } from "preact/hooks";
import { ChatStore, ChatStoreMessage } from "./app";
import { calculate_token_length } from "./chatgpt";
import Markdown from "preact-markdown";

interface EditMessageProps {
  chat: ChatStoreMessage;
  chatStore: ChatStore;
  setShowEdit: StateUpdater<boolean>;
  setChatStore: (cs: ChatStore) => void;
}

function EditMessage(props: EditMessageProps) {
  const { setShowEdit, chat, setChatStore, chatStore } = props;
  useEffect(() => {
    const handleKeyPress = (event: any) => {
      if (event.keyCode === 27) {
        // keyCode for ESC key is 27
        setShowEdit(false);
      }
    };

    document.addEventListener("keydown", handleKeyPress);

    return () => {
      document.removeEventListener("keydown", handleKeyPress);
    };
  }, []); // The empty dependency array ensures that the effect runs only once

  return (
    <div
      className={
        "absolute bg-black bg-opacity-50 w-full h-full top-0 left-0 pt-5 px-5 pb-20 rounded z-10"
      }
      onClick={() => setShowEdit(false)}
    >
      <div className="w-full h-full z-20">
        <textarea
          className={"w-full h-full"}
          value={chat.content}
          onClick={(event: any) => {
            event.stopPropagation();
          }}
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
            {Tr("Close")}
          </button>
        </div>
      </div>
    </div>
  );
}

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
            <p className={renderMarkdown ? "" : "message-content"}>
              {chat.hide ? (
                chat.content.split("\n")[0].slice(0, 16) + "... (deleted)"
              ) : renderMarkdown ? (
                // @ts-ignore
                <Markdown markdown={chat.content} />
              ) : (
                chat.content
              )}
            </p>
            <hr className="mt-2" />
            <div className="w-full flex justify-between">
              <DeleteIcon />
              <button onClick={() => setShowEdit(true)}>🖋</button>
              <CopyIcon />
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
