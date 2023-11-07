import { ChatStore, addTotalCost } from "./app";

interface TTSProps {
  chatStore: ChatStore;
  setChatStore: (cs: ChatStore) => void;
  text: string;
}
export default function TTSButton(props: TTSProps) {
  return (
    <button
      onClick={() => {
        const api = props.chatStore.tts_api;
        const api_key = props.chatStore.tts_key;
        const model = "tts-1";
        const input = props.text;
        const voice = "alloy";

        const body: Record<string, any> = {
          model,
          input,
          voice,
          response_format: "opus",
        };
        if (props.chatStore.tts_speed_enabled) {
          body["speed"] = props.chatStore.tts_speed;
        }

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
            const cost = (props.text.length * 0.015) / 1000;
            props.chatStore.cost += cost;
            addTotalCost(cost);
            props.setChatStore({ ...props.chatStore });

            const url = URL.createObjectURL(blob);
            const audio = new Audio(url);
            audio.play();
          });
      }}
    >
      🔈
    </button>
  );
}
