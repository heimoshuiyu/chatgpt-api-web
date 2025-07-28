import React, { useContext } from "react";
import { AppChatStoreContext } from "@/pages/App";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { InfoIcon } from "lucide-react";

interface ChoiceCheckboxProps {
  field: "streamMode" | "develop_mode" | "json_mode" | "logprobs";
  help: string;
}

export const ChoiceCheckbox: React.FC<ChoiceCheckboxProps> = ({
  field,
  help,
}) => {
  const { chatStore, setChatStore } = useContext(AppChatStoreContext);

  return (
    <div className="flex items-center space-x-2">
      <div className="flex items-center">
        <Checkbox
          id={`${field}-checkbox`}
          checked={chatStore[field]}
          onCheckedChange={(checked: boolean) => {
            chatStore[field] = checked;
            setChatStore({ ...chatStore });
          }}
        />
      </div>
      <label
        htmlFor={`${field}-checkbox`}
        className="flex items-center gap-2 font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
      >
        {field}
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon">
              <InfoIcon />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{field} Help</DialogTitle>
            </DialogHeader>
            {help}
          </DialogContent>
        </Dialog>
      </label>
    </div>
  );
};
