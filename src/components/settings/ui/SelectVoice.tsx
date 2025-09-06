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
import { AudioLinesIcon, InfoIcon, CogIcon } from "lucide-react";
import { Tr } from "@/translate";

const TTS_VOICES: string[] = [
  "alloy",
  "echo",
  "fable",
  "onyx",
  "nova",
  "shimmer",
];

interface SelectVoiceProps {
  help: string;
}

export const SelectVoice: React.FC<SelectVoiceProps> = ({ help }) => {
  const { chatStore, setChatStore } = useContext(AppChatStoreContext);

  let shouldIUseCustomVoice: boolean = true;
  for (const voice of TTS_VOICES) {
    if (chatStore.tts_voice === voice) {
      shouldIUseCustomVoice = false;
    }
  }
  const [useCustomVoice, setUseCustomVoice] = useState(shouldIUseCustomVoice);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2">
          <AudioLinesIcon className="w-4 h-4" />
          <Tr>TTS Voice</Tr>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon">
                <InfoIcon className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  <Tr>TTS Voice</Tr>
                </DialogTitle>
                <DialogDescription>{help}</DialogDescription>
              </DialogHeader>
            </DialogContent>
          </Dialog>
        </Label>

        <div className="flex items-center gap-2">
          <Label className="flex items-center gap-2">
            <CogIcon className="w-4 h-4" />
            <Tr>Custom</Tr>
          </Label>
          <Checkbox
            checked={useCustomVoice}
            onCheckedChange={() => setUseCustomVoice(!useCustomVoice)}
          />
        </div>
      </div>

      {useCustomVoice ? (
        <Input
          value={chatStore.tts_voice}
          onBlur={(e: React.ChangeEvent<HTMLInputElement>) => {
            chatStore.tts_voice = e.target.value;
            setChatStore({ ...chatStore });
          }}
        />
      ) : (
        <Select
          value={chatStore.tts_voice}
          onValueChange={(voice: string) => {
            chatStore.tts_voice = voice;
            setChatStore({ ...chatStore });
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a voice" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>
                <Tr>Voices</Tr>
              </SelectLabel>
              {TTS_VOICES.map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      )}
    </div>
  );
};