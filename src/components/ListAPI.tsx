import React from "react";
import { ChatStore, TemplateAPI, TemplateChatStore } from "@/types/chatstore";
import { Tr } from "@/translate";

import {
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useContext } from "react";
import { AppChatStoreContext, AppContext } from "@/pages/App";
import {
  NavigationMenu,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { BrushIcon } from "lucide-react";

import { useToast } from "@/hooks/use-toast";
import { newChatStore } from "@/types/newChatstore";

interface APITemplateDropdownProps {
  label: string;
  shortLabel: string;
  apiField: string;
  keyField: string;
}
function APIsDropdownList({
  label,
  shortLabel,
  apiField,
  keyField,
}: APITemplateDropdownProps) {
  const ctxAppChatStore = useContext(AppChatStoreContext);
  const ctxApp = useContext(AppContext);
  let API = ctxApp.templateAPIs;
  if (label === "Chat API") {
    API = ctxApp.templateAPIs;
  } else if (label === "Whisper API") {
    API = ctxApp.templateAPIsWhisper;
  } else if (label === "TTS API") {
    API = ctxApp.templateAPIsTTS;
  } else if (label === "Image Gen API") {
    API = ctxApp.templateAPIsImageGen;
  }

  return (
    <NavigationMenuItem>
      <NavigationMenuTrigger>
        <span className="lg:hidden">{shortLabel}</span>
        <span className="hidden lg:inline">
          {label}{" "}
          {API.find(
            (t: TemplateAPI) =>
              ctxAppChatStore.chatStore[apiField as keyof ChatStore] ===
                t.endpoint &&
              ctxAppChatStore.chatStore[keyField as keyof ChatStore] === t.key
          )?.name &&
            `: ${
              API.find(
                (t: TemplateAPI) =>
                  ctxAppChatStore.chatStore[apiField as keyof ChatStore] ===
                    t.endpoint &&
                  ctxAppChatStore.chatStore[keyField as keyof ChatStore] ===
                    t.key
              )?.name
            }`}
        </span>
      </NavigationMenuTrigger>
      <NavigationMenuContent>
        <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px] ">
          {API.map((t: TemplateAPI, index: number) => (
            <li key={index}>
              <NavigationMenuLink asChild>
                <a
                  onClick={() => {
                    // @ts-ignore
                    ctxAppChatStore.chatStore[apiField as keyof ChatStore] =
                      t.endpoint;
                    // @ts-ignore
                    ctxAppChatStore.chatStore[keyField] = t.key;
                    ctxAppChatStore.setChatStore({
                      ...ctxAppChatStore.chatStore,
                    });
                  }}
                  className={cn(
                    "block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
                    ctxAppChatStore.chatStore[apiField as keyof ChatStore] ===
                      t.endpoint &&
                      ctxAppChatStore.chatStore[keyField as keyof ChatStore] ===
                        t.key
                      ? "bg-accent text-accent-foreground"
                      : ""
                  )}
                >
                  <div className="text-sm font-medium leading-none">
                    {t.name}
                  </div>
                  <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                    {new URL(t.endpoint).host}
                  </p>
                </a>
              </NavigationMenuLink>
            </li>
          ))}
        </ul>
      </NavigationMenuContent>
    </NavigationMenuItem>
  );
}

function ToolsDropdownList() {
  const { chatStore, setChatStore } = useContext(AppChatStoreContext);
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);

  const ctx = useContext(AppContext);

  return (
    <div className="flex items-center space-x-4 mx-3">
      <p className="text-sm text-muted-foreground">{Tr(`Tools`)}</p>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-[150px] justify-start">
            {chatStore.toolsString ? (
              <>
                {
                  ctx.templateTools.find(
                    (t) => t.toolsString === chatStore.toolsString
                  )?.name
                }
              </>
            ) : (
              <>+ {Tr(`Set tools`)}</>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0" side="bottom" align="start">
          <Command>
            <CommandInput placeholder="You can search..." />
            <CommandList>
              <CommandEmpty>{Tr(`No results found.`)}</CommandEmpty>
              <CommandGroup>
                {chatStore.toolsString && (
                  <CommandItem
                    key={-1}
                    value=""
                    onSelect={() => {
                      chatStore.toolsString = "";
                      setChatStore({ ...chatStore });
                      toast({
                        title: "Tools Cleaned",
                        description: "Tools cleaned successfully",
                      });
                      setOpen(false);
                    }}
                  >
                    <BrushIcon /> {Tr(`Clear tools`)}
                  </CommandItem>
                )}
                {ctx.templateTools.map((t, index) => (
                  <CommandItem
                    key={index}
                    value={t.toolsString}
                    onSelect={(value) => {
                      chatStore.toolsString = value;
                      setChatStore({ ...chatStore });
                    }}
                  >
                    {t.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

function ChatTemplateDropdownList() {
  const ctx = useContext(AppContext);

  const { chatStore, setChatStore } = useContext(AppChatStoreContext);
  const { templates } = useContext(AppContext);

  return (
    <NavigationMenuItem>
      <NavigationMenuTrigger>
        <span className="lg:hidden">Chat Template</span>
        <span className="hidden lg:inline">Chat Template</span>
      </NavigationMenuTrigger>
      <NavigationMenuContent>
        <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px]">
          {templates.map((t: TemplateChatStore, index: number) => (
            <li key={index}>
              <NavigationMenuLink asChild>
                <a
                  onClick={() => {
                    // Update chatStore with the selected template
                    if (
                      chatStore.history.length > 0 ||
                      chatStore.systemMessageContent
                    ) {
                      const confirm = window.confirm(
                        "This will replace the current chat history. Are you sure?"
                      );
                      if (!confirm) return;
                    }
                    setChatStore({ ...t });
                  }}
                  className={cn(
                    "block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                  )}
                >
                  <div className="text-sm font-medium leading-none">
                    {t.name}
                  </div>
                </a>
              </NavigationMenuLink>
            </li>
          ))}
        </ul>
      </NavigationMenuContent>
    </NavigationMenuItem>
  );
}

const APIListMenu: React.FC = () => {
  const ctx = useContext(AppContext);
  return (
    <div className="flex flex-col m-2 gap-2 w-full">
      {ctx.templateTools.length > 0 && <ToolsDropdownList />}
      <NavigationMenu>
        <NavigationMenuList>
          {ctx.templates.length > 0 && <ChatTemplateDropdownList />}
          {ctx.templateAPIs.length > 0 && (
            <APIsDropdownList
              label="Chat API"
              shortLabel="Chat"
              apiField="apiEndpoint"
              keyField="apiKey"
            />
          )}
          {ctx.templateAPIsWhisper.length > 0 && (
            <APIsDropdownList
              label="Whisper API"
              shortLabel="Whisper"
              apiField="whisper_api"
              keyField="whisper_key"
            />
          )}
          {ctx.templateAPIsTTS.length > 0 && (
            <APIsDropdownList
              label="TTS API"
              shortLabel="TTS"
              apiField="tts_api"
              keyField="tts_key"
            />
          )}
          {ctx.templateAPIsImageGen.length > 0 && (
            <APIsDropdownList
              label="Image Gen API"
              shortLabel="ImgGen"
              apiField="image_gen_api"
              keyField="image_gen_key"
            />
          )}
        </NavigationMenuList>
      </NavigationMenu>
    </div>
  );
};

export default APIListMenu;
