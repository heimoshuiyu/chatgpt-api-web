import React, { useContext } from "react";
import {
  ChatStore,
  TemplateAPI,
  TemplateChatStore,
  TemplateTools,
} from "@/types/chatstore";
import { Tr } from "@/translate";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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
import { BrushIcon, DeleteIcon, EditIcon } from "lucide-react";

import { useToast } from "@/hooks/use-toast";
import { newChatStore } from "@/types/newChatstore";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTrigger,
} from "./ui/dialog";
import { DialogTitle } from "@radix-ui/react-dialog";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { SetAPIsTemplate } from "./setAPIsTemplate";
import { isVailedJSON } from "@/utils/isVailedJSON";

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
  const { chatStore, setChatStore } = useContext(AppChatStoreContext);
  const {
    templates,
    templateAPIs,
    templateAPIsImageGen,
    templateAPIsTTS,
    templateAPIsWhisper,
    setTemplates,
    setTemplateAPIs,
    setTemplateAPIsImageGen,
    setTemplateAPIsTTS,
    setTemplateAPIsWhisper,
    setTemplateTools,
  } = useContext(AppContext);
  let API = templateAPIs;
  if (label === "Chat API") {
    API = templateAPIs;
  } else if (label === "Whisper API") {
    API = templateAPIsWhisper;
  } else if (label === "TTS API") {
    API = templateAPIsTTS;
  } else if (label === "Image Gen API") {
    API = templateAPIsImageGen;
  }

  const [open, setOpen] = React.useState(false);

  return (
    <div className="flex items-center space-x-4 mx-3">
      <p className="text-sm text-muted-foreground">
        <Tr>{label}</Tr>
      </p>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-[150px] justify-start">
            {API.find(
              (t: TemplateAPI) =>
                chatStore[apiField as keyof ChatStore] === t.endpoint &&
                chatStore[keyField as keyof ChatStore] === t.key
            )?.name || `+ ${shortLabel}`}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0" side="bottom" align="start">
          <Command>
            <CommandInput placeholder="Search template..." />
            <CommandList>
              <CommandEmpty>
                <Tr>No results found.</Tr>
              </CommandEmpty>
              <CommandGroup>
                {API.map((t: TemplateAPI, index: number) => (
                  <CommandItem
                    key={index}
                    value={t.name}
                    onSelect={() => {
                      setChatStore({
                        ...chatStore,
                        [apiField]: t.endpoint,
                        [keyField]: t.key,
                      });
                      setOpen(false); // Close popover after selecting
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

function ToolsDropdownList() {
  const { chatStore, setChatStore } = useContext(AppChatStoreContext);
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);

  const ctx = useContext(AppContext);

  return (
    <div className="flex items-center space-x-4 mx-3">
      <p className="text-sm text-muted-foreground">
        <Tr>Tools</Tr>
      </p>
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
              <>
                + <Tr>Set tools</Tr>
              </>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0" side="bottom" align="start">
          <Command>
            <CommandInput placeholder="You can search..." />
            <CommandList>
              <CommandEmpty>
                <Tr>No results found.</Tr>
              </CommandEmpty>
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
                    <BrushIcon /> <Tr>Clear tools</Tr>
                  </CommandItem>
                )}
                {ctx.templateTools.map((t: TemplateTools, index: number) => (
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
  const { templates, setTemplates } = useContext(AppContext);
  const [open, setOpen] = React.useState(false);

  return (
    <div className="flex items-center space-x-4 mx-3">
      <p className="text-sm text-muted-foreground">
        <Tr>Chat Template</Tr>
      </p>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-[150px] justify-start">
            <Tr>Select Template</Tr>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0" side="bottom" align="start">
          <Command>
            <CommandInput placeholder="Search template..." />
            <CommandList>
              <CommandEmpty>
                <Tr>No results found.</Tr>
              </CommandEmpty>
              <CommandGroup>
                {templates.map((t: TemplateChatStore, index: number) => (
                  <CommandItem
                    key={index}
                    value={t.name}
                    onSelect={() => {
                      // Update chatStore with the selected template
                      if (
                        chatStore.history.length > 0 ||
                        chatStore.systemMessageContent
                      ) {
                        console.log("you clicked", t.name);
                        const confirm = window.confirm(
                          "This will replace the current chat history. Are you sure? "
                        );
                        if (!confirm) {
                          setOpen(false); // Close popover even if not confirmed
                          return;
                        }
                      }
                      setChatStore({
                        ...newChatStore({
                          ...chatStore,
                          ...{
                            use_this_history: t.history ?? chatStore.history,
                          },
                          ...t,
                        }),
                      });
                      setOpen(false); // Close popover after selecting
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

const APIListMenu: React.FC = () => {
  const ctx = useContext(AppContext);
  return (
    <div className="flex flex-col my-2 gap-2 w-full">
      {ctx.templateTools.length > 0 && <ToolsDropdownList />}
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
    </div>
  );
};

export default APIListMenu;
