import { themeChange } from "theme-change";
import { useEffect, useState } from "react";
import React from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Accordion } from "@/components/ui/accordion";
import { TriangleAlertIcon } from "lucide-react";
import { NonOverflowScrollArea } from "@/components/ui/scroll-area";
import { AppChatStoreContext } from "@/pages/App";
import { useContext } from "react";
import { Tr } from "@/translate";

// Import section components
import { SessionSettings } from "./settings/sections/SessionSettings";
import { SystemSettings } from "./settings/sections/SystemSettings";
import { ChatSettings } from "./settings/sections/ChatSettings";
import { PricingSettings } from "./settings/sections/PricingSettings";
import { WhisperSettings } from "./settings/sections/WhisperSettings";
import { TTSSettings } from "./settings/sections/TTSSettings";
import { ImageGenSettings } from "./settings/sections/ImageGenSettings";
import { TemplatesSettings } from "./settings/sections/TemplatesSettings";
import { MCPSettings } from "./settings/sections/MCPSettings";
import { ThemeSettings } from "./settings/sections/ThemeSettings";

export default function Settings() {
  const { chatStore } = useContext(AppChatStoreContext);
  const [open, setOpen] = useState<boolean>(false);

  useEffect(() => {
    themeChange(false);
    const handleKeyPress = (event: any) => {
      if (event.keyCode === 27) {
        // keyCode for ESC key is 27
        setOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyPress);

    return () => {
      document.removeEventListener("keydown", handleKeyPress);
    };
  }, []); // The empty dependency array ensures that the effect runs only once

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="flex-grow">
          <Tr>Settings</Tr>
          {(!chatStore.apiKey || !chatStore.apiEndpoint) && (
            <TriangleAlertIcon className="w-4 h-4 ml-1 text-yellow-500" />
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="flex flex-col overflow-scroll">
        <NonOverflowScrollArea>
          <SheetHeader>
            <SheetTitle>
              <Tr>Settings</Tr>
            </SheetTitle>
            <SheetDescription>
              <Tr>You can customize all the settings here</Tr>
            </SheetDescription>
          </SheetHeader>
          <Accordion type="multiple" className="w-full">
            <SessionSettings />
            <SystemSettings />
            <ThemeSettings />
            <ChatSettings />
            <PricingSettings />
            <WhisperSettings />
            <TTSSettings />
            <ImageGenSettings />
            <TemplatesSettings />
            <MCPSettings />
          </Accordion>
          <div className="pt-4 space-y-2">
            <p className="text-sm text-muted-foreground text-center">
              chatgpt-api-web ChatStore <Tr>Version</Tr>
              {chatStore.chatgpt_api_web_version}
            </p>
            <p className="text-sm text-muted-foreground text-center">
              <Tr>Documents and source code are avaliable here</Tr>:{" "}
              <a
                className="underline hover:text-primary transition-colors"
                href="https://github.com/heimoshuiyu/chatgpt-api-web"
                target="_blank"
                rel="noopener noreferrer"
              >
                github.com/heimoshuiyu/chatgpt-api-web
              </a>
            </p>
          </div>
        </NonOverflowScrollArea>
      </SheetContent>
    </Sheet>
  );
}
