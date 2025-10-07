import React, { useState, useContext } from "react";
import { AppChatStoreContext } from "@/pages/App";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { ListIcon, InfoIcon, CogIcon } from "lucide-react";
import { Tr } from "@/translate";

const AUDIO_OPTIONS = ["Cherry", "Serena", "Ethan", "Chelsie"];

interface AudioSelectProps {
  help?: string;
}

export const AudioSelect: React.FC<AudioSelectProps> = ({ help }) => {
  const { chatStore, setChatStore } = useContext(AppChatStoreContext);

  let shouldIUseCustomAudio: boolean = true;
  if (chatStore.audio && AUDIO_OPTIONS.includes(chatStore.audio)) {
    shouldIUseCustomAudio = false;
  }
  const [useCustomAudio, setUseCustomAudio] = useState(shouldIUseCustomAudio);

  const handleAudioEnabledToggle = (enabled: boolean) => {
    setChatStore({
      ...chatStore,
      audio_enabled: enabled,
      audio: enabled ? chatStore.audio : "",
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2">
          <ListIcon className="w-4 h-4" />
          Audio Voice
          {help && (
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon">
                  <InfoIcon className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Audio Voice Selection</DialogTitle>
                  <DialogDescription>{help}</DialogDescription>
                </DialogHeader>
              </DialogContent>
            </Dialog>
          )}
        </Label>

        <div className="flex items-center gap-2">
          <Label className="flex items-center gap-2">
            <CogIcon className="w-4 h-4" />
            <Tr>Custom</Tr>
          </Label>
          <Checkbox
            checked={useCustomAudio}
            onCheckedChange={() => setUseCustomAudio(!useCustomAudio)}
          />
          <div className="flex items-center space-x-2 ml-4">
            <Switch
              id="audio-enabled"
              checked={chatStore.audio_enabled || false}
              onCheckedChange={handleAudioEnabledToggle}
            />
            <label htmlFor="audio-enabled" className="text-sm cursor-pointer">
              Enabled
            </label>
          </div>
        </div>
      </div>

      {chatStore.audio_enabled && (
        <div className="ml-4">
          {useCustomAudio ? (
            <Input
              value={chatStore.audio || ""}
              onBlur={(e: React.ChangeEvent<HTMLInputElement>) => {
                setChatStore({
                  ...chatStore,
                  audio: e.target.value,
                });
              }}
              placeholder="Enter custom voice name..."
            />
          ) : (
            <Select
              value={chatStore.audio || ""}
              onValueChange={(audio: string) => {
                setChatStore({
                  ...chatStore,
                  audio: audio,
                });
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a voice" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Voice Options</SelectLabel>
                  {AUDIO_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          )}
        </div>
      )}

      {!chatStore.audio_enabled && (
        <p className="text-xs text-muted-foreground ml-4">disabled</p>
      )}
    </div>
  );
};
