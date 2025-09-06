import React, { useState, useContext } from "react";
import { AppChatStoreContext } from "@/pages/App";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { KeyIcon, InfoIcon, EyeIcon } from "lucide-react";

interface InputFieldProps {
  field:
    | "apiKey"
    | "apiEndpoint"
    | "whisper_api"
    | "whisper_key"
    | "tts_api"
    | "tts_key"
    | "tts_model"
    | "image_gen_api"
    | "image_gen_key";
  help: string;
}

export const InputField: React.FC<InputFieldProps> = ({ field, help }) => {
  const { chatStore, setChatStore } = useContext(AppChatStoreContext);
  const [hideInput, setHideInput] = useState(true);

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        <KeyIcon className="w-4 h-4" />
        {field}
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon">
              <InfoIcon className="w-4 h-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{field}</DialogTitle>
              <DialogDescription>{help}</DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      </Label>

      <div className="flex w-full items-center space-x-2">
        <Input
          type={hideInput ? "password" : "text"}
          value={chatStore[field]}
          onBlur={(event: React.ChangeEvent<HTMLInputElement>) => {
            chatStore[field] = event.target.value;
            setChatStore({ ...chatStore });
          }}
        />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setHideInput(!hideInput)}
        >
          {hideInput ? (
            <EyeIcon className="h-4 w-4" />
          ) : (
            <KeyIcon className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
};
