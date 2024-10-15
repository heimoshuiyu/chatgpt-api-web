import { createRef } from "preact";

import { ChatStore } from "@/types/chatstore";
import { StateUpdater, useEffect, useState, Dispatch } from "preact/hooks";

const WhisperButton = (props: {
  chatStore: ChatStore;
  inputMsg: string;
  setInputMsg: Dispatch<StateUpdater<string>>;
}) => {
  const { chatStore, inputMsg, setInputMsg } = props;
  const mediaRef = createRef();
  const [isRecording, setIsRecording] = useState("Mic");
  return (
    <button
      className={`btn disabled:line-through disabled:btn-neutral disabled:text-white m-1 p-1 ${
        isRecording === "Recording" ? "btn-error" : "btn-success"
      } ${isRecording !== "Mic" ? "animate-pulse" : ""}`}
      disabled={isRecording === "Transcribing"}
      ref={mediaRef}
      onClick={async () => {
        if (isRecording === "Recording") {
          // @ts-ignore
          window.mediaRecorder.stop();
          setIsRecording("Transcribing");
          return;
        }

        // build prompt
        const prompt = [chatStore.systemMessageContent]
          .concat(
            chatStore.history
              .filter(({ hide }) => !hide)
              .slice(chatStore.postBeginIndex)
              .map(({ content }) => {
                if (typeof content === "string") {
                  return content;
                } else {
                  return content.map((c) => c?.text).join(" ");
                }
              }),
          )
          .concat([inputMsg])
          .join(" ");
        console.log({ prompt });

        setIsRecording("Recording");
        console.log("start recording");

        try {
          const mediaRecorder = new MediaRecorder(
            await navigator.mediaDevices.getUserMedia({
              audio: true,
            }),
            { audioBitsPerSecond: 64 * 1000 },
          );

          // mount mediaRecorder to ref
          // @ts-ignore
          window.mediaRecorder = mediaRecorder;

          mediaRecorder.start();
          const audioChunks: Blob[] = [];
          mediaRecorder.addEventListener("dataavailable", (event) => {
            audioChunks.push(event.data);
          });
          mediaRecorder.addEventListener("stop", async () => {
            // Stop the MediaRecorder
            mediaRecorder.stop();
            // Stop the media stream
            mediaRecorder.stream.getTracks()[0].stop();

            setIsRecording("Transcribing");
            const audioBlob = new Blob(audioChunks);
            const audioUrl = URL.createObjectURL(audioBlob);
            console.log({ audioUrl });
            const audio = new Audio(audioUrl);
            // audio.play();
            const reader = new FileReader();
            reader.readAsDataURL(audioBlob);

            // file-like object with mimetype
            const blob = new Blob([audioBlob], {
              type: "application/octet-stream",
            });

            reader.onloadend = async () => {
              try {
                const base64data = reader.result;

                // post to openai whisper api
                const formData = new FormData();
                // append file
                formData.append("file", blob, "audio.ogg");
                formData.append("model", "whisper-1");
                formData.append("response_format", "text");
                formData.append("prompt", prompt);

                const response = await fetch(chatStore.whisper_api, {
                  method: "POST",
                  headers: {
                    Authorization: `Bearer ${
                      chatStore.whisper_key || chatStore.apiKey
                    }`,
                  },
                  body: formData,
                });

                const text = await response.text();

                setInputMsg(inputMsg ? inputMsg + " " + text : text);
              } catch (error) {
                alert(error);
                console.log(error);
              } finally {
                setIsRecording("Mic");
              }
            };
          });
        } catch (error) {
          alert(error);
          console.log(error);
          setIsRecording("Mic");
        }
      }}
    >
      {isRecording}
    </button>
  );
};

export default WhisperButton;
