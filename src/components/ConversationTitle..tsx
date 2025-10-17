import { AppChatStoreContext, AppContext } from "@/pages/App";
import {
  memo,
  useContext,
} from "react";

const ConversationTitle = ({ chatStoreIndex }: { chatStoreIndex: number }) => {
  return (
    <span className="w-full">
      {chatStoreIndex}
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
