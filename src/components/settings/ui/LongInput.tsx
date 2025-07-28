import React, { useRef, useContext, useEffect, useState } from "react";
import { AppChatStoreContext } from "@/pages/App";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { InfoIcon } from "lucide-react";
import { autoHeight } from "@/utils/textAreaHelp";

interface LongInputProps {
  field: "systemMessageContent" | "toolsString";
  label: string;
  help: string;
  disabled?: boolean;
}

export const LongInput: React.FC<LongInputProps> = React.memo(
  ({ field, label, help, disabled = false }) => {
    const { chatStore, setChatStore } = useContext(AppChatStoreContext);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [localValue, setLocalValue] = useState(chatStore[field]);

    // Update height when value changes
    useEffect(() => {
      if (textareaRef.current) {
        autoHeight(textareaRef.current);
      }
    }, [localValue]);

    // Sync local value with chatStore when it changes externally
    useEffect(() => {
      setLocalValue(chatStore[field]);
    }, [chatStore[field]]);

    const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (!disabled) {
        setLocalValue(event.target.value);
      }
    };

    const handleBlur = () => {
      if (!disabled && localValue !== chatStore[field]) {
        chatStore[field] = localValue;
        setChatStore({ ...chatStore });
      }
    };

    return (
      <div>
        <Label htmlFor="name" className="text-right">
          {label}{" "}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon">
                <InfoIcon />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>{label} Help</DialogTitle>
              </DialogHeader>
              {help}
            </DialogContent>
          </Dialog>
        </Label>

        <Textarea
          ref={textareaRef}
          mockOnChange={false}
          className="h-24 w-full"
          value={localValue}
          onChange={handleChange}
          onBlur={handleBlur}
          disabled={disabled}
        />
      </div>
    );
  }
);
