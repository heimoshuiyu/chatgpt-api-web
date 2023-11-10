import { ChatStoreMessage } from "./app";

interface Props {
  chat: ChatStoreMessage;
  copyToClipboard: (text: string) => void;
}
export function MessageToolCall({ chat, copyToClipboard }: Props) {
  return (
    <div className="message-content">
      {chat.tool_calls?.map((tool_call) => (
        <div className="bg-blue-300 dark:bg-blue-800 p-1 rounded my-1">
          <strong>
            Tool Call ID:{" "}
            <span
              className="p-1 m-1 rounded cursor-pointer hover:opacity-50 hover:underline"
              onClick={() => copyToClipboard(String(tool_call.id))}
            >
              {tool_call?.id}
            </span>
          </strong>
          <p>Type: {tool_call?.type}</p>
          <p>
            Function:
            <span
              className="p-1 m-1 rounded cursor-pointer hover:opacity-50 hover:underline"
              onClick={() => copyToClipboard(tool_call.function.name)}
            >
              {tool_call.function.name}
            </span>
          </p>
          <p>
            Arguments:
            <span
              className="p-1 m-1 rounded cursor-pointer hover:opacity-50 hover:underline"
              onClick={() => copyToClipboard(tool_call.function.arguments)}
            >
              {tool_call.function.arguments}
            </span>
          </p>
        </div>
      ))}
    </div>
  );
}
