import { Tr, langCodeContext, LANG_OPTIONS } from "./translate";
import { useState, useEffect, StateUpdater } from "preact/hooks";
import { ChatStore, ChatStoreMessage } from "./app";
import { calculate_token_length, getMessageText } from "./chatgpt";
import { isVailedJSON } from "./message";
import { EditMessageString } from "./editMessageString";
import { EditMessageDetail } from "./editMessageDetail";

interface EditMessageProps {
  chat: ChatStoreMessage;
  chatStore: ChatStore;
  setShowEdit: StateUpdater<boolean>;
  setChatStore: (cs: ChatStore) => void;
}
export function EditMessage(props: EditMessageProps) {
  const { setShowEdit, chat, setChatStore, chatStore } = props;

  return (
    <div
      className={
        "absolute bg-black bg-opacity-50 w-full h-full top-0 left-0 rounded z-10 overflow-scroll"
      }
      onClick={() => setShowEdit(false)}
    >
      <div
        className="m-10 p-2 bg-white rounded"
        onClick={(event: any) => {
          event.stopPropagation();
        }}
      >
        {typeof chat.content === "string" ? (
          <EditMessageString
            chat={chat}
            chatStore={chatStore}
            setChatStore={setChatStore}
            setShowEdit={setShowEdit}
          />
        ) : (
          <EditMessageDetail
            chat={chat}
            chatStore={chatStore}
            setChatStore={setChatStore}
            setShowEdit={setShowEdit}
          />
        )}
        <div className={"w-full flex justify-center"}>
          <button
            className={"w-full m-2 p-1 rounded bg-purple-500"}
            onClick={() => {
              setShowEdit(false);
            }}
          >
            {Tr("Close")}
          </button>
        </div>
      </div>
    </div>
  );
}
