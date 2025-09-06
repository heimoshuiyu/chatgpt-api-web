import { useContext, useRef } from "react";
import { ChatStoreMessage } from "@/types/chatstore";
import { MessageDetail } from "@/chatgpt";
import { AppChatStoreContext } from "@/pages/App";
import { calculate_token_length } from "@/chatgpt";
import { autoHeight } from "@/utils/textAreaHelp";
import ChatGPT from "@/chatgpt";

export interface MessageSendingHook {
  send: (msg?: string, call_complete?: boolean) => Promise<void>;
  userInputRef: React.RefObject<HTMLInputElement>;
  abortControllerRef: React.MutableRefObject<AbortController>;
}

export function useMessageSending(): MessageSendingHook {
  const { chatStore, setChatStore } = useContext(AppChatStoreContext);
  const userInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController>(new AbortController());
  const client = new ChatGPT(chatStore.apiKey);

  const send = async (msg = "", call_complete = true) => {
    setTimeout(() => {
      // Scroll to bottom would be handled by the parent component
    }, 0);

    const inputMsg = msg.trim();
    if (!inputMsg) {
      console.log("empty message");
      return;
    }

    let content: string | MessageDetail[] = inputMsg;

    chatStore.history.push({
      role: "user",
      content,
      hide: false,
      token: calculate_token_length(inputMsg.trim()),
      example: false,
      audio: null,
      logprobs: null,
      response_model_name: null,
      reasoning_content: null,
      usage: null,
    });

    // manually calculate token length
    chatStore.totalTokens += calculate_token_length(inputMsg.trim());
    client.total_tokens = chatStore.totalTokens;

    setChatStore({ ...chatStore });

    if (userInputRef.current) {
      userInputRef.current.value = "";
      autoHeight(userInputRef.current);
    }

    if (call_complete) {
      // This would be handled by the parent component
      console.log("Message sent, completion would be called by parent");
    }
  };

  return {
    send,
    userInputRef,
    abortControllerRef,
  };
}
