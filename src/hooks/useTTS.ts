import { useState, useContext, useMemo } from "react";
import { AppChatStoreContext } from "@/pages/App";
import { ChatStoreMessage } from "@/types/chatstore";
import { addTotalCost } from "@/utils/totalCost";
import { getMessageText } from "@/chatgpt";

export const useTTS = () => {
  const { chatStore, setChatStore } = useContext(AppChatStoreContext);
  const [generatingStates, setGeneratingStates] = useState<
    Record<string, boolean>
  >({});

  const generateTTS = async (chat: ChatStoreMessage, messageId: string) => {
    const api = chatStore.tts_api;
    const api_key = chatStore.tts_key;
    const model = "tts-1";
    const input = getMessageText(chat);
    const voice = chatStore.tts_voice;

    if (!api || !api_key) {
      throw new Error("TTS API or API key is not configured");
    }

    const body: Record<string, any> = {
      model,
      input,
      voice,
      response_format: chatStore.tts_format || "mp3",
    };

    if (chatStore.tts_speed_enabled) {
      body["speed"] = chatStore.tts_speed;
    }

    setGeneratingStates((prev) => ({ ...prev, [messageId]: true }));

    try {
      const response = await fetch(api, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${api_key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(
          `TTS API request failed: ${response.status} ${response.statusText}`
        );
      }

      const blob = await response.blob();

      // Update cost
      const cost = (input.length * 0.015) / 1000;
      chatStore.cost += cost;
      addTotalCost(cost);

      // Save blob to chat
      chat.audio = blob;
      setChatStore({ ...chatStore });

      // Play audio
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.play();

      return blob;
    } finally {
      setGeneratingStates((prev) => ({ ...prev, [messageId]: false }));
    }
  };

  const getAudioSrc = (chat: ChatStoreMessage) => {
    return useMemo(() => {
      if (chat.audio instanceof Blob) {
        return URL.createObjectURL(chat.audio);
      }
      return "";
    }, [chat.audio]);
  };

  const isGenerating = (messageId: string) =>
    generatingStates[messageId] || false;

  const canUseTTS = () => !!(chatStore.tts_api && chatStore.tts_key);

  return {
    generateTTS,
    getAudioSrc,
    isGenerating,
    canUseTTS,
  };
};
