import React, { useContext, useRef, useState } from "react";
import { AppChatStoreContext, AppContext } from "@/pages/App";
import { clearTotalCost, getTotalCost } from "@/utils/totalCost";
import { ChatStore } from "@/types/chatstore";
import { tr, Tr, langCodeContext, LANG_OPTIONS } from "@/translate";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
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
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ChoiceCheckbox } from "../ui/ChoiceCheckbox";
import { TemplateAttributeDialog } from "@/components/TemplateAttributeDialog";
import { toast } from "@/hooks/use-toast";

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

export const SystemSettings: React.FC = () => {
  const { chatStore, setChatStore } = useContext(AppChatStoreContext);
  const { templates, setTemplates, selectedChatIndex } = useContext(AppContext);
  const { langCode, setLangCode } = useContext(langCodeContext);
  const [totalCost, setTotalCost] = useState(getTotalCost());
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const importFileRef = useRef<any>(null);

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

  return (
    <>
      <AccordionItem value="system">
        <AccordionTrigger>
          <Tr>System</Tr>
        </AccordionTrigger>
        <AccordionContent>
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
                  <span className="text-xs text-muted-foreground">$ USD</span>
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
          <div className="mt-4">
            <ChoiceCheckbox
              field="develop_mode"
              help={tr(
                "Develop Mode, enable to show more options and features",
                langCode
              )}
            />
          </div>
          <div className="mt-4">
            <DefaultRenderMDCheckbox />
          </div>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>
                <Tr>Language</Tr>
              </Label>
              <Select value={langCode} onValueChange={setLangCode}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={tr("Select language", langCode)} />
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
                          This action cannot be undone. This will permanently
                          delete all chat history.
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
                      encodeURIComponent(JSON.stringify(chatStore, null, "\t"));
                    let downloadAnchorNode = document.createElement("a");
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
                          tr(`Import error on parsing json:`, langCode) + `${e}`
                        );
                      }
                    };
                    reader.readAsText(file);
                  }}
                />
              </div>
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>

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
          templates.push(tmp as any);
          setTemplates([...templates]);
          setShowTemplateDialog(false);
        }}
      />
    </>
  );
};
