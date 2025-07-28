import React, { useContext } from "react";
import { AppChatStoreContext, AppContext } from "@/pages/App";
import { tr, langCodeContext } from "@/translate";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tr } from "@/translate";
import { InputField } from "../ui/InputField";
import { SetAPIsTemplate } from "@/components/setAPIsTemplate";

export const WhisperSettings: React.FC = () => {
  const { chatStore } = useContext(AppChatStoreContext);
  const { templateAPIsWhisper, setTemplateAPIsWhisper } =
    useContext(AppContext);
  const { langCode } = useContext(langCodeContext);

  return (
    <AccordionItem value="speech">
      <AccordionTrigger>
        <Tr>Speech Recognition</Tr>
      </AccordionTrigger>
      <AccordionContent>
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>
                <Tr>Whisper API</Tr>
              </CardTitle>
              <CardDescription>
                <Tr>Configure speech recognition settings</Tr>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <InputField
                field="whisper_key"
                help={tr(
                  "Used for Whisper service. Defaults to the OpenAI key above, but can be configured separately here",
                  langCode
                )}
              />
              <InputField
                field="whisper_api"
                help={tr(
                  "Whisper speech-to-text service. Service is enabled when this is set. Default: https://api.openai.com/v1/audio/transriptions",
                  langCode
                )}
              />
              <SetAPIsTemplate
                label="Whisper API"
                endpoint={chatStore.whisper_api}
                APIkey={chatStore.whisper_key}
                temps={templateAPIsWhisper}
                setTemps={setTemplateAPIsWhisper}
              />
            </CardContent>
          </Card>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
};
