import { themeChange } from "theme-change";

import { createRef } from "preact";
import {
  StateUpdater,
  useContext,
  useEffect,
  useState,
  Dispatch,
} from "preact/hooks";
import { clearTotalCost, getTotalCost } from "@/utils/totalCost";
import {
  ChatStore,
  TemplateChatStore,
  TemplateAPI,
  TemplateTools,
} from "@/types/chatstore";
import { models } from "@/types/models";
import { tr, Tr, langCodeContext, LANG_OPTIONS } from "@/translate";
import { isVailedJSON } from "@/message";
import { SetAPIsTemplate } from "@/setAPIsTemplate";
import { autoHeight } from "@/textarea";
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
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  BanIcon,
  CheckIcon,
  CircleEllipsisIcon,
  CogIcon,
  Ellipsis,
  EyeIcon,
  InfoIcon,
  KeyIcon,
  ListIcon,
  MoveHorizontalIcon,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";

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

const SelectModel = (props: {
  chatStore: ChatStore;
  setChatStore: (cs: ChatStore) => void;
  help: string;
}) => {
  let shouldIUseCustomModel: boolean = true;
  for (const model in models) {
    if (props.chatStore.model === model) {
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
              <Button variant="icon" size="icon">
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
          value={props.chatStore.model}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            props.chatStore.model = e.target.value;
            props.setChatStore({ ...props.chatStore });
          }}
        />
      ) : (
        <Select
          value={props.chatStore.model}
          onValueChange={(model: string) => {
            props.chatStore.model = model;
            props.chatStore.maxTokens = getDefaultParams(
              "max",
              models[model].maxToken
            );
            props.setChatStore({ ...props.chatStore });
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

const LongInput = (props: {
  chatStore: ChatStore;
  setChatStore: (cs: ChatStore) => void;
  field: "systemMessageContent" | "toolsString";
  label: string;
  help: string;
}) => {
  return (
    <div>
      <Label htmlFor="name" className="text-right">
        {props.label}{" "}
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="icon" size="icon">
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
        className="h-24 w-full"
        value={props.chatStore[props.field]}
        onChange={(event: any) => {
          props.chatStore[props.field] = event.target.value;
          props.setChatStore({ ...props.chatStore });
          autoHeight(event.target);
        }}
        onKeyPress={(event: any) => {
          autoHeight(event.target);
        }}
      />
    </div>
  );
};

const InputField = (props: {
  chatStore: ChatStore;
  setChatStore: (cs: ChatStore) => void;
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
  const [hideInput, setHideInput] = useState(true);
  return (
    <>
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <KeyIcon className="w-4 h-4" />
          {props.field}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="icon" size="icon">
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
            value={props.chatStore[props.field]}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
              props.chatStore[props.field] = event.target.value;
              props.setChatStore({ ...props.chatStore });
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
  chatStore: ChatStore;
  setChatStore: (cs: ChatStore) => void;
  field: "temperature" | "top_p" | "tts_speed";
  help: string;
  min: number;
  max: number;
}) => {
  const enable_filed_name: "temperature_enabled" | "top_p_enabled" =
    `${props.field}_enabled` as any;

  const enabled = props.chatStore[enable_filed_name];

  if (enabled === null || enabled === undefined) {
    if (props.field === "temperature") {
      props.chatStore[enable_filed_name] = true;
    }
    if (props.field === "top_p") {
      props.chatStore[enable_filed_name] = false;
    }
  }

  const setEnabled = (state: boolean) => {
    props.chatStore[enable_filed_name] = state;
    props.setChatStore({ ...props.chatStore });
  };
  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        <MoveHorizontalIcon className="w-4 h-4" />
        {props.field}
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="icon" size="icon">
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
          checked={props.chatStore[enable_filed_name]}
          onCheckedChange={(checked: boolean) => setEnabled(!!checked)}
        />
        {!props.chatStore[enable_filed_name] && (
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
              value={[props.chatStore[props.field]]}
              onValueChange={(value: number[]) => {
                props.chatStore[props.field] = value[0];
                props.setChatStore({ ...props.chatStore });
              }}
            />
          </div>
          <Input
            type="number"
            disabled={!enabled}
            className="w-24"
            value={props.chatStore[props.field]}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              const value = parseFloat(e.target.value);
              props.chatStore[props.field] = value;
              props.setChatStore({ ...props.chatStore });
            }}
          />
        </div>
      )}
    </div>
  );
};

const Number = (props: {
  chatStore: ChatStore;
  setChatStore: (cs: ChatStore) => void;
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
  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        <CircleEllipsisIcon className="h-4 w-4" />
        {props.field}
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="icon" size="icon">
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
            checked={props.chatStore.maxGenTokens_enabled}
            onCheckedChange={() => {
              const newChatStore = { ...props.chatStore };
              newChatStore.maxGenTokens_enabled =
                !newChatStore.maxGenTokens_enabled;
              props.setChatStore({ ...newChatStore });
            }}
          />
        )}
      </Label>

      <Input
        type="number"
        readOnly={props.readOnly}
        disabled={
          props.field === "maxGenTokens" &&
          !props.chatStore.maxGenTokens_enabled
        }
        value={props.chatStore[props.field]}
        onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
          let newNumber = parseFloat(event.target.value);
          if (newNumber < 0) newNumber = 0;
          props.chatStore[props.field] = newNumber;
          props.setChatStore({ ...props.chatStore });
        }}
      />
    </div>
  );
};

const Choice = (props: {
  chatStore: ChatStore;
  setChatStore: (cs: ChatStore) => void;
  field: "streamMode" | "develop_mode" | "json_mode" | "logprobs";
  help: string;
}) => {
  return (
    <div className="flex items-center space-x-2">
      <div className="flex items-center">
        <Checkbox
          id={`${props.field}-checkbox`}
          checked={props.chatStore[props.field]}
          onCheckedChange={(checked: boolean) => {
            props.chatStore[props.field] = checked;
            props.setChatStore({ ...props.chatStore });
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
            <Button variant="icon" size="icon">
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

export default (props: {
  chatStore: ChatStore;
  setChatStore: (cs: ChatStore) => void;
  setShow: Dispatch<StateUpdater<boolean>>;
  selectedChatStoreIndex: number;
  templates: TemplateChatStore[];
  setTemplates: (templates: TemplateChatStore[]) => void;
  templateAPIs: TemplateAPI[];
  setTemplateAPIs: (templateAPIs: TemplateAPI[]) => void;
  templateAPIsWhisper: TemplateAPI[];
  setTemplateAPIsWhisper: (templateAPIs: TemplateAPI[]) => void;
  templateAPIsTTS: TemplateAPI[];
  setTemplateAPIsTTS: (templateAPIs: TemplateAPI[]) => void;
  templateAPIsImageGen: TemplateAPI[];
  setTemplateAPIsImageGen: (templateAPIs: TemplateAPI[]) => void;
  templateTools: TemplateTools[];
  setTemplateTools: (templateTools: TemplateTools[]) => void;
}) => {
  let link =
    location.protocol +
    "//" +
    location.host +
    location.pathname +
    `?key=${encodeURIComponent(
      props.chatStore.apiKey
    )}&api=${encodeURIComponent(props.chatStore.apiEndpoint)}&mode=${
      props.chatStore.streamMode ? "stream" : "fetch"
    }&model=${props.chatStore.model}&sys=${encodeURIComponent(
      props.chatStore.systemMessageContent
    )}`;
  if (props.chatStore.develop_mode) {
    link = link + `&dev=true`;
  }

  const importFileRef = createRef();
  const [totalCost, setTotalCost] = useState(getTotalCost());
  // @ts-ignore
  const { langCode, setLangCode } = useContext(langCodeContext);

  useEffect(() => {
    themeChange(false);
    const handleKeyPress = (event: any) => {
      if (event.keyCode === 27) {
        // keyCode for ESC key is 27
        props.setShow(false);
      }
    };

    document.addEventListener("keydown", handleKeyPress);

    return () => {
      document.removeEventListener("keydown", handleKeyPress);
    };
  }, []); // The empty dependency array ensures that the effect runs only once
  return (
    // <div
    //   onClick={() => props.setShow(false)}
    //   className="left-0 top-0 overflow-scroll flex justify-center absolute w-full h-full z-10"
    // >
    //   <div
    //     onClick={(event: any) => {
    //       event.stopPropagation();
    //     }}
    //     className="modal-box"
    //   >
    //     <div className="flex justify-between items-center mb-2">
    //       <h3 className="text-lg font-bold">{Tr("Settings")}</h3>
    //       <button
    //         className="btn btn-secondary btn-sm"
    //         onClick={() => {
    //           props.setShow(false);
    //         }}
    //       >
    //         {Tr("Close")}
    //       </button>
    //     </div>
    //     <div className="join join-vertical w-full">

    // </div>

    //   </div>
    // </div>
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline">{Tr("Settings")}</Button>
      </SheetTrigger>
      <SheetContent className="flex flex-col">
        <div className="overflow-auto">
          <SheetHeader>
            <SheetTitle>{Tr("Settings")}</SheetTitle>
            <SheetDescription>
              You can customize the settings here.
            </SheetDescription>
          </SheetHeader>
          <Accordion type="multiple" collapsible className="w-full">
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
                          {props.chatStore.cost.toFixed(4)}
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
                  {isVailedJSON(props.chatStore.toolsString) ? (
                    <CheckIcon className="inline w-3 h-3" />
                  ) : (
                    <BanIcon className="inline w-3 h-3" />
                  )}
                </span>
                <div className="box">
                  <div className="flex justify-evenly flex-wrap">
                    {props.chatStore.toolsString.trim() && (
                      <Button
                        onClick={() => {
                          const name = prompt(
                            `Give this **Tools** template a name:`
                          );
                          if (!name) {
                            alert("No template name specified");
                            return;
                          }
                          const newToolsTmp: TemplateTools = {
                            name,
                            toolsString: props.chatStore.toolsString,
                          };
                          props.templateTools.push(newToolsTmp);
                          props.setTemplateTools([...props.templateTools]);
                        }}
                      >
                        {Tr(`Save Tools`)}
                      </Button>
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
                            alert(tr(`Copied link:`, langCode) + `${link}`);
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
                                  props.chatStore.history =
                                    props.chatStore.history.filter(
                                      (msg) => msg.example && !msg.hide
                                    );
                                  props.chatStore.postBeginIndex = 0;
                                  props.setChatStore({ ...props.chatStore });
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
                                JSON.stringify(props.chatStore, null, "\t")
                              );
                            let downloadAnchorNode =
                              document.createElement("a");
                            downloadAnchorNode.setAttribute("href", dataStr);
                            downloadAnchorNode.setAttribute(
                              "download",
                              `chatgpt-api-web-${props.selectedChatStoreIndex}.json`
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
                            const tmp: ChatStore = structuredClone(
                              props.chatStore
                            );
                            tmp.history = tmp.history.filter((h) => h.example);
                            tmp.apiEndpoint = "";
                            tmp.apiKey = "";
                            tmp.whisper_api = "";
                            tmp.whisper_key = "";
                            tmp.tts_api = "";
                            tmp.tts_key = "";
                            tmp.image_gen_api = "";
                            tmp.image_gen_key = "";
                            // @ts-ignore
                            tmp.name = name;
                            props.templates.push(tmp as TemplateChatStore);
                            props.setTemplates([...props.templates]);
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
                                props.setChatStore({ ...newChatStore });
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
                      endpoint={props.chatStore.apiEndpoint}
                      APIkey={props.chatStore.apiKey}
                      tmps={props.templateAPIs}
                      setTmps={props.setTemplateAPIs}
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
                        endpoint={props.chatStore.whisper_api}
                        APIkey={props.chatStore.whisper_key}
                        tmps={props.templateAPIsWhisper}
                        setTmps={props.setTemplateAPIsWhisper}
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
                      endpoint={props.chatStore.tts_api}
                      APIkey={props.chatStore.tts_key}
                      tmps={props.templateAPIsTTS}
                      setTmps={props.setTemplateAPIsTTS}
                    />
                  </CardContent>
                </Card>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      TTS Voice
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="icon" size="icon">
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
                      value={props.chatStore.tts_voice}
                      onValueChange={(value) => {
                        props.chatStore.tts_voice = value;
                        props.setChatStore({ ...props.chatStore });
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
                          <Button variant="icon" size="icon">
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
                      value={props.chatStore.tts_format}
                      onValueChange={(value) => {
                        props.chatStore.tts_format = value;
                        props.setChatStore({ ...props.chatStore });
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
                      endpoint={props.chatStore.image_gen_api}
                      APIkey={props.chatStore.image_gen_key}
                      tmps={props.templateAPIsImageGen}
                      setTmps={props.setTemplateAPIsImageGen}
                    />
                  </CardContent>
                </Card>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
          <div className="pt-4 space-y-2">
            <p className="text-sm text-muted-foreground text-center">
              chatgpt-api-web ChatStore {Tr("Version")}{" "}
              {props.chatStore.chatgpt_api_web_version}
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
        </div>
      </SheetContent>
    </Sheet>
  );
};
