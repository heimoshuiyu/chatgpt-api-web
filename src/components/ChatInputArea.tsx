import React, { useState } from "react";
import { MessageDetail } from "@/chatgpt";
import { Button } from "@/components/ui/button";
import { ChatInput } from "@/components/ui/chat/chat-input";
import { ImageUploadDrawer } from "@/components/ImageUploadDrawer";
import { ImageGenDrawer } from "@/components/ImageGenDrawer";
import WhisperButton from "@/components/WhisperButton";
import { CornerDownLeftIcon, ScissorsIcon } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Tr } from "@/translate";
import { autoHeight } from "@/utils/textAreaHelp";

interface ChatInputAreaProps {
  inputMsg: string;
  setInputMsg: (msg: string) => void;
  images: MessageDetail[];
  setImages: (images: MessageDetail[]) => void;
  showGenerating: boolean;
  onSend: (msg: string) => void;
  onStopGenerating: () => void;
  generatingMessage: string;
  follow: boolean;
  setFollow: (follow: boolean) => void;
  userInputRef: React.RefObject<HTMLInputElement>;
}

export function ChatInputArea({
  inputMsg,
  setInputMsg,
  images,
  setImages,
  showGenerating,
  onSend,
  onStopGenerating,
  generatingMessage,
  follow,
  setFollow,
  userInputRef,
}: ChatInputAreaProps) {
  return (
    <>
      {showGenerating && (
        <div className="flex items-center justify-between gap-2 p-2 m-2 rounded bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              <Tr>Follow</Tr>
            </label>
            <Switch
              checked={follow}
              onCheckedChange={setFollow}
              aria-label="Toggle auto-scroll"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="ml-auto gap-1.5"
              variant="destructive"
              onClick={onStopGenerating}
            >
              <Tr>Stop Generating</Tr>
              <ScissorsIcon className="size-3.5" />
            </Button>
          </div>
        </div>
      )}
      <div className="flex flex-wrap">
        {images.map((image, index) => (
          <div className="flex flex-col" key={index}>
            {image.type === "image_url" && (
              <img
                className="rounded m-1 p-1 border-2 border-gray-400 max-h-32 max-w-xs"
                src={image.image_url?.url}
              />
            )}
          </div>
        ))}
      </div>
      <form className="relative rounded-lg border bg-background focus-within:ring-1 focus-within:ring-ring p-1">
        <ChatInput
          value={inputMsg}
          ref={userInputRef as any}
          placeholder={tr("Type your message here...", "en")}
          onChange={(event: any) => {
            setInputMsg(event.target.value);
            autoHeight(event.target);
          }}
          onKeyPress={(event: any) => {
            if ((event.ctrlKey || event.metaKey) && event.code === "Enter") {
              if (!showGenerating) {
                onSend(event.target.value);
                setInputMsg("");
                event.target.value = "";
                autoHeight(event.target);
              }
              return;
            }
            autoHeight(event.target);
            setInputMsg(event.target.value);
          }}
          className="min-h-12 resize-none rounded-lg bg-background border-0 p-3 shadow-none focus-visible:ring-0"
        />
        <div className="flex items-center p-3 pt-0">
          <ImageUploadDrawer
            images={images}
            setImages={setImages}
            disableFactor={[showGenerating]}
          />
          <ImageGenDrawer disableFactor={[showGenerating]} />

          <WhisperButton inputMsg={inputMsg} setInputMsg={setInputMsg} />

          <Button
            size="sm"
            className="ml-auto gap-1.5"
            disabled={showGenerating}
            onClick={() => {
              onSend(inputMsg);
              if (userInputRef.current === null) return;
              userInputRef.current.value = "";
              autoHeight(userInputRef.current);
            }}
          >
            <Tr>Send</Tr>
            <CornerDownLeftIcon className="size-3.5" />
          </Button>
        </div>
      </form>
    </>
  );
}

// Helper function for translation (simplified version)
function tr(text: string, langCode: string): string {
  // This is a simplified version - in the actual code, this would use the translation system
  return text;
}
