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
                input.onchange = (event) => {
                  const file = (event.target as HTMLInputElement).files?.[0];
                  if (!file) {
                    return;
                  }
                  const reader = new FileReader();
                  reader.readAsDataURL(file);
                  reader.onloadend = () => {
                    const base64data = reader.result;
                    setImages([
                      ...images,
                      {
                        type: "image_url",
                        image_url: {
                          url: String(base64data),
                          detail: enableHighResolution ? "high" : "low",
                        },
                      },
                    ]);
                  };
                };
                input.click();
              }}
            >
              Add from local file
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
