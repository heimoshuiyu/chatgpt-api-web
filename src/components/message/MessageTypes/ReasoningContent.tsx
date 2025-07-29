import { LightBulbIcon } from "@heroicons/react/24/outline";
import { ChatStoreMessage } from "@/types/chatstore";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface ReasoningContentProps {
  chat: ChatStoreMessage;
}

export function ReasoningContent({ chat }: ReasoningContentProps) {
  if (!chat.reasoning_content) {
    return null;
  }

  return (
    <Card className="bg-muted hover:bg-muted/80 mb-5 w-full">
      <Collapsible>
        <div className="flex items-center justify-between px-3 py-1">
          <div className="flex items-center">
            <h4 className="font-semibold text-sm">
              Think Content of {chat.response_model_name}
            </h4>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm">
                <LightBulbIcon className="h-3 w-3 text-gray-500" />
                <span className="sr-only">Toggle</span>
              </Button>
            </CollapsibleTrigger>
          </div>
        </div>
        <CollapsibleContent className="ml-5 text-gray-500 message-content p">
          {chat.reasoning_content.trim()}
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
