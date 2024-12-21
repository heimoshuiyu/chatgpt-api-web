import { ChatStoreMessage } from "@/types/chatstore";
import { getMessageText } from "@/chatgpt";
import { Badge } from "./components/ui/badge";

interface Props {
  chat: ChatStoreMessage;
}

export function MessageHide({ chat }: Props) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <span>{getMessageText(chat).split("\n")[0].slice(0, 18)} ...</span>
      <Badge variant="secondary">Removed from context</Badge>
    </div>
  );
}
