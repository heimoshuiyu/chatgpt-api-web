import React, { useContext } from "react";
import { AppChatStoreContext } from "@/pages/App";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CircleEllipsisIcon, InfoIcon } from "lucide-react";

interface NumberInputProps {
  field:
    | "totalTokens"
    | "maxTokens"
    | "maxGenTokens"
    | "tokenMargin"
    | "postBeginIndex"
    | "presence_penalty"
    | "frequency_penalty";
  readOnly: boolean;
  help: string;
}

export const NumberInput: React.FC<NumberInputProps> = ({
  field,
  readOnly,
  help,
}) => {
  const { chatStore, setChatStore } = useContext(AppChatStoreContext);

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        <CircleEllipsisIcon className="h-4 w-4" />
        {field}
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon">
              <InfoIcon className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{field}</DialogTitle>
              <DialogDescription>{help}</DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>

        {field === "maxGenTokens" && (
          <Checkbox
            checked={chatStore.maxGenTokens_enabled}
            onCheckedChange={() => {
              const newChatStore = { ...chatStore };
              newChatStore.maxGenTokens_enabled =
                !newChatStore.maxGenTokens_enabled;
              setChatStore({ ...newChatStore });
            }}
          />
        )}

        {field === "presence_penalty" && (
          <Checkbox
            checked={chatStore.presence_penalty_enabled}
            onCheckedChange={() => {
              const newChatStore = { ...chatStore };
              newChatStore.presence_penalty_enabled =
                !newChatStore.presence_penalty_enabled;
              setChatStore({ ...newChatStore });
            }}
          />
        )}

        {field === "frequency_penalty" && (
          <Checkbox
            checked={chatStore.frequency_penalty_enabled}
            onCheckedChange={() => {
              const newChatStore = { ...chatStore };
              newChatStore.frequency_penalty_enabled =
                !newChatStore.frequency_penalty_enabled;
              setChatStore({ ...newChatStore });
            }}
          />
        )}
      </Label>

      <Input
        type="number"
        readOnly={readOnly}
        disabled={field === "maxGenTokens" && !chatStore.maxGenTokens_enabled}
        value={chatStore[field]}
        onBlur={(event: React.ChangeEvent<HTMLInputElement>) => {
          let newNumber = parseFloat(event.target.value);
          if (newNumber < 0) newNumber = 0;
          chatStore[field] = newNumber;
          setChatStore({ ...chatStore });
        }}
      />
    </div>
  );
};
