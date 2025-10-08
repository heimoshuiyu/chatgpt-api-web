import { createRef, useState } from "react";

export type RecordingState = "Mic" | "Recording" | "Transcribing";

export interface AudioRecorderOptions {
  onTranscriptionComplete: (text: string) => void;
  whisperApi: string;
  apiKey: string;
  prompt?: string;
}

export function useAudioRecorder() {
  const [recordingState, setRecordingState] = useState<RecordingState>("Mic");
  const mediaRef = createRef();

  const startRecording = async (options: AudioRecorderOptions) => {
    const { onTranscriptionComplete, whisperApi, apiKey, prompt } = options;

    try {
      const mediaRecorder = new MediaRecorder(
        await navigator.mediaDevices.getUserMedia({
          audio: true,
        }),
        { audioBitsPerSecond: 64 * 1000 }
      );

      // Mount mediaRecorder to ref
      (window as any).mediaRecorder = mediaRecorder;

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

        setRecordingState("Transcribing");
        const audioBlob = new Blob(audioChunks);
        const audioUrl = URL.createObjectURL(audioBlob);
        console.log({ audioUrl });

        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);

        // File-like object with mimetype
        const blob = new Blob([audioBlob], {
          type: "application/octet-stream",
        });

        reader.onloadend = async () => {
          try {
            const base64data = reader.result;

            // Post to OpenAI Whisper API
            const formData = new FormData();
            // Append file
            formData.append("file", blob, "audio.ogg");
            formData.append("model", "whisper-1");
            formData.append("response_format", "text");
            if (prompt) {
              formData.append("prompt", prompt);
            }

            const response = await fetch(whisperApi, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${apiKey}`,
              },
              body: formData,
            });

            if (!response.ok) {
              throw new Error(`Transcription failed: ${response.statusText}`);
            }

            const text = await response.text();
            onTranscriptionComplete(text);
          } catch (error) {
            console.error("Transcription error:", error);
            alert(error instanceof Error ? error.message : String(error));
          } finally {
            setRecordingState("Mic");
          }
        };
      });

      setRecordingState("Recording");
      return mediaRecorder;
    } catch (error) {
      console.error("Recording error:", error);
      alert(error instanceof Error ? error.message : String(error));
      setRecordingState("Mic");
      throw error;
    }
  };

  const stopRecording = () => {
    if ((window as any).mediaRecorder) {
      (window as any).mediaRecorder.stop();
    }
  };

  return {
    recordingState,
    mediaRef,
    startRecording,
    stopRecording,
  };
}
