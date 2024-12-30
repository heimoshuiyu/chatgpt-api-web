import { SpeakerWaveIcon } from "@heroicons/react/24/outline";
import { useContext, useMemo, useState } from "react";

import { addTotalCost } from "@/utils/totalCost";
import { ChatStore, ChatStoreMessage } from "@/types/chatstore";
import { Message, getMessageText } from "@/chatgpt";
import { AudioLinesIcon, LoaderCircleIcon } from "lucide-react";
import { Button } from "./components/ui/button";
import { AppContext } from "./pages/App";

interface TTSProps {
  chat: ChatStoreMessage;
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
    return <audio className="w-64" src={src} controls />;
  }
  return <></>;
}
export default function TTSButton(props: TTSProps) {
  const [generating, setGenerating] = useState(false);
  const ctx = useContext(AppContext);
  if (!ctx) return <div>error</div>;

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => {
        const api = ctx.chatStore.tts_api;
        const api_key = ctx.chatStore.tts_key;
        const model = "tts-1";
        const input = getMessageText(props.chat);
        const voice = ctx.chatStore.tts_voice;

        const body: Record<string, any> = {
          model,
          input,
          voice,
          response_format: ctx.chatStore.tts_format || "mp3",
        };
        if (ctx.chatStore.tts_speed_enabled) {
          body["speed"] = ctx.chatStore.tts_speed;
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
            ctx.chatStore.cost += cost;
            addTotalCost(cost);
            ctx.setChatStore({ ...ctx.chatStore });

            // save blob
            props.chat.audio = blob;
            ctx.setChatStore({ ...ctx.chatStore });

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
        <LoaderCircleIcon className="h-4 w-4 animate-spin" />
      ) : (
        <AudioLinesIcon className="h-4 w-4" />
      )}
    </Button>
  );
}
