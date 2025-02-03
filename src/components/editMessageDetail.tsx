import { ChatStore, ChatStoreMessage } from "@/types/chatstore";
import { calculate_token_length } from "@/chatgpt";
import { Tr } from "@/translate";

import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

import { Button } from "./ui/button";
import { useContext } from "react";
import { AppChatStoreContext, AppContext } from "../pages/App";

interface Props {
  chat: ChatStoreMessage;
  setShowEdit: (se: boolean) => void;
}
export function EditMessageDetail({ chat, setShowEdit }: Props) {
  const { chatStore, setChatStore } = useContext(AppChatStoreContext);

  if (typeof chat.content !== "object") return <div>error</div>;
  return (
    <Drawer open={true} onOpenChange={setShowEdit}>
      <DrawerTrigger>Open</DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Edit Message Detail</DrawerTitle>
          <DrawerDescription>
            Modify the content of the message.
          </DrawerDescription>
        </DrawerHeader>
        <div className={"w-full h-full flex flex-col overflow-scroll"}>
          {chat.content.map((mdt, index) => (
            <div className={"w-full p-2 px-4"} key={index}>
              <div className="flex justify-center">
                {mdt.type === "text" ? (
                  <textarea
                    className={"w-full border p-1 rounded"}
                    value={mdt.text}
                    onChange={(event: any) => {
                      if (typeof chat.content === "string") return;
                      chat.content[index].text = event.target.value;
                      chat.token = calculate_token_length(chat.content);
                      console.log("calculated token length", chat.token);
                      setChatStore({ ...chatStore });
                    }}
                    onKeyPress={(event: any) => {
                      if (event.keyCode == 27) {
                        setShowEdit(false);
                      }
                    }}
                  ></textarea>
                ) : (
                  <div className="border p-1 rounded">
                    <img
                      className="max-h-32 max-w-xs cursor-pointer m-2"
                      src={mdt.image_url?.url}
                      onClick={() => {
                        window.open(mdt.image_url?.url, "_blank");
                      }}
                    />
                    <Button
                      className="bg-blue-300 p-1 rounded m-1"
                      onClick={() => {
                        const image_url = prompt(
                          "image url",
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
                      className="bg-blue-300 p-1 rounded m-1"
                      onClick={() => {
                        const input = document.createElement("input");
                        input.type = "file";
                        input.accept = "image/*";
                        input.onchange = (event) => {
                          const file = (event.target as HTMLInputElement)
                            .files?.[0];
                          if (!file) {
                            return;
                          }
                          const reader = new FileReader();
                          reader.readAsDataURL(file);
                          reader.onloadend = () => {
                            const base64data = reader.result;
                            if (!base64data) return;
                            if (typeof chat.content === "string") return;
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
                    <span
                      className="bg-blue-300 p-1 rounded m-1"
                      onClick={() => {
                        if (typeof chat.content === "string") return;
                        const obj = chat.content[index].image_url;
                        if (obj === undefined) return;
                        obj.detail = obj.detail === "high" ? "low" : "high";
                        chat.token = calculate_token_length(chat.content);
                        setChatStore({ ...chatStore });
                      }}
                    >
                      <label>High Resolution</label>
                      <input
                        type="checkbox"
                        checked={mdt.image_url?.detail === "high"}
                      />
                    </span>
                  </div>
                )}
                <Button
                  onClick={() => {
                    if (typeof chat.content === "string") return;
                    chat.content.splice(index, 1);
                    chat.token = calculate_token_length(chat.content);
                    setChatStore({ ...chatStore });
                  }}
                >
                  ❌
                </Button>
              </div>
            </div>
          ))}
          <Button
            className={"m-2 p-1 rounded bg-green-500"}
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
            className={"m-2 p-1 rounded bg-green-500"}
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
        <DrawerFooter>
          <Button
            className="bg-blue-500 p-2 rounded"
            onClick={() => setShowEdit(false)}
          >
            <Tr>Close</Tr>
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
