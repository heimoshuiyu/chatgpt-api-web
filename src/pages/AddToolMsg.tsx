import { Dispatch, useState } from "react";

import { Tr } from "@/translate";
import { calculate_token_length } from "@/chatgpt";
import { ChatStore } from "@/types/chatstore";

const AddToolMsg = (props: {
  setShowAddToolMsg: Dispatch<boolean>;
  chatStore: ChatStore;
  setChatStore: (cs: ChatStore) => void;
}) => {
  const { setShowAddToolMsg, chatStore, setChatStore } = props;

  const [newToolCallID, setNewToolCallID] = useState("");
  const [newToolContent, setNewToolContent] = useState("");
  return (
    <div
      className="absolute z-10 bg-black bg-opacity-50 w-full h-full flex justify-center items-center left-0 top-0 overflow-scroll"
      onClick={() => {
        setShowAddToolMsg(false);
      }}
    >
      <div
        className="bg-white rounded p-2 z-20 flex flex-col"
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <h2>Add Tool Message</h2>
        <hr className="my-2" />
        <span>
          <label>tool_call_id</label>
          <input
            className="rounded m-1 p-1 border-2 border-gray-400"
            type="text"
            value={newToolCallID}
            onChange={(event: any) => setNewToolCallID(event.target.value)}
          />
        </span>
        <span>
          <label>Content</label>
          <textarea
            className="rounded m-1 p-1 border-2 border-gray-400"
            rows={5}
            value={newToolContent}
            onChange={(event: any) => setNewToolContent(event.target.value)}
          ></textarea>
        </span>
        <span className={`flex justify-between p-2`}>
          <button
            className="btn btn-info m-1 p-1"
            onClick={() => setShowAddToolMsg(false)}
          >
            {Tr("Cancle")}
          </button>
          <button
            className="rounded m-1 p-1 border-2 bg-cyan-400 hover:bg-cyan-600"
            onClick={() => {
              if (!newToolCallID.trim()) {
                alert("tool_call_id is empty");
                return;
              }
              if (!newToolContent.trim()) {
                alert("content is empty");
                return;
              }
              chatStore.history.push({
                role: "tool",
                tool_call_id: newToolCallID.trim(),
                content: newToolContent.trim(),
                token: calculate_token_length(newToolContent),
                hide: false,
                example: false,
                audio: null,
                logprobs: null,
                response_model_name: null,
                reasoning_content: null,
              });
              setChatStore({ ...chatStore });
              setNewToolCallID("");
              setNewToolContent("");
              setShowAddToolMsg(false);
            }}
          >
            {Tr("Add")}
          </button>
        </span>
      </div>
    </div>
  );
};

export default AddToolMsg;
