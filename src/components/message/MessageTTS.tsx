import { useTTS } from "@/hooks/useTTS";
import { useToast } from "@/hooks/use-toast";
import { useContext } from "react";
import { Button } from "@/components/ui/button";
import { AudioLinesIcon, LoaderCircleIcon, StopCircleIcon } from "lucide-react";
import { ChatStoreMessage } from "@/types/chatstore";
import { langCodeContext } from "@/translate";
import { tr } from "@/translate";

interface TTSProps {
  chat: ChatStoreMessage;
  messageIndex: number;
}

export function TTSPlay({ chat }: TTSProps) {
  const { getAudioSrc } = useTTS();
  const src = getAudioSrc(chat);

  if (chat.hide || !chat.audio) {
    return null;
  }

  if (chat.audio instanceof Blob) {
    return <audio className="w-64" src={src} controls />;
  }

  return null;
}

export function TTSButton({ chat, messageIndex }: TTSProps) {
  const { generateTTS, stopTTS, isGenerating, isPlaying, canUseTTS } = useTTS();
  const { toast } = useToast();
  const { langCode } = useContext(langCodeContext);

  const messageId = `message-${messageIndex}`;
  const generating = isGenerating(messageId);
  const playing = isPlaying(messageId);

  const handleGenerateTTS = async () => {
    try {
      await generateTTS(chat, messageId);
      toast({
        title: tr("TTS generated successfully", langCode),
        description: tr("Audio has been generated and is playing", langCode),
      });
    } catch (error) {
      console.error("TTS generation error:", error);
      toast({
        title: tr("TTS generation failed", langCode),
        description:
          error instanceof Error
            ? error.message
            : tr("Unknown error", langCode),
        variant: "destructive",
      });
    }
  };

  const handleStopTTS = () => {
    stopTTS(messageId);
    toast({
      title: tr("Audio stopped", langCode),
      description: tr("Audio playback has been stopped", langCode),
    });
  };

  if (!canUseTTS()) {
    return null;
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={playing ? handleStopTTS : handleGenerateTTS}
      disabled={generating}
    >
      {generating ? (
        <LoaderCircleIcon className="h-4 w-4 animate-spin" />
      ) : playing ? (
        <StopCircleIcon className="h-4 w-4" />
      ) : (
        <AudioLinesIcon className="h-4 w-4" />
      )}
    </Button>
  );
}
