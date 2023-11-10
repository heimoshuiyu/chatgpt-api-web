import { ChatStoreMessage } from "./app";

interface Props {
  chat: ChatStoreMessage;
  copyToClipboard: (text: string) => void;
}
export function MessageToolResp({ chat, copyToClipboard }: Props) {
  return (
    <div className="message-content">
      <div className="bg-blue-300 dark:bg-blue-800 p-1 rounded my-1">
        <strong>
          Tool Response ID:{" "}
          <span
            className="p-1 m-1 rounded cursor-pointer hover:opacity-50 hover:underline"
            onClick={() => copyToClipboard(String(chat.tool_call_id))}
          >
            {chat.tool_call_id}
          </span>
        </strong>
        <p>{chat.content}</p>
      </div>
    </div>
  );
}
