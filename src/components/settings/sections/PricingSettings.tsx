import React, { useContext } from "react";
import { AppChatStoreContext } from "@/pages/App";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
import { CustomPricingInput } from "../ui/CustomPricingInput";

export const PricingSettings: React.FC = () => {
  const { chatStore, setChatStore } = useContext(AppChatStoreContext);

  return (
    <AccordionItem value="custom-pricing">
      <AccordionTrigger>
        <Tr>Custom Model Pricing</Tr>
      </AccordionTrigger>
      <AccordionContent>
        <Card>
          <CardHeader>
            <CardTitle>
              <Tr>Custom Model Pricing</Tr>
            </CardTitle>
            <CardDescription>
              <Tr>Set custom pricing for your model (prices per token)</Tr>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {chatStore.chatPrice ? (
              <div className="space-y-4">
                <CustomPricingInput
                  id="prompt-price"
                  label="Prompt Price"
                  value={chatStore.chatPrice.prompt}
                  onChange={(value) => {
                    if (chatStore.chatPrice) {
                      chatStore.chatPrice.prompt = value;
                      setChatStore({ ...chatStore });
                    }
                  }}
                />

                <CustomPricingInput
                  id="completion-price"
                  label="Completion Price"
                  value={chatStore.chatPrice.completion}
                  onChange={(value) => {
                    if (chatStore.chatPrice) {
                      chatStore.chatPrice.completion = value;
                      setChatStore({ ...chatStore });
                    }
                  }}
                />

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="cached-prompt-price">
                      <Tr>Cached Prompt Price</Tr> (optional)
                    </Label>
                    <Checkbox
                      checked={chatStore.chatPrice.cached_prompt !== undefined}
                      onCheckedChange={(checked) => {
                        if (chatStore.chatPrice) {
                          chatStore.chatPrice.cached_prompt = checked
                            ? 0
                            : undefined;
                          setChatStore({ ...chatStore });
                        }
                      }}
                    />
                  </div>
                  {chatStore.chatPrice.cached_prompt !== undefined && (
                    <CustomPricingInput
                      id="cached-prompt-price"
                      label="Cached Prompt Price"
                      value={chatStore.chatPrice.cached_prompt}
                      onChange={(value) => {
                        if (chatStore.chatPrice) {
                          chatStore.chatPrice.cached_prompt = value;
                          setChatStore({ ...chatStore });
                        }
                      }}
                    />
                  )}
                </div>

                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={() => {
                    chatStore.chatPrice = undefined;
                    setChatStore({ ...chatStore });
                  }}
                >
                  <Tr>Delete Custom Pricing</Tr>
                </Button>
              </div>
            ) : (
              <div className="text-center space-y-4">
                <p className="text-muted-foreground">
                  <Tr>No custom pricing set</Tr>
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    chatStore.chatPrice = {
                      prompt: 0,
                      completion: 0,
                      cached_prompt: undefined,
                    };
                    setChatStore({ ...chatStore });
                  }}
                >
                  <Tr>Set Custom Pricing</Tr>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </AccordionContent>
    </AccordionItem>
  );
};
