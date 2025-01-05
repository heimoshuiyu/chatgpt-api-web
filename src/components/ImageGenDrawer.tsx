import { useContext, useState } from "react";
import { MessageDetail } from "@/chatgpt";
import { Tr } from "@/translate";

import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AppContext } from "@/pages/App";
import { PaintBucketIcon } from "lucide-react";

interface Props {
  disableFactor: boolean[];
}
interface ImageResponse {
  url?: string;
  b64_json?: string;
  revised_prompt: string;
}
export function ImageGenDrawer({ disableFactor }: Props) {
  const ctx = useContext(AppContext);
  if (ctx === null) return <></>;

  const [showGenImage, setShowGenImage] = useState(false);
  const [imageGenPrompt, setImageGenPrompt] = useState("");
  const [imageGenModel, setImageGenModel] = useState("dall-e-3");
  const [imageGenN, setImageGenN] = useState(1);
  const [imageGenQuality, setImageGEnQuality] = useState("standard");
  const [imageGenResponseFormat, setImageGenResponseFormat] =
    useState("b64_json");
  const [imageGenSize, setImageGenSize] = useState("1024x1024");
  const [imageGenStyle, setImageGenStyle] = useState("vivid");
  const [imageGenGenerating, setImageGenGenerating] = useState(false);
  useState("b64_json");
  return (
    <>
      {ctx.chatStore.image_gen_api && ctx.chatStore.image_gen_key ? (
        <Drawer open={showGenImage} onOpenChange={setShowGenImage}>
          <DrawerTrigger>
            <Button
              variant="ghost"
              size="icon"
              type="button"
              disabled={disableFactor.some((factor) => factor)}
            >
              <PaintBucketIcon className="size-4" />
              <span className="sr-only">Generate Image</span>
            </Button>
          </DrawerTrigger>
          <DrawerContent>
            <div className="mx-auto w-full max-w-lg">
              <DrawerHeader>
                <DrawerTitle>Generate Image</DrawerTitle>
              </DrawerHeader>
              <div className="flex flex-col">
                <span className="flex flex-col justify-between m-1 p-1">
                  <Label>Prompt: </Label>
                  <Textarea
                    className="textarea textarea-sm textarea-bordered"
                    value={imageGenPrompt}
                    onChange={(e: any) => {
                      setImageGenPrompt(e.target.value);
                    }}
                  />
                </span>
                <span className="flex flex-row justify-between items-center m-1 p-1">
                  <label>Model: </label>
                  <select
                    className="select select-sm select-bordered"
                    value={imageGenModel}
                    onChange={(e: any) => {
                      setImageGenModel(e.target.value);
                    }}
                  >
                    <option value="dall-e-3">DALL-E 3</option>
                    <option value="dall-e-2">DALL-E 2</option>
                  </select>
                </span>
                <span className="flex flex-row justify-between items-center m-1 p-1">
                  <label>n: </label>
                  <input
                    className="input input-sm input-bordered"
                    value={imageGenN}
                    type="number"
                    min={1}
                    max={10}
                    onChange={(e: any) =>
                      setImageGenN(parseInt(e.target.value))
                    }
                  />
                </span>
                <span className="flex flex-row justify-between items-center m-1 p-1">
                  <label>Quality: </label>
                  <select
                    className="select select-sm select-bordered"
                    value={imageGenQuality}
                    onChange={(e: any) => setImageGEnQuality(e.target.value)}
                  >
                    <option value="hd">HD</option>
                    <option value="standard">Standard</option>
                  </select>
                </span>
                <span className="flex flex-row justify-between items-center m-1 p-1">
                  <label>Response Format: </label>
                  <select
                    className="select select-sm select-bordered"
                    value={imageGenResponseFormat}
                    onChange={(e: any) =>
                      setImageGenResponseFormat(e.target.value)
                    }
                  >
                    <option value="b64_json">b64_json</option>
                    <option value="url">url</option>
                  </select>
                </span>
                <span className="flex flex-row justify-between items-center m-1 p-1">
                  <label>Size: </label>
                  <select
                    className="select select-sm select-bordered"
                    value={imageGenSize}
                    onChange={(e: any) => setImageGenSize(e.target.value)}
                  >
                    <option value="256x256">256x256 (dall-e-2)</option>
                    <option value="512x512">512x512 (dall-e-2)</option>
                    <option value="1024x1024">1024x1024 (dall-e-2/3)</option>
                    <option value="1792x1024">1792x1024 (dall-e-3)</option>
                    <option value="1024x1792">1024x1792 (dall-e-3)</option>
                  </select>
                </span>
                <span className="flex flex-row justify-between items-center m-1 p-1">
                  <label>Style (only dall-e-3): </label>
                  <select
                    className="select select-sm select-bordered"
                    value={imageGenStyle}
                    onChange={(e: any) => setImageGenStyle(e.target.value)}
                  >
                    <option value="vivid">vivid</option>
                    <option value="natural">natural</option>
                  </select>
                </span>
                <span className="flex flex-row justify-between items-center m-1 p-1">
                  <Button
                    variant="default"
                    size="sm"
                    disabled={imageGenGenerating}
                    onClick={async () => {
                      try {
                        setImageGenGenerating(true);
                        const body: any = {
                          prompt: imageGenPrompt,
                          model: imageGenModel,
                          n: imageGenN,
                          quality: imageGenQuality,
                          response_format: imageGenResponseFormat,
                          size: imageGenSize,
                        };
                        if (imageGenModel === "dall-e-3") {
                          body.style = imageGenStyle;
                        }
                        const resp: ImageResponse[] = (
                          await fetch(ctx.chatStore.image_gen_api, {
                            method: "POST",
                            headers: {
                              "Content-Type": "application/json",
                              Authorization: `Bearer ${ctx.chatStore.image_gen_key}`,
                            },
                            body: JSON.stringify(body),
                          }).then((resp) => resp.json())
                        ).data;
                        console.log("image gen resp", resp);

                        for (const image of resp) {
                          let url = "";
                          if (image.url) url = image.url;
                          if (image.b64_json)
                            url = "data:image/png;base64," + image.b64_json;
                          if (!url) continue;

                          ctx.chatStore.history.push({
                            role: "assistant",
                            content: [
                              {
                                type: "image_url",
                                image_url: {
                                  url,
                                  detail: "low",
                                },
                              },
                              {
                                type: "text",
                                text: image.revised_prompt,
                              },
                            ],
                            hide: false,
                            token: 65,
                            example: false,
                            audio: null,
                            logprobs: null,
                            response_model_name: imageGenModel,
                          });

                          ctx.setChatStore({ ...ctx.chatStore });
                        }
                      } catch (e) {
                        console.error(e);
                        alert("Failed to generate image: " + e);
                      } finally {
                        setImageGenGenerating(false);
                      }
                    }}
                  >
                    {Tr("Generate")}
                  </Button>
                </span>
              </div>

              <DrawerFooter>
                <Button onClick={() => setShowGenImage(false)}>Done</Button>
              </DrawerFooter>
            </div>
          </DrawerContent>
        </Drawer>
      ) : (
        <Button variant="ghost" size="icon" type="button" disabled={true}>
          <PaintBucketIcon className="size-4" />
          <span className="sr-only">Generate Image</span>
        </Button>
      )}
    </>
  );
}
