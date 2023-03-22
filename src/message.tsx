import { ChatStore } from "./app";

interface Props {
  messageIndex: number;
  chatStore: ChatStore;
  setChatStore: (cs: ChatStore) => void;
}
export default function Message(props: Props) {
  const { chatStore, messageIndex, setChatStore } = props;
  const chat = chatStore.history[messageIndex];
  const pClassName =
    chat.role === "assistant"
      ? "message-content p-2 rounded bg-white my-2 text-left dark:bg-gray-700 dark:text-white"
      : "message-content p-2 rounded bg-green-400 my-2 text-right";
  const iconClassName =
    chat.role === "user"
      ? "absolute bottom-0 left-0"
      : "absolute bottom-0 right-0";
  const DeleteIcon = () => (
    <button
      className={iconClassName}
      onClick={() => {
        if (
          confirm(
            `Are you sure to delete this message?\n${chat.content.slice(
              0,
              39
            )}...`
          )
        ) {
          chatStore.history.splice(messageIndex, 1);
          chatStore.postBeginIndex = Math.max(chatStore.postBeginIndex - 1, 0);
          setChatStore({ ...chatStore });
        }
      }}
    >
      🗑️
    </button>
  );
  return (
    <div className="relative">
      <p className={pClassName}>{chat.content}</p>
      <DeleteIcon />
    </div>
  );
}
