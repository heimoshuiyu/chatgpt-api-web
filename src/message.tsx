import { ChatStore } from "./app";

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
    <div
      className={`flex ${
        chat.role === "assistant" ? "justify-start" : "justify-end"
      }`}
    >
      <div
        className={`relative w-fit p-2 rounded my-2 ${
          chat.role === "assistant"
            ? "bg-white dark:bg-gray-700 dark:text-white"
            : "bg-green-400"
        }`}
      >
        <p className="message-content">{chat.content}</p>
        <DeleteIcon />
      </div>
    </div>
  );
}
