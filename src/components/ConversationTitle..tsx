import { STORAGE_NAME } from "@/const";
import { AppChatStoreContext, AppContext } from "@/pages/App";
import { ChatStore } from "@/types/chatstore";
import { memo, useContext, useEffect, useMemo, useState, useCallback } from "react";

const ConversationTitle = ({ chatStoreIndex }: { chatStoreIndex: number }) => {
  const { db, selectedChatIndex } = useContext(AppContext);
  const [title, setTitle] = useState("");

  const getTitle = useCallback(async () => {
    try {
      const chatStore = (await (
        await db
      ).get(STORAGE_NAME, chatStoreIndex)) as ChatStore;
      
      if (chatStore.history.length === 0) {
        setTitle(`${chatStoreIndex}`);
        return;
      }
      
      const content = chatStore.history[0]?.content;
      if (!content) {
        setTitle(`${chatStoreIndex}`);
        return;
      }

      if (typeof content === "string") {
        setTitle(content.substring(0, 39));
      }
    } catch (e) {
      console.error(e);
    }
  }, [db, chatStoreIndex]);

  useEffect(() => {
    getTitle();
  }, [getTitle]);

  const handleClick = useCallback(() => {
    getTitle();
  }, [getTitle]);

  return (
    <span
      className="w-full"
      onClick={handleClick}
    >
      {title}
    </span>
  );
};

const CachedConversationTitle = memo(
  ({
    chatStoreIndex,
    selectedChatStoreIndex,
  }: {
    chatStoreIndex: number;
    selectedChatStoreIndex: number;
  }) => {
    return <ConversationTitle chatStoreIndex={chatStoreIndex} />;
  },
  (prevProps, nextProps) => {
    return nextProps.selectedChatStoreIndex === nextProps.chatStoreIndex;
  }
);

export default CachedConversationTitle;
