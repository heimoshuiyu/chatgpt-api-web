import React, { useContext, useRef, useState, useEffect } from "react";
import { langCodeContext, tr, Tr } from "@/translate";
import { AppChatStoreContext, AppContext } from "./App";
import { useMCPConfirmation } from "@/hooks/useMCPConfirmation";
import { useMessageCompletion } from "@/hooks/useMessageCompletion";
import { useMessageSending } from "@/hooks/useMessageSending";
import { ChatMessagesDisplay } from "@/components/ChatMessagesDisplay";
import { ChatInputArea } from "@/components/ChatInputArea";
import { MCPConfirmationDialog } from "@/components/MCPConfirmationDialog";
import { MessageDetail } from "@/chatgpt";
import { useToast } from "@/hooks/use-toast";

export default function ChatBOX() {
  const {
    db,
    selectedChatIndex,
    setSelectedChatIndex,
    handleNewChatStore,
    callingTools,
    setCallingTools,
  } = useContext(AppContext);
  const { langCode, setLangCode } = useContext(langCodeContext);
  const { chatStore, setChatStore } = useContext(AppChatStoreContext);
  const { toast } = useToast();

  // State management
  const [inputMsg, setInputMsg] = useState("");
  const [images, setImages] = useState<MessageDetail[]>([]);
  const [showGenerating, setShowGenerating] = useState(false);
  const [generatingMessage, setGeneratingMessage] = useState("");
  const [showRetry, setShowRetry] = useState(false);

  // Follow state
  let default_follow = localStorage.getItem("follow");
  if (default_follow === null) {
    default_follow = "true";
  }
  const [follow, _setFollow] = useState(default_follow === "true");

  const setFollow = (follow: boolean) => {
    console.log("set follow", follow);
    localStorage.setItem("follow", follow.toString());
    _setFollow(follow);
  };

  // Refs
  const messagesEndRef = useRef<HTMLElement>(null);

  // Hooks
  const { complete } = useMessageCompletion();
  const { send, userInputRef, abortControllerRef } = useMessageSending();
  const {
    mcpConfirmOpen,
    pendingMcpMessage,
    showMCPConfirmation,
    handleMcpConfirm,
    handleMcpCancel,
  } = useMCPConfirmation();

  // Auto-scroll effect
  useEffect(() => {
    if (follow) {
      if (messagesEndRef.current === null) return;
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [showRetry, showGenerating, generatingMessage, chatStore]);

  // Message completion handler
  const handleComplete = async () => {
    try {
      setShowGenerating(true);
      abortControllerRef.current = new AbortController();

      await complete((message) => {
        showMCPConfirmation(message);
      }, setGeneratingMessage);

      setShowRetry(false);
    } catch (error: any) {
      if (error.name === "AbortError") {
        console.log("abort complete");
        return;
      }
      setShowRetry(true);
      alert(error);
    } finally {
      setShowGenerating(false);
      setSelectedChatIndex(selectedChatIndex);
    }
  };

  // Message sending handler
  const handleSend = async (msg: string) => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 0);

    const inputMsg = msg.trim();
    if (!inputMsg && images.length === 0) {
      console.log("empty message");
      return;
    }

    let content: string | MessageDetail[] = inputMsg;
    if (images.length > 0) {
      content = images;
    }
    if (images.length > 0 && inputMsg.trim()) {
      content = [{ type: "text", text: inputMsg }, ...images];
    }

    chatStore.history.push({
      role: "user",
      content,
      hide: false,
      token: Math.floor(inputMsg.length / 4), // Simple token estimation
      example: false,
      audio: null,
      logprobs: null,
      response_model_name: null,
      reasoning_content: null,
      usage: null,
    });

    // Update total tokens
    chatStore.totalTokens += Math.floor(inputMsg.length / 4);
    if (images.length > 0) {
      chatStore.totalTokens += images.length * 50; // Estimate image tokens
    }

    setChatStore({ ...chatStore });
    setInputMsg("");
    setImages([]);

    await handleComplete();
  };

  // Event handlers
  const handleRetry = async () => {
    setShowRetry(false);
    await handleComplete();
  };

  const handleRegenerate = async () => {
    const messageIndex = chatStore.history.length - 1;
    if (chatStore.history[messageIndex].role === "assistant") {
      chatStore.history[messageIndex].hide = true;
    }
    setChatStore({ ...chatStore });
    await handleComplete();
  };

  const handleClearSystem = () => {
    chatStore.systemMessageContent = "";
    chatStore.toolsString = "";
    chatStore.history = [];
    setChatStore({ ...chatStore });
  };

  const handleStopGenerating = () => {
    abortControllerRef.current.abort();
    setShowGenerating(false);
    setGeneratingMessage("");
  };

  return (
    <>
      <div className="grow flex flex-col w-full">
        <ChatMessagesDisplay
          chatStore={chatStore}
          showGenerating={showGenerating}
          generatingMessage={generatingMessage}
          showRetry={showRetry}
          onRetry={handleRetry}
          onNewChat={handleNewChatStore}
          onCompletion={handleComplete}
          onRegenerate={handleRegenerate}
          onClearSystem={handleClearSystem}
        />
        <div id="message-end" ref={messagesEndRef as any}></div>
      </div>
      <div className="sticky bottom-0 w-full z-20 bg-background">
        <ChatInputArea
          inputMsg={inputMsg}
          setInputMsg={setInputMsg}
          images={images}
          setImages={setImages}
          showGenerating={showGenerating}
          onSend={handleSend}
          onStopGenerating={handleStopGenerating}
          generatingMessage={generatingMessage}
          follow={follow}
          setFollow={setFollow}
          userInputRef={userInputRef}
        />
      </div>
      <MCPConfirmationDialog
        open={mcpConfirmOpen}
        onOpenChange={handleMcpCancel}
        pendingMcpMessage={pendingMcpMessage}
        chatStore={chatStore}
        onConfirm={handleMcpConfirm}
        onCancel={handleMcpCancel}
      />
    </>
  );
}
