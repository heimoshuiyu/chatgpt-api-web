import { ChatStoreMessage } from "@/types/chatstore";
import { getMessageText } from "@/chatgpt";

interface Props {
  chat: ChatStoreMessage;
}

export function MessageHide({ chat }: Props) {
  return <div>{getMessageText(chat).split("\n")[0].slice(0, 18)} ...</div>;
}
