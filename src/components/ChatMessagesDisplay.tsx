import React, { memo } from "react";
import { ChatStoreMessage } from "@/types/chatstore";
import Message from "@/components/MessageBubble";
import { StreamErrorDisplay } from "@/components/StreamErrorDisplay";
import { ChatMessageList } from "@/components/ui/chat/chat-message-list";
import {
  ChatBubble,
  ChatBubbleMessage,
  ChatBubbleActionWrapper,
  ChatBubbleAction,
} from "@/components/ui/chat/chat-bubble";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  InfoIcon,
  ScissorsIcon,
  CornerDownLeftIcon,
  CornerRightUpIcon,
  CornerLeftUpIcon,
  ArrowDownToDotIcon,
} from "lucide-react";
import { Tr } from "@/translate";
import VersionHint from "@/components/VersionHint";

const MessageComponent = memo(
  ({
    message,
    messageIndex,
  }: {
    message: ChatStoreMessage;
    messageIndex: number;
  }) => (
    <React.Fragment>
      <Message messageIndex={messageIndex} />
      {message.error && !message.hide && (
        <StreamErrorDisplay message={message} />
      )}
    </React.Fragment>
  )
);

interface ChatMessagesDisplayProps {
  chatStore: {
    history: ChatStoreMessage[];
    systemMessageContent: string;
    toolsString: string;
    postBeginIndex: number;
    develop_mode: boolean;
  };
  showGenerating: boolean;
  generatingMessage: string;
  showRetry: boolean;
  onNewChat: () => void;
  onCompletion: () => Promise<void>;
  onRegenerate: () => Promise<void>;
  onClearSystem: () => void;
  isCreatingChat: boolean;
}

export function ChatMessagesDisplay({
  chatStore,
  showGenerating,
  generatingMessage,
  showRetry,
  onNewChat,
  onCompletion,
  onRegenerate,
  onClearSystem,
  isCreatingChat,
}: ChatMessagesDisplayProps) {
  return (
    <ChatMessageList>
      {chatStore.history.length === 0 && (
        <Alert variant="default" className="my-3">
          <InfoIcon className="h-4 w-4" />
          <AlertTitle>
            <Tr>This is a new chat session, start by typing a message</Tr>
          </AlertTitle>
          <AlertDescription className="flex flex-col gap-1 mt-5">
            <div className="flex items-center gap-2">
              <CornerRightUpIcon className="h-4 w-4" />
              <span>
                <Tr>
                  Settings button located at the top right corner can be used to
                  change the settings of this chat
                </Tr>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <CornerLeftUpIcon className="h-4 w-4" />
              <span>
                <Tr>
                  'New' button located at the top left corner can be used to
                  create a new chat
                </Tr>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <ArrowDownToDotIcon className="h-4 w-4" />
              <span>
                <Tr>
                  All chat history and settings are stored in the local browser
                </Tr>
              </span>
            </div>
          </AlertDescription>
        </Alert>
      )}
      {chatStore.systemMessageContent.trim() && (
        <ChatBubble variant="received">
          <ChatBubbleMessage>
            <div className="flex flex-col gap-1">
              <div className="text-sm font-bold">System Prompt</div>
              <div className="cursor-pointer">
                {chatStore.systemMessageContent}
              </div>
            </div>
          </ChatBubbleMessage>
          <ChatBubbleActionWrapper>
            <ChatBubbleAction
              className="size-7"
              icon={<ScissorsIcon className="size-4" />}
              onClick={onClearSystem}
            />
          </ChatBubbleActionWrapper>
        </ChatBubble>
      )}
      {chatStore.history.map((message, messageIndex) => (
        <MessageComponent
          key={messageIndex}
          message={message}
          messageIndex={messageIndex}
        />
      ))}
      {showGenerating && (
        <ChatBubble variant="received">
          <ChatBubbleMessage isLoading>{generatingMessage}</ChatBubbleMessage>
        </ChatBubble>
      )}
      <p className="text-center">
        {chatStore.history.length > 0 && !showGenerating && (
          <Button
            variant="secondary"
            size="sm"
            className="m-2"
            disabled={showGenerating}
            onClick={onRegenerate}
          >
            <Tr>Re-Generate</Tr>
          </Button>
        )}
        {chatStore.history.length > 0 && !showGenerating && (
          <Button
            variant="secondary"
            size="sm"
            className="m-2"
            disabled={showGenerating || isCreatingChat}
            onClick={onNewChat}
          >
            {isCreatingChat ? "Creating..." : <Tr>New Chat</Tr>}
          </Button>
        )}
        {chatStore.develop_mode && chatStore.history.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            disabled={showGenerating}
            onClick={onCompletion}
          >
            <Tr>Completion</Tr>
          </Button>
        )}
      </p>
      {chatStore.postBeginIndex !== 0 && (
        <p className="p-2 my-2 text-center opacity-50 dark:text-white">
          <Alert variant="default">
            <InfoIcon className="h-4 w-4" />
            <AlertTitle>
              <Tr>Chat History Notice</Tr>
            </AlertTitle>
            <AlertDescription>
              <Tr>Info: chat history is too long, forget messages</Tr>:{" "}
              {chatStore.postBeginIndex}
            </AlertDescription>
          </Alert>
        </p>
      )}
      <VersionHint />
    </ChatMessageList>
  );
}
