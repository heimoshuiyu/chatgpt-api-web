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
import { getDefaultParams } from "@/utils/getDefaultParam";

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
import { title } from "process";

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
            {Tr("Custom")}
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
            chatStore.maxTokens = getDefaultParams(
              "max",
              models[model].maxToken
            );
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
          {Tr("Settings")}
          {(!chatStore.apiKey || !chatStore.apiEndpoint) && (
            <TriangleAlertIcon className="w-4 h-4 ml-1 text-yellow-500" />
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="flex flex-col overflow-scroll">
        <NonOverflowScrollArea>
          <SheetHeader>
            <SheetTitle>{Tr("Settings")}</SheetTitle>
            <SheetDescription>
              You can customize the settings here.
            </SheetDescription>
          </SheetHeader>
          <Accordion type="multiple" className="w-full">
            <AccordionItem value="session">
              <AccordionTrigger>Session</AccordionTrigger>
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
                  help="系统消息，用于指示ChatGPT的角色和一些前置条件，例如“你是一个有帮助的人工智能助理”，或者“你是一个专业英语翻译，把我的话全部翻译成英语”，详情参考 OPEAN AI API 文档"
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
                          <Button variant="outline">{Tr(`Save Tools`)}</Button>
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
              <AccordionTrigger>System</AccordionTrigger>
              <AccordionContent>
                <>
                  <Card>
                    <CardHeader className="flex flex-col items-stretch space-y-0 border-b p-0 sm:flex-row">
                      <div className="flex flex-1 flex-col justify-center gap-1 px-6 py-5 sm:py-6">
                        <CardTitle>Accumulated Cost</CardTitle>
                        <CardDescription>in all sessions</CardDescription>
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
                      Reset Total Cost
                    </Button>
                  </div>
                  <Choice
                    field="develop_mode"
                    help="开发者模式，开启后会显示更多选项及功能"
                    {...props}
                  />
                  <DefaultRenderMDCheckbox />
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Language</Label>
                      <Select value={langCode} onValueChange={setLangCode}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select language" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectLabel>Languages</SelectLabel>
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
                      <Label>Quick Actions</Label>
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
                          {Tr("Copy Setting Link")}
                        </Button>

                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="destructive" className="w-full">
                              {Tr("Clear History")}
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>
                                Are you absolutely sure?
                              </DialogTitle>
                              <DialogDescription>
                                This action cannot be undone. This will
                                permanently delete all chat history.
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
                                Yes, clear all history
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
                          {Tr("Export")}
                        </Button>

                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => {
                            const name = prompt(
                              tr("Give this template a name:", langCode)
                            );
                            if (!name) {
                              alert(tr("No template name specified", langCode));
                              return;
                            }
                            const tmp: ChatStore = structuredClone(chatStore);
                            tmp.history = tmp.history.filter((h) => h.example);
                            // @ts-ignore
                            tmp.name = name;
                            templates.push(tmp as TemplateChatStore);
                            setTemplates([...templates]);
                          }}
                        >
                          {Tr("As template")}
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
                          Import
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
              <AccordionTrigger>Chat</AccordionTrigger>
              <AccordionContent>
                <Card>
                  <CardHeader>
                    <CardTitle>Chat API</CardTitle>
                    <CardDescription>
                      Configure the LLM API settings
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <InputField
                      field="apiKey"
                      help="OPEN AI API 密钥，请勿泄漏此密钥"
                      {...props}
                    />
                    <InputField
                      field="apiEndpoint"
                      help="API 端点，方便在不支持的地区使用反向代理服务，默认为 https://api.openai.com/v1/chat/completions"
                      {...props}
                    />
                    <SetAPIsTemplate
                      label="Chat API"
                      endpoint={chatStore.apiEndpoint}
                      APIkey={chatStore.apiKey}
                      temps={templateAPIs}
                      setTemps={setTemplateAPIs}
                    />
                  </CardContent>
                </Card>
                <Separator className="my-3" />
                <SelectModel
                  help="模型，默认 3.5。不同模型性能和定价也不同，请参考 API 文档。"
                  {...props}
                />
                <Slicer
                  field="temperature"
                  min={0}
                  max={2}
                  help="温度，数值越大模型生成文字的随机性越高。"
                  {...props}
                />
                <Choice
                  field="streamMode"
                  help="流模式，使用 stream mode 将可以动态看到生成内容，但无法准确计算 token 数量，在 token 数量过多时可能会裁切过多或过少历史消息"
                  {...props}
                />
                <Choice
                  field="logprobs"
                  help="返回每个Token的概率"
                  {...props}
                />
                <Number
                  field="maxTokens"
                  help="最大上下文 token 数量。此值会根据选择的模型自动设置。"
                  readOnly={false}
                  {...props}
                />
                <Number
                  field="maxGenTokens"
                  help="最大生成 Tokens 数量，可选值。"
                  readOnly={false}
                  {...props}
                />
                <Number
                  field="tokenMargin"
                  help="当 totalTokens > maxTokens - tokenMargin 时会触发历史消息裁切，chatgpt会“忘记”一部分对话中的消息（但所有历史消息仍然保存在本地）"
                  readOnly={false}
                  {...props}
                />
                <Choice field="json_mode" help="JSON Mode" {...props} />
                <Number
                  field="postBeginIndex"
                  help="指示发送 API 请求时要”忘记“多少历史消息"
                  readOnly={true}
                  {...props}
                />
                <Number
                  field="totalTokens"
                  help="token总数，每次对话都会更新此参数，stream模式下该参数为估计值"
                  readOnly={true}
                  {...props}
                />
                <Slicer
                  field="top_p"
                  min={0}
                  max={1}
                  help="Top P 采样方法。建议与温度采样方法二选一，不要同时开启。"
                  {...props}
                />
                <Number
                  field="presence_penalty"
                  help="存在惩罚度"
                  readOnly={false}
                  {...props}
                />
                <Number
                  field="frequency_penalty"
                  help="频率惩罚度"
                  readOnly={false}
                  {...props}
                />
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="speech">
              <AccordionTrigger>Speech Recognition</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Whisper API</CardTitle>
                      <CardDescription>
                        Configure speech recognition settings
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <InputField
                        field="whisper_key"
                        help="Used for Whisper service. Defaults to the OpenAI key above, but can be configured separately here"
                        {...props}
                      />
                      <InputField
                        field="whisper_api"
                        help="Whisper speech-to-text service. Service is enabled when this is set. Default: https://api.openai.com/v1/audio/transriptions"
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
              <AccordionTrigger>TTS</AccordionTrigger>
              <AccordionContent>
                <Card>
                  <CardHeader>
                    <CardTitle>TTS API</CardTitle>
                    <CardDescription>
                      Configure text-to-speech settings
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <InputField
                      field="tts_key"
                      help="Text-to-speech service API key. Defaults to the OpenAI key above, but can be configured separately here"
                      {...props}
                    />
                    <InputField
                      field="tts_api"
                      help="TTS API endpoint. Service is enabled when this is set. Default: https://api.openai.com/v1/audio/speech"
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
                      TTS Voice
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <InfoIcon className="w-4 h-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>TTS Voice</DialogTitle>
                            <DialogDescription>
                              Select the voice style for text-to-speech
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
                          <SelectLabel>Voices</SelectLabel>
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
                    help="Adjust the playback speed of text-to-speech"
                    {...props}
                  />

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      TTS Format
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <InfoIcon className="w-4 h-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>TTS Format</DialogTitle>
                            <DialogDescription>
                              Select the audio format for text-to-speech output
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
                          <SelectLabel>Formats</SelectLabel>
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
              <AccordionTrigger>Image Generation</AccordionTrigger>
              <AccordionContent>
                <Card>
                  <CardHeader>
                    <CardTitle>Image Generation API</CardTitle>
                    <CardDescription>
                      Configure image generation settings
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <InputField
                      field="image_gen_key"
                      help="Image generation service API key. Defaults to the OpenAI key above, but can be configured separately here"
                      {...props}
                    />
                    <InputField
                      field="image_gen_api"
                      help="Image generation API endpoint. Service is enabled when this is set. Default: https://api.openai.com/v1/images/generations"
                      {...props}
                    />
                    <SetAPIsTemplate
                      label="Image Gen API"
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
              <AccordionTrigger>Saved Template</AccordionTrigger>
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
              chatgpt-api-web ChatStore {Tr("Version")}{" "}
              {chatStore.chatgpt_api_web_version}
            </p>
            <p className="text-sm text-muted-foreground text-center">
              {Tr("Documents and source code are avaliable here")}:{" "}
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
};
