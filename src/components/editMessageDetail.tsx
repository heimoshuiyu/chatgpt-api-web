import { ChatStore, ChatStoreMessage } from "@/types/chatstore";
import { calculate_token_length } from "@/chatgpt";
import { Tr } from "@/translate";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Card, CardContent } from "./ui/card";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import { GripVertical, ChevronUp, ChevronDown } from "lucide-react";
import { useContext } from "react";
import { AppChatStoreContext, AppContext } from "../pages/App";

interface Props {
  chat: ChatStoreMessage;
  setShowEdit: (se: boolean) => void;
}
export function EditMessageDetail({ chat, setShowEdit }: Props) {
  const { chatStore, setChatStore } = useContext(AppChatStoreContext);

  if (typeof chat.content !== "object") return <div>error</div>;
  const moveItem = (index: number, direction: "up" | "down") => {
    if (typeof chat.content === "string") return;

    const newContent = [...chat.content];
    if (direction === "up" && index > 0) {
      [newContent[index], newContent[index - 1]] = [
        newContent[index - 1],
        newContent[index],
      ];
    } else if (direction === "down" && index < newContent.length - 1) {
      [newContent[index], newContent[index + 1]] = [
        newContent[index + 1],
        newContent[index],
      ];
    }

    chat.content = newContent;
    chat.token = calculate_token_length(chat.content);
    setChatStore({ ...chatStore });
  };

  return (
    <Dialog open={true} onOpenChange={setShowEdit}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            <Tr>Edit Message Detail</Tr>
          </DialogTitle>
          <DialogDescription>
            <Tr>Modify the content of the message.</Tr>
          </DialogDescription>
        </DialogHeader>
        <div className="w-full flex flex-col space-y-4 max-h-[60vh] overflow-y-auto pr-2">
          {chat.content.map((mdt, index) => (
            <Card key={index} className="border border-border relative">
              <CardContent className="p-4 space-y-4">
                {/* Reorder controls */}
                <div className="absolute left-2 top-2 flex flex-col gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 hover:bg-muted"
                    disabled={index === 0}
                    onClick={() => moveItem(index, "up")}
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 hover:bg-muted"
                    disabled={index === chat.content.length - 1}
                    onClick={() => moveItem(index, "down")}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </div>

                {/* Drag handle indicator */}
                <div className="absolute left-10 top-6 text-muted-foreground">
                  <GripVertical className="h-4 w-4" />
                </div>

                {/* Content */}
                <div className="ml-8">
                  {mdt.type === "text" ? (
                    <div className="space-y-2">
                      <Label
                        htmlFor={`text-${index}`}
                        className="text-sm font-medium"
                      >
                        <Tr>Text Content</Tr>
                      </Label>
                      <Textarea
                        id={`text-${index}`}
                        className="min-h-[120px] resize-none"
                        value={mdt.text}
                        onChange={(event) => {
                          if (typeof chat.content === "string") return;
                          chat.content[index].text = event.target.value;
                          chat.token = calculate_token_length(chat.content);
                          console.log("calculated token length", chat.token);
                          setChatStore({ ...chatStore });
                        }}
                        mockOnChange={false}
                        onKeyDown={(event: any) => {
                          if (event.key === "Escape") {
                            setShowEdit(false);
                          }
                        }}
                      />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">
                          <Tr>Image Preview</Tr>
                        </Label>
                        <div className="border rounded-lg p-3 bg-muted/30">
                          {mdt.image_url?.url ? (
                            <img
                              className="max-h-40 max-w-full rounded-md cursor-pointer hover:opacity-80 transition-opacity"
                              src={mdt.image_url?.url}
                              alt="Preview"
                              onClick={() => {
                                window.open(mdt.image_url?.url, "_blank");
                              }}
                            />
                          ) : (
                            <div className="h-24 flex items-center justify-center text-muted-foreground">
                              <Tr>No image provided</Tr>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">
                            <Tr>Image URL</Tr>
                          </Label>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const image_url = prompt(
                                  "Image URL",
                                  mdt.image_url?.url
                                );
                                if (image_url) {
                                  if (typeof chat.content === "string") return;
                                  const obj = chat.content[index].image_url;
                                  if (obj === undefined) return;
                                  obj.url = image_url;
                                  setChatStore({ ...chatStore });
                                }
                              }}
                            >
                              <Tr>Edit URL</Tr>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const input = document.createElement("input");
                                input.type = "file";
                                input.accept = "image/*";
                                input.onchange = (event) => {
                                  const file = (
                                    event.target as HTMLInputElement
                                  ).files?.[0];
                                  if (!file) {
                                    return;
                                  }
                                  const reader = new FileReader();
                                  reader.readAsDataURL(file);
                                  reader.onloadend = () => {
                                    const base64data = reader.result;
                                    if (!base64data) return;
                                    if (typeof chat.content === "string")
                                      return;
                                    const obj = chat.content[index].image_url;
                                    if (obj === undefined) return;
                                    obj.url = String(base64data);
                                    setChatStore({ ...chatStore });
                                  };
                                };
                                input.click();
                              }}
                            >
                              <Tr>Upload</Tr>
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm font-medium">
                            <Tr>Resolution</Tr>
                          </Label>
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={mdt.image_url?.detail === "high"}
                              onCheckedChange={() => {
                                if (typeof chat.content === "string") return;
                                const obj = chat.content[index].image_url;
                                if (obj === undefined) return;
                                obj.detail =
                                  obj.detail === "high" ? "low" : "high";
                                chat.token = calculate_token_length(
                                  chat.content
                                );
                                setChatStore({ ...chatStore });
                              }}
                            />
                            <Label className="text-sm">
                              <Tr>High Resolution</Tr>
                            </Label>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end pt-2 border-t ml-8">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      if (typeof chat.content === "string") return;
                      chat.content.splice(index, 1);
                      chat.token = calculate_token_length(chat.content);
                      setChatStore({ ...chatStore });
                    }}
                  >
                    <Tr>Remove</Tr>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          <div className="flex flex-wrap gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                if (typeof chat.content === "string") return;
                chat.content.push({
                  type: "text",
                  text: "",
                });
                setChatStore({ ...chatStore });
              }}
            >
              <Tr>Add text</Tr>
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (typeof chat.content === "string") return;
                chat.content.push({
                  type: "image_url",
                  image_url: {
                    url: "",
                    detail: "high",
                  },
                });
                setChatStore({ ...chatStore });
              }}
            >
              <Tr>Add image</Tr>
            </Button>
          </div>
        </div>
        <DialogFooter className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setShowEdit(false)}>
            <Tr>Cancel</Tr>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
