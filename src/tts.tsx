import { SpeakerWaveIcon } from "@heroicons/react/24/outline";
import { useMemo, useState } from "preact/hooks";

import { addTotalCost } from "@/utils/totalCost";
import { ChatStore, ChatStoreMessage } from "@/types/chatstore";
import { Message, getMessageText } from "@/chatgpt";

interface TTSProps {
  chatStore: ChatStore;
  chat: ChatStoreMessage;
  setChatStore: (cs: ChatStore) => void;
}
interface TTSPlayProps {
  chat: ChatStoreMessage;
}
export function TTSPlay(props: TTSPlayProps) {
  const src = useMemo(() => {
    if (props.chat.audio instanceof Blob) {
      return URL.createObjectURL(props.chat.audio);
    }
    return "";
  }, [props.chat.audio]);

  if (props.chat.hide) {
    return <></>;
  }
  if (props.chat.audio instanceof Blob) {
    return <audio className="w-full" src={src} controls />;
  }
  return <></>;
}
export default function TTSButton(props: TTSProps) {
  const [generating, setGenerating] = useState(false);
  return (
    <button
      onClick={() => {
        const api = props.chatStore.tts_api;
        const api_key = props.chatStore.tts_key;
        const model = "tts-1";
        const input = getMessageText(props.chat);
        const voice = props.chatStore.tts_voice;

        const body: Record<string, any> = {
          model,
          input,
          voice,
          response_format: props.chatStore.tts_format || "mp3",
        };
        if (props.chatStore.tts_speed_enabled) {
          body["speed"] = props.chatStore.tts_speed;
        }

        setGenerating(true);

        fetch(api, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${api_key}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        })
          .then((response) => response.blob())
          .then((blob) => {
            // update price
            const cost = (input.length * 0.015) / 1000;
            props.chatStore.cost += cost;
            addTotalCost(cost);
            props.setChatStore({ ...props.chatStore });

            // save blob
            props.chat.audio = blob;
            props.setChatStore({ ...props.chatStore });

            const url = URL.createObjectURL(blob);
            const audio = new Audio(url);
            audio.play();
          })
          .finally(() => {
            setGenerating(false);
          });
      }}
    >
      {generating ? (
        <span className="loading loading-dots loading-xs"></span>
      ) : (
        <SpeakerWaveIcon className="h-4 w-4" />
      )}
    </button>
  );
}
