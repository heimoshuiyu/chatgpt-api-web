import { ChatStore, ChatStoreMessage } from "@/types/chatstore";
import { isVailedJSON } from "@/utils/isVailedJSON";
import { calculate_token_length } from "@/chatgpt";
import { Tr } from "@/translate";

import { Textarea } from "@/components/ui/textarea";
import { useContext } from "react";
import { AppChatStoreContext, AppContext } from "../pages/App";

interface Props {
  chat: ChatStoreMessage;
  setShowEdit: (se: boolean) => void;
}
export function EditMessageString({ chat, setShowEdit }: Props) {
  const { chatStore, setChatStore } = useContext(AppChatStoreContext);

  if (typeof chat.content !== "string") return <div>error</div>;
  return (
    <div className="flex flex-col">
      {chat.tool_call_id && (
        <span className="my-2">
          <label>tool_call_id: </label>
          <input
            className="rounded border border-gray-400"
            value={chat.tool_call_id}
            onChange={(event: any) => {
              chat.tool_call_id = event.target.value;
              setChatStore({ ...chatStore });
            }}
          />
        </span>
      )}
      {chat.tool_calls &&
        chat.tool_calls.map((tool_call) => (
          <div className="flex flex-col w-full">
            <span className="my-2 w-full">
              <label>Tool Call ID: </label>
              <input
                value={tool_call.id}
                className="rounded border border-gray-400"
              />
            </span>
            <span className="my-2 w-full">
              <label>Function: </label>
              <input
                value={tool_call.function.name}
                className="rounded border border-gray-400"
              />
            </span>
            <span className="my-2">
              <label>Arguments: </label>
              <span className="underline">
                Vailed JSON:{" "}
                {isVailedJSON(tool_call.function.arguments) ? "🆗" : "❌"}
              </span>
              <textarea
                className="rounded border border-gray-400 w-full h-32 my-2"
                value={tool_call.function.arguments}
                onChange={(event: any) => {
                  tool_call.function.arguments = event.target.value.trim();
                  setChatStore({ ...chatStore });
                }}
              ></textarea>
            </span>
            <span className="flex flex-col my-2 justify-between">
              <button
                className="bg-red-300 text-black p-1 rounded"
                onClick={() => {
                  if (!chat.tool_calls) return;
                  chat.tool_calls = chat.tool_calls.filter(
                    (tc) => tc.id !== tool_call.id
                  );
                  setChatStore({ ...chatStore });
                }}
              >
                <Tr>Delete this tool call</Tr>
              </button>
            </span>
            <hr className="my-2" />
            <span className="flex flex-col my-2 justify-between">
              <button
                className="bg-blue-300 text-black p-1 rounded"
                onClick={() => {
                  if (!chat.tool_calls) return;
                  chat.tool_calls.push({
                    type: "function",
                    index: chat.tool_calls.length,
                    id: "",
                    function: {
                      name: "",
                      arguments: "",
                    },
                  });
                  setChatStore({ ...chatStore });
                }}
              >
                <Tr>Add a tool call</Tr>
              </button>
            </span>
          </div>
        ))}
      <Textarea
        className="w-full h-32 my-2"
        value={chat.content}
        onBlur={(event) => {
          chat.content = event.target.value;
          chat.token = calculate_token_length(chat.content);
          setChatStore({ ...chatStore });
        }}
        onKeyPress={(event) => {
          if (event.keyCode == 27) {
            setShowEdit(false);
          }
        }}
      />
    </div>
  );
}
