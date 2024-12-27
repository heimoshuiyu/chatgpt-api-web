import { useState, useEffect, Dispatch } from "react";
import { Tr, langCodeContext, LANG_OPTIONS, tr } from "@/translate";
import { ChatStore, ChatStoreMessage } from "@/types/chatstore";
import { EditMessageString } from "@/editMessageString";
import { EditMessageDetail } from "@/editMessageDetail";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "./components/ui/button";

interface EditMessageProps {
  chat: ChatStoreMessage;
  chatStore: ChatStore;
  showEdit: boolean;
  setShowEdit: Dispatch<boolean>;
  setChatStore: (cs: ChatStore) => void;
}
export function EditMessage(props: EditMessageProps) {
  const { showEdit, setShowEdit, chat, setChatStore, chatStore } = props;

  return (
    <Dialog open={showEdit} onOpenChange={setShowEdit}>
      {/* <DialogTrigger>
        <button className="btn btn-sm btn-outline"></button>
      </DialogTrigger> */}
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Message</DialogTitle>
          <DialogDescription>
            Make changes to the message content.
          </DialogDescription>
        </DialogHeader>
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
        {chatStore.develop_mode && (
          <Button
            variant="destructive"
            className="w-full"
            onClick={() => {
              const confirm = window.confirm(
                "Change message type will clear the content, are you sure?"
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
          </Button>
        )}
        <Button onClick={() => setShowEdit(false)}>Save & Close</Button>
      </DialogContent>
    </Dialog>
  );
}
