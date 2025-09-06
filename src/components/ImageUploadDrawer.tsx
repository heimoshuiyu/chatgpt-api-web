import { useContext, useState } from "react";
import { MessageDetail } from "@/chatgpt";
import { Tr } from "@/translate";

import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

import { Button } from "@/components/ui/button";
import { PenIcon, XIcon, ImageIcon } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { AppContext } from "@/pages/App";

interface Props {
  images: MessageDetail[];
  setImages: (images: MessageDetail[]) => void;
  disableFactor: boolean[];
}
export function ImageUploadDrawer({ setImages, images, disableFactor }: Props) {
  const ctx = useContext(AppContext);
  const [showAddImage, setShowAddImage] = useState(false);
  const [enableHighResolution, setEnableHighResolution] = useState(true);
  const [enableCompression, setEnableCompression] = useState(false);
  const [compressionQuality, setCompressionQuality] = useState(80);
  useState("b64_json");
  return (
    <Drawer open={showAddImage} onOpenChange={setShowAddImage}>
      <DrawerTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          type="button"
          disabled={disableFactor.some((factor) => factor)}
        >
          <ImageIcon className="size-4" />
          <span className="sr-only">Add Image</span>
        </Button>
      </DrawerTrigger>
      <DrawerDescription className="sr-only">
        Add images to the chat.
      </DrawerDescription>
      <DrawerContent>
        <div className="mx-auto w-full max-w-lg">
          <DrawerHeader>
            <DrawerTitle>Add Images</DrawerTitle>
          </DrawerHeader>
          <div className="flex gap-2 items-center">
            <Button
              variant="secondary"
              size="sm"
              disabled={false}
              onClick={() => {
                const image_url = prompt("Image URL");
                if (!image_url) {
                  return;
                }
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
              }}
            >
              Add from URL
            </Button>
            <Button
              variant="default"
              size="sm"
              disabled={false}
              onClick={() => {
                const input = document.createElement("input");
                input.type = "file";
                input.accept = "image/*";
                input.onchange = async (event) => {
                  const file = (event.target as HTMLInputElement).files?.[0];
                  if (!file) {
                    return;
                  }

                  let compressedDataUrl: string;

                  if (enableCompression) {
                    // Compress the image using canvas
                    compressedDataUrl = await new Promise<string>(
                      (resolve, reject) => {
                        const img = new Image();
                        img.onload = () => {
                          const canvas = document.createElement("canvas");
                          const ctx = canvas.getContext("2d");

                          if (!ctx) {
                            reject(new Error("Could not get canvas context"));
                            return;
                          }

                          // Keep original resolution
                          canvas.width = img.width;
                          canvas.height = img.height;

                          // Draw image on canvas
                          ctx.drawImage(img, 0, 0);

                          // Convert to compressed data URL
                          const quality = compressionQuality / 100;
                          const compressedDataUrl = canvas.toDataURL(
                            "image/jpeg",
                            quality
                          );

                          resolve(compressedDataUrl);
                        };

                        img.onerror = () =>
                          reject(new Error("Failed to load image"));

                        // Load the original file
                        const reader = new FileReader();
                        reader.onload = (e) => {
                          img.src = e.target?.result as string;
                        };
                        reader.readAsDataURL(file);
                      }
                    );
                  } else {
                    // Use original file without compression
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
              }}
            >
              Add from local file{enableCompression && " (Compression)"}
            </Button>
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={enableHighResolution}
                onCheckedChange={(checked) =>
                  setEnableHighResolution(checked === true)
                }
              />
              <label
                htmlFor="terms"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                High resolution
              </label>
            </div>
          </div>

          <div className="space-y-4 mt-4 p-4 border rounded-lg">
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={enableCompression}
                onCheckedChange={(checked) =>
                  setEnableCompression(checked === true)
                }
              />
              <label className="text-sm font-medium">
                Enable image compression
              </label>
            </div>

            {enableCompression && (
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Compression Quality: {compressionQuality}%
                </label>
                <Slider
                  value={[compressionQuality]}
                  onValueChange={(value) => setCompressionQuality(value[0])}
                  max={95}
                  min={10}
                  step={5}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Higher quality = larger file size. Compression reduces file
                  size without changing resolution.
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-wrap">
            {images.map((image, index) => (
              <div className="flex flex-col">
                {image.type === "image_url" && (
                  <img
                    className="rounded m-1 p-1 border-2 border-gray-400 w-32"
                    src={image.image_url?.url}
                  />
                )}
                <span className="flex justify-between">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const image_url = prompt("Image URL");
                      if (!image_url) {
                        return;
                      }
                      images[index].image_url = {
                        url: image_url,
                        detail: enableHighResolution ? "high" : "low",
                      };
                      setImages([...images]);
                    }}
                  >
                    <PenIcon />
                  </Button>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={`hires-${index}`}
                      checked={image.image_url?.detail === "high"}
                      onCheckedChange={() => {
                        if (image.image_url === undefined) return;
                        image.image_url.detail =
                          image.image_url?.detail === "low" ? "high" : "low";
                        setImages([...images]);
                      }}
                    />
                    <label
                      htmlFor={`hires-${index}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      HiRes
                    </label>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (!confirm("Are you sure to delete this image?")) {
                        return;
                      }
                      images.splice(index, 1);
                      setImages([...images]);
                    }}
                  >
                    <XIcon />
                  </Button>
                </span>
              </div>
            ))}
          </div>

          <DrawerFooter>
            <Button onClick={() => setShowAddImage(false)}>Done</Button>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
