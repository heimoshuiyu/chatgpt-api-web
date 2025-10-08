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
import { GripVertical, ChevronUp, ChevronDown, Upload, Mic } from "lucide-react";
import { useContext, useState } from "react";
import { AppChatStoreContext, AppContext } from "../pages/App";
import { MessageDetail } from "@/chatgpt";
import { ImageUploadDialog } from "./ImageUploadDialog";
import { AudioUploadDialog } from "./AudioUploadDialog";

interface Props {
  chat: ChatStoreMessage;
  setShowEdit: (se: boolean) => void;
}
export function EditMessageDetail({ chat, setShowEdit }: Props) {
  const { chatStore, setChatStore } = useContext(AppChatStoreContext);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showAudioDialog, setShowAudioDialog] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState<number | null>(
    null
  );
  const [currentAudioIndex, setCurrentAudioIndex] = useState<number | null>(
    null
  );

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

  const handleImageUpload = (image: MessageDetail) => {
    if (currentImageIndex !== null && typeof chat.content !== "string") {
      const obj = chat.content[currentImageIndex].image_url;
      if (obj !== undefined) {
        obj.url = image.image_url?.url || "";
        obj.detail = image.image_url?.detail || "high";
      }
    }
    setChatStore({ ...chatStore });
    setCurrentImageIndex(null);
  };

  const handleAudioUpload = (audio: MessageDetail) => {
    if (currentAudioIndex !== null && typeof chat.content !== "string") {
      const obj = chat.content[currentAudioIndex].input_audio;
      if (obj !== undefined) {
        obj.data = audio.input_audio?.data || "";
        obj.format = audio.input_audio?.format || "wav";
      }
    }
    setChatStore({ ...chatStore });
    setCurrentAudioIndex(null);
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
                        onBlur={(event) => {
                          if (typeof chat.content === "string") return;
                          chat.content[index].text = event.target.value;
                          chat.token = calculate_token_length(chat.content);
                          console.log("calculated token length", chat.token);
                          setChatStore({ ...chatStore });
                        }}
                      />
                    </div>
                  ) : mdt.type === "input_audio" ? (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">
                          <Tr>Audio Preview</Tr>
                        </Label>
                        <div className="border rounded-lg p-3 bg-muted/30">
                          {mdt.input_audio?.data ? (
                            <div className="flex items-center gap-3">
                              <audio controls className="flex-1">
                                <source src={mdt.input_audio?.data} />
                                <Tr>Your browser does not support the audio element.</Tr>
                              </audio>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  window.open(mdt.input_audio?.data, "_blank");
                                }}
                              >
                                <Tr>Open</Tr>
                              </Button>
                            </div>
                          ) : (
                            <div className="h-24 flex items-center justify-center text-muted-foreground">
                              <Tr>No audio provided</Tr>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">
                            <Tr>Audio URL</Tr>
                          </Label>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const audio_data = prompt(
                                  "Audio URL",
                                  mdt.input_audio?.data
                                );
                                if (audio_data) {
                                  if (typeof chat.content === "string") return;
                                  const obj = chat.content[index].input_audio;
                                  if (obj === undefined) return;
                                  obj.data = audio_data;
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
                                setCurrentAudioIndex(index);
                                setShowAudioDialog(true);
                              }}
                            >
                              <Upload className="size-4 mr-1" />
                              <Tr>Upload</Tr>
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm font-medium">
                            <Tr>Format</Tr>
                          </Label>
                          <div className="text-sm text-muted-foreground">
                            {mdt.input_audio?.format || "wav"}
                          </div>
                        </div>
                      </div>
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
                                setCurrentImageIndex(index);
                                setShowUploadDialog(true);
                              }}
                            >
                              <Upload className="size-4 mr-1" />
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
            <Button
              variant="outline"
              onClick={() => {
                if (typeof chat.content === "string") return;
                chat.content.push({
                  type: "input_audio",
                  input_audio: {
                    data: "",
                    format: "wav",
                  },
                });
                setChatStore({ ...chatStore });
              }}
            >
              <Mic className="h-4 w-4 mr-2" />
              <Tr>Add audio</Tr>
            </Button>
          </div>
        </div>
        <DialogFooter className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setShowEdit(false)}>
            <Tr>Cancel</Tr>
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Image Upload Dialog */}
      <ImageUploadDialog
        open={showUploadDialog}
        onOpenChange={setShowUploadDialog}
        onImageSelect={handleImageUpload}
      />

      {/* Audio Upload Dialog */}
      <AudioUploadDialog
        open={showAudioDialog}
        onOpenChange={setShowAudioDialog}
        onAudioSelect={handleAudioUpload}
      />
    </Dialog>
  );
}
