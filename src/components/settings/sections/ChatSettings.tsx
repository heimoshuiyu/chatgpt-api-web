import React, { useContext } from "react";
import { AppChatStoreContext } from "@/pages/App";
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
import { Separator } from "@/components/ui/separator";
import { Tr } from "@/translate";
import { InputField } from "../ui/InputField";
import { SelectModel } from "../ui/SelectModel";
import { Slicer } from "../ui/Slicer";
import { ChoiceCheckbox } from "../ui/ChoiceCheckbox";
import { NumberInput } from "../ui/NumberInput";
import { ModalitiesSelect } from "../ui/ModalitiesSelect";
import { AudioSelect } from "../ui/AudioSelect";
import { SetAPIsTemplate } from "@/components/setAPIsTemplate";

export const ChatSettings: React.FC = () => {
  const { chatStore } = useContext(AppChatStoreContext);
  const { langCode } = useContext(langCodeContext);

  return (
    <AccordionItem value="chat">
      <AccordionTrigger>
        <Tr>Chat</Tr>
      </AccordionTrigger>
      <AccordionContent>
        <Card>
          <CardHeader>
            <CardTitle>
              <Tr>Chat API</Tr>
            </CardTitle>
            <CardDescription>
              <Tr>Configure the LLM API settings</Tr>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <InputField
              field="apiKey"
              help={tr("OpenAI API key, do not leak this key", langCode)}
            />
            <InputField
              field="apiEndpoint"
              help={tr(
                "API endpoint, useful for using reverse proxy services in unsupported regions, default to https://api.openai.com/v1/chat/completions",
                langCode
              )}
            />
            <SetAPIsTemplate
              label={tr("Chat API", langCode)}
              endpoint={chatStore.apiEndpoint}
              APIkey={chatStore.apiKey}
              temps={[]} // This should be passed from parent context
              setTemps={() => {}} // This should be passed from parent context
            />
          </CardContent>
        </Card>
        <Separator className="my-3" />
        <SelectModel
          help={tr(
            "Model, Different models have different performance and pricing, please refer to the API documentation",
            langCode
          )}
        />
        <Slicer
          field="temperature"
          min={0}
          max={2}
          help={tr(
            "Temperature, the higher the value, the higher the randomness of the generated text.",
            langCode
          )}
        />
        <ChoiceCheckbox
          field="streamMode"
          help={tr(
            "Stream Mode, use stream mode to see the generated content dynamically, but the token count cannot be accurately calculated, which may cause too much or too little history messages to be truncated when the token count is too large.",
            langCode
          )}
        />
        <ChoiceCheckbox
          field="enable_thinking"
          help={tr("enable_thinking", langCode)}
        />
        <ChoiceCheckbox
          field="logprobs"
          help={tr("Logprobs, return the probability of each token", langCode)}
        />
        <ModalitiesSelect />
        <AudioSelect />
        <NumberInput
          field="maxTokens"
          help={tr(
            "Max context token count. This value will be set automatically based on the selected model.",
            langCode
          )}
          readOnly={false}
        />
        <NumberInput
          field="maxGenTokens"
          help={tr(
            "maxGenTokens is the maximum number of tokens that can be generated in a single request.",
            langCode
          )}
          readOnly={false}
        />
        <NumberInput
          field="tokenMargin"
          help={tr(
            'When totalTokens > maxTokens - tokenMargin, the history message will be truncated, chatgpt will "forget" part of the messages in the conversation (but all history messages are still saved locally)',
            langCode
          )}
          readOnly={false}
        />
        <ChoiceCheckbox field="json_mode" help="JSON Mode" />
        <NumberInput
          field="postBeginIndex"
          help={tr(
            "Indicates how many history messages to 'forget' when sending API requests",
            langCode
          )}
          readOnly={true}
        />
        <NumberInput
          field="totalTokens"
          help={tr(
            "Total token count, this parameter will be updated every time you chat, in stream mode this parameter is an estimate",
            langCode
          )}
          readOnly={true}
        />
        <Slicer
          field="top_p"
          min={0}
          max={1}
          help={tr(
            "Top P sampling method. It is recommended to choose one of the temperature sampling methods, do not enable both at the same time.",
            langCode
          )}
        />
        <NumberInput
          field="presence_penalty"
          help={tr("Presence Penalty", langCode)}
          readOnly={false}
        />
        <NumberInput
          field="frequency_penalty"
          help={tr("Frequency Penalty", langCode)}
          readOnly={false}
        />
      </AccordionContent>
    </AccordionItem>
  );
};
