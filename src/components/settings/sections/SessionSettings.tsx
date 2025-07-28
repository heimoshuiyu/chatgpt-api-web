import React, { useContext } from "react";
import { AppChatStoreContext, AppContext } from "@/pages/App";
import { isVailedJSON } from "@/utils/isVailedJSON";
import { TemplateTools } from "@/types/chatstore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { CheckIcon, BanIcon, SaveIcon } from "lucide-react";
import { LongInput } from "../ui/LongInput";
import { Tr } from "@/translate";

export const SessionSettings: React.FC = () => {
  const { chatStore } = useContext(AppChatStoreContext);
  const { templateTools, setTemplateTools } = useContext(AppContext);

  return (
    <AccordionItem value="session">
      <AccordionTrigger>
        <Tr>Session</Tr>
      </AccordionTrigger>
      <AccordionContent>
        <Card>
          <CardHeader className="flex flex-col items-stretch space-y-0 border-b p-0 sm:flex-row">
            <div className="flex flex-1 flex-col justify-center gap-1 px-6 py-5 sm:py-6">
              <CardTitle>Session Cost</CardTitle>
              <CardDescription>Cost of the current session.</CardDescription>
            </div>
            <div className="flex">
              <div className="flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 text-left even:border-l data-[active=true]:bg-muted/50 sm:border-l sm:border-t-0 sm:px-8 sm:py-6">
                <span className="text-xs text-muted-foreground">$ USD</span>
                <span className="text-lg font-bold leading-none sm:text-3xl">
                  {chatStore.cost?.toFixed(4)}
                </span>
              </div>
            </div>
          </CardHeader>
        </Card>

        <LongInput
          label="System Prompt"
          field="systemMessageContent"
          help="System prompt, used to indicate the role of ChatGPT and some preconditions, such as 'You are a helpful AI assistant' or 'You are a professional English translator, translate my words into English', please refer to the OpenAI API documentation"
        />

        <LongInput
          label="Tools String"
          field="toolsString"
          help="function call tools, should be valid json format in list"
        />

        <span className="pt-1">
          JSON Check:{" "}
          {isVailedJSON(chatStore.toolsString) ? (
            <CheckIcon className="inline w-3 h-3" />
          ) : (
            <BanIcon className="inline w-3 h-3" />
          )}
        </span>

        <div className="box">
          <div className="flex justify-evenly flex-wrap">
            {chatStore.toolsString.trim() && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Tr>Save Tools</Tr>
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Save the tool as Template</DialogTitle>
                    <DialogDescription>
                      Once saved, you can easily access your tools from the
                      dropdown menu.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex items-center space-x-2">
                    <div className="grid flex-1 gap-2">
                      <Label htmlFor="toolsName" className="sr-only">
                        Name
                      </Label>
                      <Input id="toolsName" placeholder="Type Something..." />
                      <Label
                        id="toolsNameError"
                        className="text-red-600"
                      ></Label>
                    </div>
                  </div>
                  <DialogFooter className="sm:justify-start">
                    <DialogClose asChild>
                      <Button
                        type="submit"
                        size="sm"
                        className="px-3"
                        onClick={() => {
                          const name = document.getElementById(
                            "toolsName" as string
                          ) as HTMLInputElement;
                          if (!name.value) {
                            const errorLabel = document.getElementById(
                              "toolsNameError" as string
                            ) as HTMLLabelElement;
                            if (errorLabel) {
                              errorLabel.textContent = "Tool name is required.";
                            }
                            return;
                          }
                          const newToolsTmp: TemplateTools = {
                            name: name.value,
                            toolsString: chatStore.toolsString,
                          };
                          templateTools.push(newToolsTmp);
                          setTemplateTools([...templateTools]);
                        }}
                      >
                        <SaveIcon className="w-4 h-4" /> Save
                        <span className="sr-only">Save</span>
                      </Button>
                    </DialogClose>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
};
