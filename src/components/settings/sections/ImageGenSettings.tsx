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

export const ImageGenSettings: React.FC = () => {
  const { chatStore } = useContext(AppChatStoreContext);
  const { templateAPIsImageGen, setTemplateAPIsImageGen } =
    useContext(AppContext);
  const { langCode } = useContext(langCodeContext);

  return (
    <AccordionItem value="image_gen">
      <AccordionTrigger>
        <Tr>Image Generation</Tr>
      </AccordionTrigger>
      <AccordionContent>
        <Card>
          <CardHeader>
            <CardTitle>
              <Tr>Image Generation API</Tr>
            </CardTitle>
            <CardDescription>
              <Tr>Configure image generation settings</Tr>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <InputField
              field="image_gen_key"
              help={tr(
                "Image generation service API key. Defaults to the OpenAI key above, but can be configured separately here",
                langCode
              )}
            />
            <InputField
              field="image_gen_api"
              help={tr(
                "Image generation API endpoint. Service is enabled when this is set. Default: https://api.openai.com/v1/images/generations",
                langCode
              )}
            />
            <SetAPIsTemplate
              label={tr("Image Gen API", langCode)}
              endpoint={chatStore.image_gen_api}
              APIkey={chatStore.image_gen_key}
              temps={templateAPIsImageGen}
              setTemps={setTemplateAPIsImageGen}
            />
          </CardContent>
        </Card>
      </AccordionContent>
    </AccordionItem>
  );
};
