import { useContext } from "react";
import { ChatStoreMessage } from "@/types/chatstore";
import { AppChatStoreContext } from "@/pages/App";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { getMessageText } from "@/chatgpt";
import {
  ChatBubbleAction,
  ChatBubbleActionWrapper,
} from "@/components/ui/chat/chat-bubble";
import {
  ClipboardIcon,
  PencilIcon,
  MessageSquareOffIcon,
  MessageSquarePlusIcon,
} from "lucide-react";
import { TTSButton } from "./MessageTTS";

interface MessageActionsProps {
  chat: ChatStoreMessage;
  messageIndex: number;
  setShowEdit: (show: boolean) => void;
  isAssistant?: boolean;
}

export function MessageActions({
  chat,
  messageIndex,
  setShowEdit,
  isAssistant = false,
}: MessageActionsProps) {
  const { chatStore, setChatStore } = useContext(AppChatStoreContext);
  const copyToClipboard = useCopyToClipboard();

  const handleHideToggle = () => {
    chatStore.history[messageIndex].hide =
      !chatStore.history[messageIndex].hide;
    chatStore.totalTokens = 0;
    for (const i of chatStore.history
      .filter(({ hide }) => !hide)
      .slice(chatStore.postBeginIndex)
      .map(({ token }) => token)) {
      chatStore.totalTokens += i;
    }
    setChatStore({ ...chatStore });
  };

  const actions = (
    <>
      <ChatBubbleAction
        icon={
          chat.hide ? (
            <MessageSquarePlusIcon className="size-4" />
          ) : (
            <MessageSquareOffIcon className="size-4" />
          )
        }
        onClick={handleHideToggle}
      />
      <ChatBubbleAction
        icon={<PencilIcon className="size-4" />}
        onClick={() => setShowEdit(true)}
      />
      <ChatBubbleAction
        icon={<ClipboardIcon className="size-4" />}
        onClick={() => copyToClipboard(getMessageText(chat))}
      />
      <TTSButton chat={chat} messageIndex={messageIndex} />
    </>
  );

  if (isAssistant) {
    return (
      <div className="flex md:opacity-0 hover:opacity-100 transition-opacity">
        {actions}
      </div>
    );
  }

  return <ChatBubbleActionWrapper>{actions}</ChatBubbleActionWrapper>;
}
