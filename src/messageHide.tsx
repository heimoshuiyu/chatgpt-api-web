import { ChatStoreMessage } from "@/types/chatstore";
import { getMessageText } from "@/chatgpt";

interface Props {
  chat: ChatStoreMessage;
}

export function MessageHide({ chat }: Props) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <span>{getMessageText(chat).split("\n")[0].slice(0, 18)} ...</span>
      <span className="rounded-md bg-secondary px-2 py-1 text-xs">
        Removed from context
      </span>
    </div>
  );
}
