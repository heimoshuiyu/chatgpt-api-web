import { ChatStoreMessage } from "@/app";

interface Props {
  chat: ChatStoreMessage;
  renderMarkdown: boolean;
}
export function MessageDetail({ chat, renderMarkdown }: Props) {
  if (typeof chat.content === "string") {
    return <div></div>;
  }
  return (
    <div>
      {chat.content.map((mdt) =>
        mdt.type === "text" ? (
          chat.hide ? (
            mdt.text?.split("\n")[0].slice(0, 16) + " ..."
          ) : renderMarkdown ? (
            // @ts-ignore
            <Markdown markdown={mdt.text} />
          ) : (
            mdt.text
          )
        ) : (
          <img
            className="my-2 rounded-md max-w-64 max-h-64"
            src={mdt.image_url?.url}
            onClick={() => {
              window.open(mdt.image_url?.url, "_blank");
            }}
          />
        ),
      )}
    </div>
  );
}
