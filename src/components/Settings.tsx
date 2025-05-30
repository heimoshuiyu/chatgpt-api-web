import { themeChange } from "theme-change";

import { useRef, useCallback } from "react";
import { useContext, useEffect, useState, Dispatch } from "react";
import React from "react";
import { clearTotalCost, getTotalCost } from "@/utils/totalCost";
import { ChatStore, TemplateChatStore, TemplateTools } from "@/types/chatstore";
import { models } from "@/types/models";
import { tr, Tr, langCodeContext, LANG_OPTIONS } from "@/translate";
import { isVailedJSON } from "@/utils/isVailedJSON";
import { SetAPIsTemplate } from "@/components/setAPIsTemplate";
import { autoHeight } from "@/utils/textAreaHelp";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  BanIcon,
  CheckIcon,
  CircleEllipsisIcon,
  CogIcon,
  EyeIcon,
  InfoIcon,
  KeyIcon,
  ListIcon,
  MoveHorizontalIcon,
  SaveIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { NonOverflowScrollArea, ScrollArea } from "@/components/ui/scroll-area";
import { AppChatStoreContext, AppContext } from "@/pages/App";
import { toast } from "@/hooks/use-toast";
import { TemplateAttributeDialog } from "@/components/TemplateAttributeDialog";

const TTS_VOICES: string[] = [
  "alloy",
  "echo",
  "fable",
  "onyx",
  "nova",
  "shimmer",
];
const TTS_FORMAT: string[] = ["mp3", "opus", "aac", "flac"];

const Help = (props: { children: any; help: string; field: string }) => {
  return (
    <div className="b-2">
      <label className="form-control w-full">{props.children}</label>
    </div>
  );
};

const SelectModel = (props: { help: string }) => {
  const { chatStore, setChatStore } = useContext(AppChatStoreContext);

  let shouldIUseCustomModel: boolean = true;
  for (const model in models) {
    if (chatStore.model === model) {
      shouldIUseCustomModel = false;
    }
  }
  const [useCustomModel, setUseCustomModel] = useState(shouldIUseCustomModel);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2">
          <ListIcon className="w-4 h-4" />
          Model
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon">
                <InfoIcon className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Model Selection</DialogTitle>
                <DialogDescription>{props.help}</DialogDescription>
              </DialogHeader>
            </DialogContent>
          </Dialog>
        </Label>

        <div className="flex items-center gap-2">
          <Label className="flex items-center gap-2">
            <CogIcon className="w-4 h-4" />
            <Tr>Custom</Tr>
          </Label>
          <Checkbox
            checked={useCustomModel}
            onCheckedChange={() => setUseCustomModel(!useCustomModel)}
          />
        </div>
      </div>

      {useCustomModel ? (
        <Input
          value={chatStore.model}
          onBlur={(e: React.ChangeEvent<HTMLInputElement>) => {
            chatStore.model = e.target.value;
            setChatStore({ ...chatStore });
          }}
        />
      ) : (
        <Select
          value={chatStore.model}
          onValueChange={(model: string) => {
            chatStore.model = model;
            chatStore.maxTokens = models[model].maxToken;
            setChatStore({ ...chatStore });
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a model" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Models</SelectLabel>
              {Object.keys(models).map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      )}
    </div>
  );
};

const LongInput = React.memo(
  (props: {
    field: "systemMessageContent" | "toolsString";
    label: string;
    help: string;
  }) => {
    const { chatStore, setChatStore } = useContext(AppChatStoreContext);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [localValue, setLocalValue] = useState(chatStore[props.field]);

    // Update height when value changes
    useEffect(() => {
      if (textareaRef.current) {
        autoHeight(textareaRef.current);
      }
    }, [localValue]);

    // Sync local value with chatStore when it changes externally
    useEffect(() => {
      setLocalValue(chatStore[props.field]);
    }, [chatStore[props.field]]);

    const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      setLocalValue(event.target.value);
    };

    const handleBlur = () => {
      if (localValue !== chatStore[props.field]) {
        chatStore[props.field] = localValue;
        setChatStore({ ...chatStore });
      }
    };

    return (
      <div>
        <Label htmlFor="name" className="text-right">
          {props.label}{" "}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon">
                <InfoIcon />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>{props.label} Help</DialogTitle>
              </DialogHeader>
              {props.help}
            </DialogContent>
          </Dialog>
        </Label>

        <Textarea
          ref={textareaRef}
          mockOnChange={false}
          className="h-24 w-full"
          value={localValue}
          onChange={handleChange}
          onBlur={handleBlur}
        />
      </div>
    );
  }
);

const InputField = (props: {
  field:
    | "apiKey"
    | "apiEndpoint"
    | "whisper_api"
    | "whisper_key"
    | "tts_api"
    | "tts_key"
    | "image_gen_api"
    | "image_gen_key";
  help: string;
}) => {
  const { chatStore, setChatStore } = useContext(AppChatStoreContext);
  const [hideInput, setHideInput] = useState(true);
  return (
    <>
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <KeyIcon className="w-4 h-4" />
          {props.field}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon">
                <InfoIcon className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{props.field}</DialogTitle>
                <DialogDescription>{props.help}</DialogDescription>
              </DialogHeader>
            </DialogContent>
          </Dialog>
        </Label>

        <div className="flex w-full items-center space-x-2">
          <Input
            type={hideInput ? "password" : "text"}
            value={chatStore[props.field]}
            onBlur={(event: React.ChangeEvent<HTMLInputElement>) => {
              chatStore[props.field] = event.target.value;
              setChatStore({ ...chatStore });
            }}
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setHideInput(!hideInput)}
          >
            {hideInput ? (
              <EyeIcon className="h-4 w-4" />
            ) : (
              <KeyIcon className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </>
  );
};

const Slicer = (props: {
  field: "temperature" | "top_p" | "tts_speed";
  help: string;
  min: number;
  max: number;
}) => {
  const { chatStore, setChatStore } = useContext(AppChatStoreContext);
  const enable_filed_name: "temperature_enabled" | "top_p_enabled" =
    `${props.field}_enabled` as any;

  const enabled = chatStore[enable_filed_name];

  if (enabled === null || enabled === undefined) {
    if (props.field === "temperature") {
      chatStore[enable_filed_name] = true;
    }
    if (props.field === "top_p") {
      chatStore[enable_filed_name] = false;
    }
  }

  const setEnabled = (state: boolean) => {
    chatStore[enable_filed_name] = state;
    setChatStore({ ...chatStore });
  };
  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        <MoveHorizontalIcon className="w-4 h-4" />
        {props.field}
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon">
              <InfoIcon className="w-4 h-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{props.field}</DialogTitle>
              <DialogDescription>{props.help}</DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>
        <Checkbox
          checked={chatStore[enable_filed_name]}
          onCheckedChange={(checked: boolean) => setEnabled(!!checked)}
        />
        {!chatStore[enable_filed_name] && (
          <span className="text-xs text-muted-foreground">disabled</span>
        )}
      </Label>

      {enabled && (
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <Slider
              disabled={!enabled}
              min={props.min}
              max={props.max}
              step={0.01}
              value={[chatStore[props.field]]}
              onValueChange={(value) => {
                chatStore[props.field] = value[0];
                setChatStore({ ...chatStore });
              }}
            />
          </div>
          <Input
            type="number"
            disabled={!enabled}
            className="w-24"
            value={chatStore[props.field]}
            onBlur={(e: React.ChangeEvent<HTMLInputElement>) => {
              const value = parseFloat(e.target.value);
              chatStore[props.field] = value;
              setChatStore({ ...chatStore });
            }}
          />
        </div>
      )}
    </div>
  );
};

const Number = (props: {
  field:
    | "totalTokens"
    | "maxTokens"
    | "maxGenTokens"
    | "tokenMargin"
    | "postBeginIndex"
    | "presence_penalty"
    | "frequency_penalty";
  readOnly: boolean;
  help: string;
}) => {
  const { chatStore, setChatStore } = useContext(AppChatStoreContext);
  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        <CircleEllipsisIcon className="h-4 w-4" />
        {props.field}
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon">
              <InfoIcon className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{props.field}</DialogTitle>
              <DialogDescription>{props.help}</DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>

        {props.field === "maxGenTokens" && (
          <Checkbox
            checked={chatStore.maxGenTokens_enabled}
            onCheckedChange={() => {
              const newChatStore = { ...chatStore };
              newChatStore.maxGenTokens_enabled =
                !newChatStore.maxGenTokens_enabled;
              setChatStore({ ...newChatStore });
            }}
          />
        )}

        {props.field === "presence_penalty" && (
          <Checkbox
            checked={chatStore.presence_penalty_enabled}
            onCheckedChange={() => {
              const newChatStore = { ...chatStore };
              newChatStore.presence_penalty_enabled =
                !newChatStore.presence_penalty_enabled;
              setChatStore({ ...newChatStore });
            }}
          />
        )}

        {props.field === "frequency_penalty" && (
          <Checkbox
            checked={chatStore.frequency_penalty_enabled}
            onCheckedChange={() => {
              const newChatStore = { ...chatStore };
              newChatStore.frequency_penalty_enabled =
                !newChatStore.frequency_penalty_enabled;
              setChatStore({ ...newChatStore });
            }}
          />
        )}
      </Label>

      <Input
        type="number"
        readOnly={props.readOnly}
        disabled={
          props.field === "maxGenTokens" && !chatStore.maxGenTokens_enabled
        }
        value={chatStore[props.field]}
        onBlur={(event: React.ChangeEvent<HTMLInputElement>) => {
          let newNumber = parseFloat(event.target.value);
          if (newNumber < 0) newNumber = 0;
          chatStore[props.field] = newNumber;
          setChatStore({ ...chatStore });
        }}
      />
    </div>
  );
};

const DefaultRenderMDCheckbox = () => {
  const { defaultRenderMD, setDefaultRenderMD } = useContext(AppContext);
  return (
    <div className="flex items-center space-x-2">
      <div className="flex items-center">
        <Checkbox
          id="defaultRenderMD-checkbox"
          checked={defaultRenderMD}
          onCheckedChange={(checked: boolean) => {
            setDefaultRenderMD(checked);
          }}
        />
      </div>
      <label
        htmlFor="defaultRenderMD-checkbox"
        className="flex items-center gap-2 font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
      >
        Render Markdown by Default
      </label>
    </div>
  );
};

const Choice = (props: {
  field: "streamMode" | "develop_mode" | "json_mode" | "logprobs";
  help: string;
}) => {
  const { chatStore, setChatStore } = useContext(AppChatStoreContext);

  return (
    <div className="flex items-center space-x-2">
      <div className="flex items-center">
        <Checkbox
          id={`${props.field}-checkbox`}
          checked={chatStore[props.field]}
          onCheckedChange={(checked: boolean) => {
            chatStore[props.field] = checked;
            setChatStore({ ...chatStore });
          }}
        />
      </div>
      <label
        htmlFor={`${props.field}-checkbox`}
        className="flex items-center gap-2 font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
      >
        {props.field}
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon">
              <InfoIcon />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{props.field} Help</DialogTitle>
            </DialogHeader>
            {props.help}
          </DialogContent>
        </Dialog>
      </label>
    </div>
  );
};

const APIShowBlock = (props: {
  index: number;
  label: string;
  type: string;
  apiField: string;
  keyField: string;
}) => {
  const {
    templates,
    setTemplates,
    templateAPIs,
    setTemplateAPIs,
    templateAPIsWhisper,
    setTemplateAPIsWhisper,
    templateAPIsTTS,
    setTemplateAPIsTTS,
    templateAPIsImageGen,
    setTemplateAPIsImageGen,
    templateTools,
    setTemplateTools,
    selectedChatIndex,
  } = useContext(AppContext);
  return (
    <div className="border-b border-gray-200 pb-4 pt-4">
      <Badge variant="outline">{props.type}</Badge> <Label>{props.label}</Label>
      <div className="mt-4">
        <div className="grid w-full max-w-sm items-center gap-1.5 mt-2">
          <Label>Endpoint</Label>
          <div className="w-72">
            <pre className="text-xs whitespace-pre-wrap">{props.apiField}</pre>
          </div>
        </div>
        <div className="grid w-full max-w-sm items-center gap-1.5 mt-2">
          <Label>Key</Label>
          {props.keyField ? (
            <div className="w-72">
              <pre className="text-xs whitespace-pre-wrap">
                {props.keyField}
              </pre>
            </div>
          ) : (
            <span className="text-gray-500 italic">empty</span>
          )}
        </div>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="mt-2 mr-2"
        onClick={() => {
          const name = prompt(`Give template ${props.label} a new name`);
          if (!name) return;
          if (props.type === "Chat") {
            templateAPIs[props.index].name = name;
            setTemplateAPIs(structuredClone(templateAPIs));
          } else if (props.type === "Whisper") {
            templateAPIsWhisper[props.index].name = name;
            setTemplateAPIsWhisper(structuredClone(templateAPIsWhisper));
          } else if (props.type === "TTS") {
            templateAPIsTTS[props.index].name = name;
            setTemplateAPIsTTS(structuredClone(templateAPIsTTS));
          } else if (props.type === "ImgGen") {
            templateAPIsImageGen[props.index].name = name;
            setTemplateAPIsImageGen(structuredClone(templateAPIsImageGen));
          }
        }}
      >
        Change Name
      </Button>
      <Button
        variant="destructive"
        size="sm"
        className="mt-2"
        onClick={() => {
          if (
            !confirm(
              `Are you sure to delete ${props.label}(${props.type}) API?`
            )
          ) {
            return;
          }
          if (props.type === "Chat") {
            templateAPIs.splice(props.index, 1);
            setTemplateAPIs(structuredClone(templateAPIs));
          } else if (props.type === "Whisper") {
            templateAPIsWhisper.splice(props.index, 1);
            setTemplateAPIsWhisper(structuredClone(templateAPIsWhisper));
          } else if (props.type === "TTS") {
            templateAPIsTTS.splice(props.index, 1);
            setTemplateAPIsTTS(structuredClone(templateAPIsTTS));
          } else if (props.type === "ImgGen") {
            templateAPIsImageGen.splice(props.index, 1);
            setTemplateAPIsImageGen(structuredClone(templateAPIsImageGen));
          }
        }}
      >
        Delete
      </Button>
    </div>
  );
};

const ToolsShowBlock = (props: {
  index: number;
  label: string;
  content: string;
}) => {
  const {
    templates,
    setTemplates,
    templateAPIs,
    setTemplateAPIs,
    templateAPIsWhisper,
    setTemplateAPIsWhisper,
    templateAPIsTTS,
    setTemplateAPIsTTS,
    templateAPIsImageGen,
    setTemplateAPIsImageGen,
    templateTools,
    setTemplateTools,
    selectedChatIndex,
  } = useContext(AppContext);
  return (
    <div className="border-b border-gray-200 pb-4 pt-4">
      <Badge variant="outline">Tool</Badge> <Label>{props.label}</Label>
      <div className="mt-4">
        <div className="grid w-full max-w-sm items-center gap-1.5 mt-2">
          <Label>Content</Label>
          <ScrollArea className="w-72 whitespace-nowrap rounded-md border">
            <pre className="text-xs">
              {JSON.stringify(JSON.parse(props.content), null, 2)}
            </pre>
          </ScrollArea>
        </div>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="mt-2 mr-2"
        onClick={() => {
          const name = prompt(`Give the tool ${props.label} a new name`);
          if (!name) return;
          templateTools[props.index].name = name;
          setTemplateTools(structuredClone(templateTools));
        }}
      >
        Edit
      </Button>
      <Button
        variant="destructive"
        size="sm"
        className="mt-2"
        onClick={() => {
          if (!confirm(`Are you sure to delete ${props.label} Tool?`)) {
            return;
          }
          templateTools.splice(props.index, 1);
          setTemplateTools(structuredClone(templateTools));
        }}
      >
        Delete
      </Button>
    </div>
  );
};

export default (props: {}) => {
  const { chatStore, setChatStore } = useContext(AppChatStoreContext);
  const {
    templates,
    setTemplates,
    templateAPIs,
    setTemplateAPIs,
    templateAPIsWhisper,
    setTemplateAPIsWhisper,
    templateAPIsTTS,
    setTemplateAPIsTTS,
    templateAPIsImageGen,
    setTemplateAPIsImageGen,
    templateTools,
    setTemplateTools,
    selectedChatIndex,
  } = useContext(AppContext);

  let link =
    location.protocol +
    "//" +
    location.host +
    location.pathname +
    `?key=${encodeURIComponent(chatStore.apiKey)}&api=${encodeURIComponent(
      chatStore.apiEndpoint
    )}&mode=${chatStore.streamMode ? "stream" : "fetch"}&model=${
      chatStore.model
    }&sys=${encodeURIComponent(chatStore.systemMessageContent)}`;
  if (chatStore.develop_mode) {
    link = link + `&dev=true`;
  }

  const importFileRef = useRef<any>(null);
  const [totalCost, setTotalCost] = useState(getTotalCost());
  // @ts-ignore
  const { langCode, setLangCode } = useContext(langCodeContext);
  const [open, setOpen] = useState<boolean>(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);

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
            <AccordionItem value="session">
              <AccordionTrigger>
                <Tr>Session</Tr>
              </AccordionTrigger>
              <AccordionContent>
                <Card>
                  <CardHeader className="flex flex-col items-stretch space-y-0 border-b p-0 sm:flex-row">
                    <div className="flex flex-1 flex-col justify-center gap-1 px-6 py-5 sm:py-6">
                      <CardTitle>Session Cost</CardTitle>
                      <CardDescription>
                        Cost of the current session.
                      </CardDescription>
                    </div>
                    <div className="flex">
                      <div className="flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 text-left even:border-l data-[active=true]:bg-muted/50 sm:border-l sm:border-t-0 sm:px-8 sm:py-6">
                        <span className="text-xs text-muted-foreground">
                          $ USD
                        </span>
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
                  {...props}
                />

                <LongInput
                  label="Tools String"
                  field="toolsString"
                  help="function call tools, should be valid json format in list"
                  {...props}
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
                              Once saved, you can easily access your tools from
                              the dropdown menu.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="flex items-center space-x-2">
                            <div className="grid flex-1 gap-2">
                              <Label htmlFor="toolsName" className="sr-only">
                                Name
                              </Label>
                              <Input
                                id="toolsName"
                                placeholder="Type Something..."
                              />
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
                                      errorLabel.textContent =
                                        "Tool name is required.";
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
            <AccordionItem value="system">
              <AccordionTrigger>
                <Tr>System</Tr>
              </AccordionTrigger>
              <AccordionContent>
                <>
                  <Card>
                    <CardHeader className="flex flex-col items-stretch space-y-0 border-b p-0 sm:flex-row">
                      <div className="flex flex-1 flex-col justify-center gap-1 px-6 py-5 sm:py-6">
                        <CardTitle>
                          <Tr>Accumulated Cost</Tr>
                        </CardTitle>
                        <CardDescription>
                          <Tr>in all sessions</Tr>
                        </CardDescription>
                      </div>
                      <div className="flex">
                        <div className="flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 text-left even:border-l data-[active=true]:bg-muted/50 sm:border-l sm:border-t-0 sm:px-8 sm:py-6">
                          <span className="text-xs text-muted-foreground">
                            $ USD
                          </span>
                          <span className="text-lg font-bold leading-none sm:text-3xl">
                            {totalCost.toFixed(4)}
                          </span>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                  <div className="flex justify-end mt-2">
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        clearTotalCost();
                        setTotalCost(getTotalCost());
                      }}
                    >
                      <Tr>Reset Total Cost</Tr>
                    </Button>
                  </div>
                  <Choice
                    field="develop_mode"
                    help={tr(
                      "Develop Mode, enable to show more options and features",
                      langCode
                    )}
                    {...props}
                  />
                  <DefaultRenderMDCheckbox />
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>
                        <Tr>Language</Tr>
                      </Label>
                      <Select value={langCode} onValueChange={setLangCode}>
                        <SelectTrigger className="w-full">
                          <SelectValue
                            placeholder={tr("Select language", langCode)}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectLabel>
                              <Tr>Languages</Tr>
                            </SelectLabel>
                            {Object.keys(LANG_OPTIONS).map((opt) => (
                              <SelectItem key={opt} value={opt}>
                                {LANG_OPTIONS[opt].name}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>
                        <Tr>Quick Actions</Tr>
                      </Label>
                      <div className="space-y-2">
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => {
                            navigator.clipboard.writeText(link);
                            toast({
                              title: tr(`Copied link:`, langCode),
                              description: `${link}`,
                            });
                          }}
                        >
                          <Tr>Copy Setting Link</Tr>
                        </Button>

                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="destructive" className="w-full">
                              <Tr>Clear History</Tr>
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>
                                <Tr>Are you absolutely sure?</Tr>
                              </DialogTitle>
                              <DialogDescription>
                                <Tr>
                                  This action cannot be undone. This will
                                  permanently delete all chat history.
                                </Tr>
                              </DialogDescription>
                            </DialogHeader>

                            <DialogFooter>
                              <Button
                                variant="destructive"
                                onClick={() => {
                                  chatStore.history = chatStore.history.filter(
                                    (msg) => msg.example && !msg.hide
                                  );
                                  chatStore.postBeginIndex = 0;
                                  setChatStore({ ...chatStore });
                                }}
                              >
                                <Tr>Yes, clear all history</Tr>
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>

                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => {
                            let dataStr =
                              "data:text/json;charset=utf-8," +
                              encodeURIComponent(
                                JSON.stringify(chatStore, null, "\t")
                              );
                            let downloadAnchorNode =
                              document.createElement("a");
                            downloadAnchorNode.setAttribute("href", dataStr);
                            downloadAnchorNode.setAttribute(
                              "download",
                              `chatgpt-api-web-${selectedChatIndex}.json`
                            );
                            document.body.appendChild(downloadAnchorNode);
                            downloadAnchorNode.click();
                            downloadAnchorNode.remove();
                          }}
                        >
                          <Tr>Export</Tr>
                        </Button>

                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => setShowTemplateDialog(true)}
                        >
                          <Tr>As template</Tr>
                        </Button>

                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => {
                            if (
                              !confirm(
                                tr(
                                  "This will OVERWRITE the current chat history! Continue?",
                                  langCode
                                )
                              )
                            )
                              return;
                            console.log("importFileRef", importFileRef);
                            importFileRef.current.click();
                          }}
                        >
                          <Tr>Import</Tr>
                        </Button>

                        <input
                          className="hidden"
                          ref={importFileRef}
                          type="file"
                          onChange={() => {
                            const file = importFileRef.current.files[0];
                            if (!file || file.type !== "application/json") {
                              alert(tr("Please select a json file", langCode));
                              return;
                            }
                            const reader = new FileReader();
                            reader.onload = () => {
                              if (!reader) {
                                alert(tr("Empty file", langCode));
                                return;
                              }
                              try {
                                const newChatStore: ChatStore = JSON.parse(
                                  reader.result as string
                                );
                                if (!newChatStore.chatgpt_api_web_version) {
                                  throw tr(
                                    "This is not an exported chatgpt-api-web chatstore file. The key 'chatgpt_api_web_version' is missing!",
                                    langCode
                                  );
                                }
                                setChatStore({ ...newChatStore });
                              } catch (e) {
                                alert(
                                  tr(
                                    `Import error on parsing json:`,
                                    langCode
                                  ) + `${e}`
                                );
                              }
                            };
                            reader.readAsText(file);
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </>
              </AccordionContent>
            </AccordionItem>
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
                      help={tr(
                        "OpenAI API key, do not leak this key",
                        langCode
                      )}
                      {...props}
                    />
                    <InputField
                      field="apiEndpoint"
                      help={tr(
                        "API endpoint, useful for using reverse proxy services in unsupported regions, default to https://api.openai.com/v1/chat/completions",
                        langCode
                      )}
                      {...props}
                    />
                    <SetAPIsTemplate
                      label={tr("Chat API", langCode)}
                      endpoint={chatStore.apiEndpoint}
                      APIkey={chatStore.apiKey}
                      temps={templateAPIs}
                      setTemps={setTemplateAPIs}
                    />
                  </CardContent>
                </Card>
                <Separator className="my-3" />
                <SelectModel
                  help={tr(
                    "Model, Different models have different performance and pricing, please refer to the API documentation",
                    langCode
                  )}
                  {...props}
                />
                <Slicer
                  field="temperature"
                  min={0}
                  max={2}
                  help={tr(
                    "Temperature, the higher the value, the higher the randomness of the generated text.",
                    langCode
                  )}
                  {...props}
                />
                <Choice
                  field="streamMode"
                  help={tr(
                    "Stream Mode, use stream mode to see the generated content dynamically, but the token count cannot be accurately calculated, which may cause too much or too little history messages to be truncated when the token count is too large.",
                    langCode
                  )}
                  {...props}
                />
                <Choice
                  field="logprobs"
                  help={tr(
                    "Logprobs, return the probability of each token",
                    langCode
                  )}
                  {...props}
                />
                <Number
                  field="maxTokens"
                  help={tr(
                    "Max context token count. This value will be set automatically based on the selected model.",
                    langCode
                  )}
                  readOnly={false}
                  {...props}
                />
                <Number
                  field="maxGenTokens"
                  help={tr(
                    "maxGenTokens is the maximum number of tokens that can be generated in a single request.",
                    langCode
                  )}
                  readOnly={false}
                  {...props}
                />
                <Number
                  field="tokenMargin"
                  help={tr(
                    'When totalTokens > maxTokens - tokenMargin, the history message will be truncated, chatgpt will "forget" part of the messages in the conversation (but all history messages are still saved locally)',
                    langCode
                  )}
                  readOnly={false}
                  {...props}
                />
                <Choice field="json_mode" help="JSON Mode" {...props} />
                <Number
                  field="postBeginIndex"
                  help={tr(
                    "Indicates how many history messages to 'forget' when sending API requests",
                    langCode
                  )}
                  readOnly={true}
                  {...props}
                />
                <Number
                  field="totalTokens"
                  help={tr(
                    "Total token count, this parameter will be updated every time you chat, in stream mode this parameter is an estimate",
                    langCode
                  )}
                  readOnly={true}
                  {...props}
                />
                <Slicer
                  field="top_p"
                  min={0}
                  max={1}
                  help={tr(
                    "Top P sampling method. It is recommended to choose one of the temperature sampling methods, do not enable both at the same time.",
                    langCode
                  )}
                  {...props}
                />
                <Number
                  field="presence_penalty"
                  help={tr("Presence Penalty", langCode)}
                  readOnly={false}
                  {...props}
                />
                <Number
                  field="frequency_penalty"
                  help={tr("Frequency Penalty", langCode)}
                  readOnly={false}
                  {...props}
                />
              </AccordionContent>
            </AccordionItem>
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
                        {...props}
                      />
                      <InputField
                        field="whisper_api"
                        help={tr(
                          "Whisper speech-to-text service. Service is enabled when this is set. Default: https://api.openai.com/v1/audio/transriptions",
                          langCode
                        )}
                        {...props}
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
                      {...props}
                    />
                    <InputField
                      field="tts_api"
                      help={tr(
                        "TTS API endpoint. Service is enabled when this is set. Default: https://api.openai.com/v1/audio/speech",
                        langCode
                      )}
                      {...props}
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
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Tr>TTS Voice</Tr>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <InfoIcon className="w-4 h-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>
                              <Tr>TTS Voice</Tr>
                            </DialogTitle>
                            <DialogDescription>
                              <Tr>Select the voice style for text-to-speech</Tr>
                            </DialogDescription>
                          </DialogHeader>
                        </DialogContent>
                      </Dialog>
                    </Label>
                    <Select
                      value={chatStore.tts_voice}
                      onValueChange={(value) => {
                        chatStore.tts_voice = value;
                        setChatStore({ ...chatStore });
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a voice" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>
                            <Tr>Voices</Tr>
                          </SelectLabel>
                          {TTS_VOICES.map((opt) => (
                            <SelectItem key={opt} value={opt}>
                              {opt}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>

                  <Slicer
                    min={0.25}
                    max={4.0}
                    field="tts_speed"
                    help={tr(
                      "Adjust the playback speed of text-to-speech",
                      langCode
                    )}
                    {...props}
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
                              <Tr>
                                Select the audio format for text-to-speech
                                output
                              </Tr>
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
                      {...props}
                    />
                    <InputField
                      field="image_gen_api"
                      help={tr(
                        "Image generation API endpoint. Service is enabled when this is set. Default: https://api.openai.com/v1/images/generations",
                        langCode
                      )}
                      {...props}
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
            <AccordionItem value="templates">
              <AccordionTrigger>
                <Tr>Saved Template</Tr>
              </AccordionTrigger>
              <AccordionContent>
                {templateAPIs.map((template, index) => (
                  <div key={index}>
                    <APIShowBlock
                      index={index}
                      label={template.name}
                      type="Chat"
                      apiField={template.endpoint}
                      keyField={template.key}
                    />
                  </div>
                ))}
                {templateAPIsWhisper.map((template, index) => (
                  <div key={index}>
                    <APIShowBlock
                      index={index}
                      label={template.name}
                      type="Whisper"
                      apiField={template.endpoint}
                      keyField={template.key}
                    />
                  </div>
                ))}
                {templateAPIsTTS.map((template, index) => (
                  <div key={index}>
                    <APIShowBlock
                      index={index}
                      label={template.name}
                      type="TTS"
                      apiField={template.endpoint}
                      keyField={template.key}
                    />
                  </div>
                ))}
                {templateAPIsImageGen.map((template, index) => (
                  <div key={index}>
                    <APIShowBlock
                      index={index}
                      label={template.name}
                      type="ImgGen"
                      apiField={template.endpoint}
                      keyField={template.key}
                    />
                  </div>
                ))}
                {templateTools.map((template, index) => (
                  <div key={index}>
                    <ToolsShowBlock
                      index={index}
                      label={template.name}
                      content={template.toolsString}
                    />
                  </div>
                ))}
              </AccordionContent>
            </AccordionItem>
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

      <TemplateAttributeDialog
        open={showTemplateDialog}
        chatStore={chatStore}
        langCode={langCode}
        onClose={() => setShowTemplateDialog(false)}
        onSave={(name, selectedAttributes) => {
          const tmp: ChatStore = {
            ...chatStore,
            ...selectedAttributes,
            history: chatStore.history.filter((h) => h.example),
          };
          // @ts-ignore
          tmp.name = name;
          templates.push(tmp as TemplateChatStore);
          setTemplates([...templates]);
          setShowTemplateDialog(false);
        }}
      />
    </Sheet>
  );
};
