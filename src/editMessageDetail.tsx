import { ChatStore, ChatStoreMessage } from "@/app";
import { calculate_token_length } from "@/chatgpt";
import { Tr } from "@/translate";

interface Props {
  chat: ChatStoreMessage;
  chatStore: ChatStore;
  setChatStore: (cs: ChatStore) => void;
  setShowEdit: (se: boolean) => void;
}
export function EditMessageDetail({
  chat,
  chatStore,
  setChatStore,
  setShowEdit,
}: Props) {
  if (typeof chat.content !== "object") return <div>error</div>;
  return (
    <div
      className={"w-full h-full flex flex-col overflow-scroll"}
      onClick={(event) => event.stopPropagation()}
    >
      {chat.content.map((mdt, index) => (
        <div className={"w-full p-2 px-4"}>
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
                <button
                  className="bg-blue-300 p-1 rounded m-1"
                  onClick={() => {
                    const image_url = prompt("image url", mdt.image_url?.url);
                    if (image_url) {
                      if (typeof chat.content === "string") return;
                      const obj = chat.content[index].image_url;
                      if (obj === undefined) return;
                      obj.url = image_url;
                      setChatStore({ ...chatStore });
                    }
                  }}
                >
                  {Tr("Edit URL")}
                </button>
                <button
                  className="bg-blue-300 p-1 rounded m-1"
                  onClick={() => {
                    // select file and load it to base64 image URL format
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
                  {Tr("Upload")}
                </button>
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

            <button
              onClick={() => {
                if (typeof chat.content === "string") return;
                chat.content.splice(index, 1);
                chat.token = calculate_token_length(chat.content);
                setChatStore({ ...chatStore });
              }}
            >
              ❌
            </button>
          </div>
        </div>
      ))}
      <button
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
        {Tr("Add text")}
      </button>
      <button
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
        {Tr("Add image")}
      </button>
    </div>
  );
}
