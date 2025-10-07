import { useState, useContext } from "react";
import { MessageDetail } from "@/chatgpt";
import { Tr, langCodeContext } from "@/translate";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, Settings, ImageIcon } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImageSelect: (image: MessageDetail) => void;
}

export function ImageUploadDialog({
  open,
  onOpenChange,
  onImageSelect,
}: Props) {
  const { langCode } = useContext(langCodeContext);
  const [enableCompression, setEnableCompression] = useState(false);
  const [compressionQuality, setCompressionQuality] = useState(80);

  const handleFileUpload = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) return;

      let imageDataUrl: string;

      if (enableCompression) {
        imageDataUrl = await new Promise<string>((resolve, reject) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");

            if (!ctx) {
              reject(new Error("Could not get canvas context"));
              return;
            }

            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);

            const quality = compressionQuality / 100;
            const compressedDataUrl = canvas.toDataURL("image/jpeg", quality);
            resolve(compressedDataUrl);
          };

          img.onerror = () => reject(new Error("Failed to load image"));

          const reader = new FileReader();
          reader.onload = (e) => {
            img.src = e.target?.result as string;
          };
          reader.readAsDataURL(file);
        });
      } else {
        imageDataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            resolve(e.target?.result as string);
          };
          reader.readAsDataURL(file);
        });
      }

      const newImage: MessageDetail = {
        type: "image_url",
        image_url: {
          url: imageDataUrl,
          detail: "high", // 默认高分辨率，后续可以在具体的管理界面中调整
        },
      };

      onImageSelect(newImage);
      onOpenChange(false);
    };
    input.click();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader className="text-left pb-4">
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="size-5" />
            <Tr>Upload Image</Tr>
          </DialogTitle>
          <DialogDescription>
            <Tr>
              Upload an image from your device with optional compression
              settings.
            </Tr>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Upload Button */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Upload className="size-4" />
                <Tr>Select Image</Tr>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handleFileUpload}
                className="w-full flex items-center gap-2"
                size="lg"
              >
                <Upload className="size-4" />
                <Tr>Choose Image from Device</Tr>
              </Button>
            </CardContent>
          </Card>

          {/* Compression Settings */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Settings className="size-4" />
                <Tr>Compression Settings</Tr>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="enable-compression"
                  checked={enableCompression}
                  onCheckedChange={(checked) =>
                    setEnableCompression(checked === true)
                  }
                />
                <label
                  htmlFor="enable-compression"
                  className="text-sm font-medium cursor-pointer"
                >
                  <Tr>Enable image compression</Tr>
                </label>
                <Badge
                  variant={enableCompression ? "default" : "secondary"}
                  className="ml-auto text-xs"
                >
                  {enableCompression ? <Tr>Enabled</Tr> : <Tr>Disabled</Tr>}
                </Badge>
              </div>

              {!enableCompression && (
                <p className="text-xs text-muted-foreground mt-2 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                  💡{" "}
                  <Tr>
                    Image compression will reduce file size without changing
                    resolution.
                  </Tr>
                </p>
              )}

              {enableCompression && (
                <div className="space-y-3 p-4 bg-muted/30 rounded-lg border">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">
                      <Tr>Compression Quality</Tr>
                    </label>
                    <Badge variant="outline" className="text-xs">
                      {compressionQuality}%
                    </Badge>
                  </div>
                  <Slider
                    value={[compressionQuality]}
                    onValueChange={(value) => setCompressionQuality(value[0])}
                    max={95}
                    min={10}
                    step={5}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>
                      <Tr>Smaller file size</Tr>
                    </span>
                    <span>
                      <Tr>Better quality</Tr>
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    💡{" "}
                    <Tr>
                      Higher quality = larger file size but better image
                      clarity.
                    </Tr>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
