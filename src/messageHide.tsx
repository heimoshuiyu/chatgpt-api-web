import { ChatStoreMessage } from "./app";
import { getMessageText } from "./chatgpt";

interface Props {
  chat: ChatStoreMessage;
}

export function MessageHide({ chat }: Props) {
  return (
    <div>{getMessageText(chat).split("\n")[0].slice(0, 18)} ... (deleted)</div>
  );
}
