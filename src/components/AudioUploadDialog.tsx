import { useState, useRef, useContext } from "react";
import { Tr } from "@/translate";
import { MessageDetail } from "@/chatgpt";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Card, CardContent } from "./ui/card";
import { Label } from "./ui/label";
import { Mic, CircleStop, Upload, AudioWaveformIcon, Play, Pause } from "lucide-react";
import { useAudioRecorder } from "@/utils/audioRecorder";
import { AppChatStoreContext } from "@/pages/App";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAudioSelect: (audio: MessageDetail) => void;
  initialAudio?: MessageDetail;
}

export function AudioUploadDialog({ open, onOpenChange, onAudioSelect, initialAudio }: Props) {
  const { chatStore } = useContext(AppChatStoreContext);
  const [audioUrl, setAudioUrl] = useState<string>(initialAudio?.input_audio?.data || "");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [transcription, setTranscription] = useState<string>("");
  const audioRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { recordingState, mediaRef, startRecording, stopRecording } = useAudioRecorder();

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setAudioFile(file);
      const url = URL.createObjectURL(file);
      setAudioUrl(url);
    }
  };

  const handleRecording = async () => {
    if (recordingState === "Recording") {
      stopRecording();
      return;
    }

    try {
      if (!chatStore.whisper_api || !chatStore.whisper_key) {
        throw new Error("Whisper API not configured");
      }

      await startRecording({
        onTranscriptionComplete: (text) => {
          setTranscription(text);
        },
        whisperApi: chatStore.whisper_api,
        apiKey: chatStore.whisper_key,
      });
    } catch (error) {
      console.error("Recording failed:", error);
    }
  };

  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleSave = () => {
    if (audioUrl) {
      const audioDetail: MessageDetail = {
        type: "input_audio",
        input_audio: {
          data: audioUrl,
          format: audioFile?.type.split('/')[1] || "wav",
        },
      };
      onAudioSelect(audioDetail);
      onOpenChange(false);
      // Reset state
      setAudioUrl("");
      setAudioFile(null);
      setTranscription("");
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset state
    setAudioUrl("");
    setAudioFile(null);
    setTranscription("");
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            <Tr>Add Audio</Tr>
          </DialogTitle>
          <DialogDescription>
            <Tr>Record audio or upload a file from your device.</Tr>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Recording Section */}
          <Card>
            <CardContent className="p-4">
              <div className="space-y-4">
                <Label className="text-sm font-medium">
                  <Tr>Record Audio</Tr>
                </Label>
                <div className="flex items-center gap-4">
                  <Button
                    variant="outline"
                    onClick={handleRecording}
                    disabled={recordingState === "Transcribing" || !chatStore.whisper_api || !chatStore.whisper_key}
                    ref={mediaRef as any}
                    className={`${recordingState !== "Mic" ? "animate-pulse" : ""}`}
                  >
                    {recordingState === "Mic" ? (
                      <Mic className="h-4 w-4 mr-2" />
                    ) : recordingState === "Recording" ? (
                      <CircleStop className="h-4 w-4 mr-2" />
                    ) : (
                      <AudioWaveformIcon className="h-4 w-4 mr-2" />
                    )}
                    {recordingState === "Mic" ? (
                      <Tr>Start Recording</Tr>
                    ) : recordingState === "Recording" ? (
                      <Tr>Stop Recording</Tr>
                    ) : (
                      <Tr>Transcribing...</Tr>
                    )}
                  </Button>
                  {!chatStore.whisper_api || !chatStore.whisper_key ? (
                    <span className="text-sm text-muted-foreground">
                      <Tr>Whisper API not configured in settings</Tr>
                    </span>
                  ) : null}
                </div>

                {transcription && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      <Tr>Transcription</Tr>
                    </Label>
                    <Textarea
                      value={transcription}
                      onChange={(e) => setTranscription(e.target.value)}
                      placeholder="Transcribed text will appear here..."
                      className="min-h-[100px]"
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* File Upload Section */}
          <Card>
            <CardContent className="p-4">
              <div className="space-y-4">
                <Label className="text-sm font-medium">
                  <Tr>Upload Audio File</Tr>
                </Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  <Tr>Choose Audio File</Tr>
                </Button>

                {audioUrl && (
                  <div className="space-y-3">
                    <div className="border rounded-lg p-3 bg-muted/30">
                      <div className="flex items-center gap-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handlePlayPause}
                        >
                          {isPlaying ? (
                            <Pause className="h-4 w-4" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                        </Button>
                        <div className="flex-1">
                          <p className="text-sm text-muted-foreground">
                            {audioFile?.name || "Audio file"}
                          </p>
                          {audioFile && (
                            <p className="text-xs text-muted-foreground">
                              {(audioFile.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          )}
                        </div>
                      </div>
                      <audio
                        ref={audioRef}
                        src={audioUrl}
                        onEnded={() => setIsPlaying(false)}
                        className="hidden"
                      />
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={handleClose}>
            <Tr>Cancel</Tr>
          </Button>
          <Button onClick={handleSave} disabled={!audioUrl}>
            <Tr>Add Audio</Tr>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}