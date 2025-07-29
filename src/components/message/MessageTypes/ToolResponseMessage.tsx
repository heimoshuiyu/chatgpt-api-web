import { useState } from "react";
import { ChatStoreMessage } from "@/types/chatstore";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import {
  ChatBubble,
  ChatBubbleMessage,
} from "@/components/ui/chat/chat-bubble";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronsUpDownIcon } from "lucide-react";

interface ToolRespondMessageProps {
  chat: ChatStoreMessage;
}

export function ToolResponseMessage({ chat }: ToolRespondMessageProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const copyToClipboard = useCopyToClipboard();

  return (
    <ChatBubble
      variant="sent"
      className="flex-row-reverse border-gray-200 dark:border-gray-800 !bg-gray-50 dark:!bg-gray-900/40"
    >
      <ChatBubbleMessage isLoading={false} className="p-0">
        <div className="bg-gray-100 dark:bg-gray-800/50 p-3 rounded border border-gray-300 dark:border-gray-600">
          <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <div className="flex items-center justify-between mb-2">
              <strong className="text-sm text-gray-800 dark:text-gray-200">
                Tool Response ID:{" "}
                <span
                  className="p-1 mx-1 rounded cursor-pointer hover:opacity-70 hover:underline bg-gray-200/70 dark:bg-gray-700/70"
                  onClick={() => copyToClipboard(String(chat.tool_call_id))}
                >
                  {chat.tool_call_id}
                </span>
              </strong>
              <CollapsibleTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="ml-2 opacity-100"
                >
                  <ChevronsUpDownIcon className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                  <span className="sr-only">Toggle</span>
                </Button>
              </CollapsibleTrigger>
            </div>
            <CollapsibleContent>
              <div className="text-sm">
                <pre className="whitespace-pre-wrap font-sans text-gray-900 dark:text-gray-100 break-all overflow-wrap-anywhere overflow-x-auto">
                  {chat.content as string}
                </pre>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </ChatBubbleMessage>
    </ChatBubble>
  );
}
