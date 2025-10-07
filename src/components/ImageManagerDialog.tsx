import { useContext, useState } from "react";
import { MessageDetail } from "@/chatgpt";
import { Tr, tr, langCodeContext } from "@/translate";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import {
  PenIcon,
  XIcon,
  ImageIcon,
  Upload,
  Link,
  Settings,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AppContext } from "@/pages/App";

interface Props {
  images: MessageDetail[];
  setImages: (images: MessageDetail[]) => void;
  disableFactor: boolean[];
}

export function ImageManagerDialog({
  setImages,
  images,
  disableFactor,
}: Props) {
  const ctx = useContext(AppContext);
  const { langCode } = useContext(langCodeContext);
  const [showAddImage, setShowAddImage] = useState(false);
  const [enableHighResolution, setEnableHighResolution] = useState(true);
  const [enableCompression, setEnableCompression] = useState(false);
  const [compressionQuality, setCompressionQuality] = useState(80);

  const handleAddFromUrl = () => {
    const image_url = prompt(tr("Enter image URL:", langCode));
    if (!image_url) return;

    setImages([
      ...images,
      {
        type: "image_url",
        image_url: {
          url: image_url,
          detail: enableHighResolution ? "high" : "low",
        },
      },
    ]);
  };

  const handleAddFromFile = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) return;

      let compressedDataUrl: string;

      if (enableCompression) {
        compressedDataUrl = await new Promise<string>((resolve, reject) => {
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
        compressedDataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            resolve(e.target?.result as string);
          };
          reader.readAsDataURL(file);
        });
      }

      setImages([
        ...images,
        {
          type: "image_url",
          image_url: {
            url: compressedDataUrl,
            detail: enableHighResolution ? "high" : "low",
          },
        },
      ]);
    };
    input.click();
  };

  const handleEditImage = (index: number) => {
    const image_url = prompt(tr("Enter new image URL:", langCode));
    if (!image_url) return;

    images[index].image_url = {
      url: image_url,
      detail: enableHighResolution ? "high" : "low",
    };
    setImages([...images]);
  };

  const handleToggleResolution = (index: number) => {
    if (images[index].image_url === undefined) return;
    images[index].image_url.detail =
      images[index].image_url?.detail === "low" ? "high" : "low";
    setImages([...images]);
  };

  const handleDeleteImage = (index: number) => {
    if (!confirm(tr("Are you sure you want to delete this image?", langCode)))
      return;
    images.splice(index, 1);
    setImages([...images]);
  };

  return (
    <Dialog open={showAddImage} onOpenChange={setShowAddImage}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          type="button"
          disabled={disableFactor.some((factor) => factor)}
          className="hover:bg-accent"
        >
          <ImageIcon className="size-4" />
          <span className="sr-only">
            <Tr>Add Image</Tr>
          </span>
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-left pb-4">
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="size-5" />
            <Tr>Image Manager</Tr>
          </DialogTitle>
          <DialogDescription>
            <Tr>
              Add and manage images for your conversation. Upload from your
              device or add from URL.
            </Tr>
          </DialogDescription>
        </DialogHeader>

        {/* Add Images Section */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Upload className="size-4" />
              <Tr>Add Images</Tr>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3 flex-wrap">
              <Button
                onClick={handleAddFromUrl}
                variant="outline"
                className="flex items-center gap-2 flex-1 min-w-[140px]"
              >
                <Link className="size-4" />
                <Tr>Add from URL</Tr>
              </Button>
              <Button
                onClick={handleAddFromFile}
                className="flex items-center gap-2 flex-1 min-w-[140px]"
              >
                <Upload className="size-4" />
                <Tr>Upload from Device</Tr>
              </Button>
            </div>

            <div className="flex items-center space-x-2 p-3 bg-muted/50 rounded-lg">
              <Checkbox
                id="high-res-global"
                checked={enableHighResolution}
                onCheckedChange={(checked) =>
                  setEnableHighResolution(checked === true)
                }
              />
              <label
                htmlFor="high-res-global"
                className="text-sm font-medium cursor-pointer"
              >
                <Tr>Use high resolution for new images</Tr>
              </label>
              <Badge
                variant={enableHighResolution ? "default" : "secondary"}
                className="ml-auto text-xs"
              >
                {enableHighResolution ? (
                  <Tr>High Quality</Tr>
                ) : (
                  <Tr>Standard Quality</Tr>
                )}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Compression Settings */}
        <Card className="mb-6">
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
                  Note: Image compression will only be applied when uploading
                  from device if this option is enabled.
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
                    Compression reduces file size without changing resolution.
                    Higher quality = larger file size but better image clarity.
                  </Tr>
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Image Gallery */}
        {images.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ImageIcon className="size-4" />
                <Tr>Added Images</Tr> ({images.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {images.map((image, index) => (
                  <div
                    key={index}
                    className="group relative border rounded-lg overflow-hidden bg-card"
                  >
                    <div className="aspect-square relative">
                      {image.type === "image_url" && (
                        <img
                          className="w-full h-full object-cover"
                          src={image.image_url?.url}
                          alt={`Uploaded image ${index + 1}`}
                        />
                      )}

                      {/* Overlay controls */}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleEditImage(index)}
                          className="h-8 w-8 p-0"
                        >
                          <PenIcon className="size-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteImage(index)}
                          className="h-8 w-8 p-0"
                        >
                          <XIcon className="size-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Image info footer */}
                    <div className="p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          <Tr>Image</Tr> {index + 1}
                        </span>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`hires-${index}`}
                            checked={image.image_url?.detail === "high"}
                            onCheckedChange={() =>
                              handleToggleResolution(index)
                            }
                            className="h-3 w-3"
                          />
                          <label
                            htmlFor={`hires-${index}`}
                            className="text-xs font-medium cursor-pointer"
                          >
                            <Tr>HiRes</Tr>
                          </label>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEditImage(index)}
                          className="h-6 text-xs px-2 flex-1"
                        >
                          <PenIcon className="size-3 mr-1" />
                          <Tr>Edit</Tr>
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteImage(index)}
                          className="h-6 text-xs px-2 text-destructive hover:text-destructive flex-1"
                        >
                          <XIcon className="size-3 mr-1" />
                          <Tr>Delete</Tr>
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {images.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <ImageIcon className="size-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">
              <Tr>No images added yet</Tr>
            </p>
            <p className="text-xs mt-1">
              <Tr>Upload an image or add from URL to get started</Tr>
            </p>
          </div>
        )}

        <DialogFooter className="pt-6">
          <Button onClick={() => setShowAddImage(false)} size="lg">
            <Tr>Done</Tr> ({images.length} <Tr>images</Tr>)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
