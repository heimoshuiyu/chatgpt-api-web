import { useContext, useState, useEffect } from "react";
import { ChatStoreMessage } from "@/types/chatstore";
import { AppChatStoreContext, AppContext } from "@/pages/App";
import { EditMessage } from "@/components/editMessage";
import {
  ChatBubble,
  ChatBubbleMessage,
} from "@/components/ui/chat/chat-bubble";
import {
  ReasoningContent,
  MessageActions,
  MessageDevMode,
  MessageContent,
} from "@/components/message";

export default function Message(props: { messageIndex: number }) {
  const { messageIndex } = props;
  const { chatStore } = useContext(AppChatStoreContext);
  const { defaultRenderMD } = useContext(AppContext);

  const chat = chatStore.history[messageIndex];
  const [showEdit, setShowEdit] = useState(false);
  const [renderMarkdown, setRenderMarkdown] = useState(defaultRenderMD);
  const [renderColor, setRenderColor] = useState(false);

  useEffect(() => {
    setRenderMarkdown(defaultRenderMD);
  }, [defaultRenderMD]);

  return (
    <>
      {chatStore.postBeginIndex !== 0 &&
        !chatStore.history[messageIndex].hide &&
        chatStore.postBeginIndex ===
          chatStore.history.slice(0, messageIndex).filter(({ hide }) => !hide)
            .length && (
          <div className="flex items-center relative justify-center">
            <hr className="w-full h-px my-4 border-0" />
            <span className="absolute px-3 rounded p-1">
              Above messages are "forgotten"
            </span>
          </div>
        )}

      {chat.role === "assistant" ? (
        <div className="pb-4">
          <ReasoningContent chat={chat} />
          <div>
            <MessageContent
              chat={chat}
              renderMarkdown={renderMarkdown}
              renderColor={renderColor}
              messageIndex={messageIndex}
            />
          </div>
          <MessageActions
            chat={chat}
            messageIndex={messageIndex}
            setShowEdit={setShowEdit}
            isAssistant={true}
          />
        </div>
      ) : (
        <ChatBubble variant="sent" className="flex-row-reverse">
          <ChatBubbleMessage isLoading={false}>
            <MessageContent
              chat={chat}
              renderMarkdown={renderMarkdown}
              renderColor={renderColor}
              messageIndex={messageIndex}
            />
          </ChatBubbleMessage>
          <MessageActions
            chat={chat}
            messageIndex={messageIndex}
            setShowEdit={setShowEdit}
            isAssistant={false}
          />
        </ChatBubble>
      )}

      <EditMessage showEdit={showEdit} setShowEdit={setShowEdit} chat={chat} />

      <MessageDevMode
        chat={chat}
        messageIndex={messageIndex}
        renderMarkdown={renderMarkdown}
        setRenderMarkdown={setRenderMarkdown}
        renderColor={renderColor}
        setRenderColor={setRenderColor}
      />
    </>
  );
}
