import { useState, useEffect, StateUpdater, Dispatch } from "preact/hooks";
import { Tr, langCodeContext, LANG_OPTIONS, tr } from "@/translate";
import { ChatStore, ChatStoreMessage } from "@/types/chatstore";
import { EditMessageString } from "@/editMessageString";
import { EditMessageDetail } from "@/editMessageDetail";

interface EditMessageProps {
  chat: ChatStoreMessage;
  chatStore: ChatStore;
  setShowEdit: Dispatch<StateUpdater<boolean>>;
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
          {chatStore.develop_mode && (
            <button
              className="w-full m-2 p-1 rounded bg-red-500"
              onClick={() => {
                const confirm = window.confirm(
                  "Change message type will clear the content, are you sure?",
                );
                if (!confirm) return;

                if (typeof chat.content === "string") {
                  chat.content = [];
                } else {
                  chat.content = "";
                }
                setChatStore({ ...chatStore });
              }}
            >
              Switch to{" "}
              {typeof chat.content === "string"
                ? "media message"
                : "string message"}
            </button>
          )}
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
