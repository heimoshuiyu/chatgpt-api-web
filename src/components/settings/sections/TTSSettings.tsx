import React, { useContext } from "react";
import { AppChatStoreContext, AppContext } from "@/pages/App";
import { tr, langCodeContext } from "@/translate";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { InfoIcon } from "lucide-react";
import { Tr } from "@/translate";
import { InputField } from "../ui/InputField";
import { Slicer } from "../ui/Slicer";
import { SetAPIsTemplate } from "@/components/setAPIsTemplate";
import { SelectVoice } from "../ui/SelectVoice";

const TTS_FORMAT: string[] = ["mp3", "opus", "aac", "flac"];

export const TTSSettings: React.FC = () => {
  const { chatStore, setChatStore } = useContext(AppChatStoreContext);
  const { templateAPIsTTS, setTemplateAPIsTTS } = useContext(AppContext);
  const { langCode } = useContext(langCodeContext);

  return (
    <AccordionItem value="tts">
      <AccordionTrigger>
        <Tr>TTS</Tr>
      </AccordionTrigger>
      <AccordionContent>
        <Card>
          <CardHeader>
            <CardTitle>
              <Tr>TTS API</Tr>
            </CardTitle>
            <CardDescription>
              <Tr>Configure text-to-speech settings</Tr>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <InputField
              field="tts_key"
              help={tr(
                "Text-to-speech service API key. Defaults to the OpenAI key above, but can be configured separately here",
                langCode
              )}
            />
            <InputField
              field="tts_api"
              help={tr(
                "TTS API endpoint. Service is enabled when this is set. Default: https://api.openai.com/v1/audio/speech",
                langCode
              )}
            />
            <InputField
              field="tts_model"
              help={tr(
                "TTS model to use for text-to-speech generation. Default: tts-1",
                langCode
              )}
            />
            <SetAPIsTemplate
              label="TTS API"
              endpoint={chatStore.tts_api}
              APIkey={chatStore.tts_key}
              temps={templateAPIsTTS}
              setTemps={setTemplateAPIsTTS}
            />
          </CardContent>
        </Card>
        <div className="space-y-4">
          <SelectVoice
            help={tr("Select the voice style for text-to-speech", langCode)}
          />

          <Slicer
            min={0.25}
            max={4.0}
            field="tts_speed"
            help={tr("Adjust the playback speed of text-to-speech", langCode)}
          />

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Tr>TTS Format</Tr>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <InfoIcon className="w-4 h-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      <Tr>TTS Format</Tr>
                    </DialogTitle>
                    <DialogDescription>
                      <Tr>Select the audio format for text-to-speech output</Tr>
                    </DialogDescription>
                  </DialogHeader>
                </DialogContent>
              </Dialog>
            </Label>
            <Select
              value={chatStore.tts_format}
              onValueChange={(value) => {
                chatStore.tts_format = value;
                setChatStore({ ...chatStore });
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a format" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>
                    <Tr>Formats</Tr>
                  </SelectLabel>
                  {TTS_FORMAT.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
};
