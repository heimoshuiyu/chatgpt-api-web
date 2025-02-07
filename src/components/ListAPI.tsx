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

  return (
    <NavigationMenuItem>
      <NavigationMenuTrigger>
        <span className="lg:hidden">{shortLabel}</span>
        <span className="hidden lg:inline">
          {label}{" "}
          {API.find(
            (t: TemplateAPI) =>
              chatStore[apiField as keyof ChatStore] === t.endpoint &&
              chatStore[keyField as keyof ChatStore] === t.key
          )?.name &&
            `: ${
              API.find(
                (t: TemplateAPI) =>
                  chatStore[apiField as keyof ChatStore] === t.endpoint &&
                  chatStore[keyField as keyof ChatStore] === t.key
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
                    chatStore[apiField as keyof ChatStore] = t.endpoint;
                    // @ts-ignore
                    chatStore[keyField] = t.key;
                    setChatStore({
                      ...chatStore,
                    });
                  }}
                  className={cn(
                    "block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
                    chatStore[apiField as keyof ChatStore] === t.endpoint &&
                      chatStore[keyField as keyof ChatStore] === t.key
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
  const { templates, setTemplates } = useContext(AppContext);

  return (
    <NavigationMenuItem>
      <NavigationMenuTrigger>
        <span className="lg:hidden">Chat Template</span>
        <span className="hidden lg:inline">Chat Template</span>
      </NavigationMenuTrigger>
      <NavigationMenuContent>
        <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px]">
          {templates.map((t: TemplateChatStore, index: number) => (
            <ChatTemplateItem key={index} t={t} index={index} />
          ))}
        </ul>
      </NavigationMenuContent>
    </NavigationMenuItem>
  );
}

const ChatTemplateItem = ({
  t,
  index,
}: {
  t: TemplateChatStore;
  index: number;
}) => {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const { chatStore, setChatStore } = useContext(AppChatStoreContext);
  const { templates, setTemplates } = useContext(AppContext);

  return (
    <li
      onClick={() => {
        // Update chatStore with the selected template
        if (chatStore.history.length > 0 || chatStore.systemMessageContent) {
          console.log("you clicked", t.name);
          const confirm = window.confirm(
            "This will replace the current chat history. Are you sure? "
          );
          if (!confirm) return;
        }
        setChatStore({
          ...newChatStore({
            ...chatStore,
            ...{ use_this_history: t.history ?? chatStore.history },
            ...t,
          }),
        });
      }}
    >
      <NavigationMenuLink asChild>
        <a
          className={cn(
            "flex flex-row justify-between items-center select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
          )}
        >
          <div className="text-sm font-medium leading-non">{t.name}</div>
          <div onClick={(e) => e.stopPropagation()}>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <EditIcon />
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit Template</DialogTitle>
                </DialogHeader>
                <Label>Template Name</Label>
                <Input
                  value={t.name}
                  onBlur={(e) => {
                    t.name = e.target.value;
                    templates[index] = t;
                    setTemplates([...templates]);
                  }}
                />
                <p>
                  Raw JSON allows you to modify any content within the template.
                  You can remove unnecessary fields, and non-existent fields
                  will be inherited from the current session.
                </p>
                <Textarea
                  className="h-64"
                  value={JSON.stringify(t, null, 2)}
                  onBlur={(e) => {
                    try {
                      const json = JSON.parse(
                        e.target.value
                      ) as TemplateChatStore;
                      json.name = t.name;
                      templates[index] = json;
                      setTemplates([...templates]);
                    } catch (e) {
                      console.error(e);
                      alert("Invalid JSON");
                    }
                  }}
                />
                <Button
                  type="submit"
                  variant={"destructive"}
                  onClick={() => {
                    let confirm = window.confirm(
                      "Are you sure you want to delete this template?"
                    );
                    if (!confirm) return;
                    templates.splice(index, 1);
                    setTemplates([...templates]);
                    setDialogOpen(false);
                  }}
                >
                  Delete
                </Button>
                <Button type="submit" onClick={() => setDialogOpen(false)}>
                  Close
                </Button>
              </DialogContent>
            </Dialog>
          </div>
        </a>
      </NavigationMenuLink>
    </li>
  );
};

const APIListMenu: React.FC = () => {
  const ctx = useContext(AppContext);
  return (
    <div className="flex flex-col my-2 gap-2 w-full">
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
