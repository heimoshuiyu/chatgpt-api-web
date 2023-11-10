import { useState } from "preact/hooks";
import { ChatStore } from "./app";
import { MessageDetail } from "./chatgpt";
import { Tr } from "./translate";

interface Props {
  chatStore: ChatStore;
  setChatStore: (cs: ChatStore) => void;
  images: MessageDetail[];
  setShowAddImage: (se: boolean) => void;
  setImages: (images: MessageDetail[]) => void;
}
interface ImageResponse {
  url?: string;
  b64_json?: string;
  revised_prompt: string;
}
export function AddImage({
  chatStore,
  setChatStore,
  setShowAddImage,
  setImages,
  images,
}: Props) {
  const [enableHighResolution, setEnableHighResolution] = useState(true);
  const [imageGenPrompt, setImageGenPrompt] = useState("");
  const [imageGenModel, setImageGenModel] = useState("dall-e-2");
  const [imageGenN, setImageGenN] = useState(1);
  const [imageGenQuality, setImageGEnQuality] = useState("standard");
  const [imageGenResponseFormat, setImageGenResponseFormat] =
    useState("b64_json");
  const [imageGenSize, setImageGenSize] = useState("1024x1024");
  const [imageGenStyle, setImageGenStyle] = useState("vivid");
  const [imageGenGenerating, setImageGenGenerating] = useState(false);
  useState("b64_json");
  return (
    <div
      className="absolute z-10 bg-black bg-opacity-50 w-full h-full flex justify-center items-center left-0 top-0 overflow-scroll"
      onClick={() => {
        setShowAddImage(false);
      }}
    >
      <div
        className="bg-white rounded p-2 z-20"
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <h2>Add Images</h2>
        <span>
          <button
            className="disabled:line-through disabled:bg-slate-500 rounded m-1 p-1 border-2 bg-cyan-400 hover:bg-cyan-600"
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
          </button>
          <button
            className="disabled:line-through disabled:bg-slate-500 rounded m-1 p-1 border-2 bg-cyan-400 hover:bg-cyan-600"
            onClick={() => {
              // select file and load it to base64 image URL format
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
          </button>
          <span
            onClick={() => {
              setEnableHighResolution(!enableHighResolution);
            }}
          >
            <label>High resolution</label>
            <input type="checkbox" checked={enableHighResolution} />
          </span>
        </span>
        {chatStore.image_gen_api && chatStore.image_gen_key && (
          <div className="flex flex-col">
            <hr className="my-2" />
            <h3>Generate Image</h3>
            <span className="flex flex-row justify-between m-1 p-1">
              <label>Prompt: </label>
              <textarea
                className="border rounded border-gray-400"
                value={imageGenPrompt}
                onChange={(e: any) => {
                  setImageGenPrompt(e.target.value);
                }}
              />
            </span>
            <span className="flex flex-row justify-between m-1 p-1">
              <label>Model: </label>
              <select
                value={imageGenModel}
                onChange={(e: any) => {
                  setImageGenModel(e.target.value);
                }}
              >
                <option value="dall-e-3">DALL-E 3</option>
                <option value="dall-e-2">DALL-E 2</option>
              </select>
            </span>
            <span className="flex flex-row justify-between m-1 p-1">
              <label>n: </label>
              <input
                value={imageGenN}
                type="number"
                min={1}
                max={10}
                onChange={(e: any) => setImageGenN(parseInt(e.target.value))}
              />
            </span>
            <span className="flex flex-row justify-between m-1 p-1">
              <label>Quality: </label>
              <select
                value={imageGenQuality}
                onChange={(e: any) => setImageGEnQuality(e.target.value)}
              >
                <option value="hd">HD</option>
                <option value="standard">Standard</option>
              </select>
            </span>
            <span className="flex flex-row justify-between m-1 p-1">
              <label>Response Format: </label>
              <select
                value={imageGenResponseFormat}
                onChange={(e: any) => setImageGenResponseFormat(e.target.value)}
              >
                <option value="b64_json">b64_json</option>
                <option value="url">url</option>
              </select>
            </span>
            <span className="flex flex-row justify-between m-1 p-1">
              <label>Size: </label>
              <select
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
            <span className="flex flex-row justify-between m-1 p-1">
              <label>Style (only dall-e-3): </label>
              <select
                value={imageGenStyle}
                onChange={(e: any) => setImageGenStyle(e.target.value)}
              >
                <option value="vivid">vivid</option>
                <option value="natural">natural</option>
              </select>
            </span>
            <span className="flex flex-row justify-between m-1 p-1">
              <button
                className="bg-sky-400 m-1 p-1 rounded disabled:bg-slate-500"
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
                      await fetch(chatStore.image_gen_api, {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                          Authorization: `Bearer ${chatStore.image_gen_key}`,
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

                      chatStore.history.push({
                        role: "user",
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
                      });

                      setChatStore({ ...chatStore });
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
              </button>
            </span>
          </div>
        )}
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
                <button
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
                  🖋
                </button>
                <span
                  onClick={() => {
                    if (image.image_url === undefined) return;
                    image.image_url.detail =
                      image.image_url?.detail === "low" ? "high" : "low";
                    setImages([...images]);
                  }}
                >
                  <label>HiRes</label>
                  <input
                    type="checkbox"
                    checked={image.image_url?.detail === "high"}
                  />
                </span>
                <button
                  onClick={() => {
                    if (!confirm("Are you sure to delete this image?")) {
                      return;
                    }
                    images.splice(index, 1);
                    setImages([...images]);
                  }}
                >
                  ❌
                </button>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
