import { ChatStore } from "./app";
import { calculate_token_length } from "./chatgpt";

interface Props {
  messageIndex: number;
  chatStore: ChatStore;
  setChatStore: (cs: ChatStore) => void;
}
export default function Message(props: Props) {
  const { chatStore, messageIndex, setChatStore } = props;
  const chat = chatStore.history[messageIndex];
  const DeleteIcon = () => (
    <button
      className={`absolute bottom-0 ${
        chat.role === "user" ? "left-0" : "right-0"
      }`}
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
            className={`relative w-fit p-2 rounded my-2 ${
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
            <DeleteIcon />
          </div>
          {chatStore.develop_mode && (
            <div>
              token {chatStore.history[messageIndex].token}
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
            </div>
          )}
        </div>
      </div>
    </>
  );
}
