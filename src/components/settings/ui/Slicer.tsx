import React, { useContext } from "react";
import { AppChatStoreContext } from "@/pages/App";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { MoveHorizontalIcon, InfoIcon } from "lucide-react";

interface SlicerProps {
  field: "temperature" | "top_p" | "tts_speed";
  help: string;
  min: number;
  max: number;
}

export const Slicer: React.FC<SlicerProps> = ({ field, help, min, max }) => {
  const { chatStore, setChatStore } = useContext(AppChatStoreContext);
  const enable_filed_name: "temperature_enabled" | "top_p_enabled" =
    `${field}_enabled` as any;

  const enabled = chatStore[enable_filed_name];

  if (enabled === null || enabled === undefined) {
    if (field === "temperature") {
      chatStore[enable_filed_name] = true;
    }
    if (field === "top_p") {
      chatStore[enable_filed_name] = false;
    }
  }

  const setEnabled = (state: boolean) => {
    chatStore[enable_filed_name] = state;
    setChatStore({ ...chatStore });
  };

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        <MoveHorizontalIcon className="w-4 h-4" />
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
        <Checkbox
          checked={chatStore[enable_filed_name]}
          onCheckedChange={(checked: boolean) => setEnabled(!!checked)}
        />
        {!chatStore[enable_filed_name] && (
          <span className="text-xs text-muted-foreground">disabled</span>
        )}
      </Label>

      {enabled && (
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <Slider
              disabled={!enabled}
              min={min}
              max={max}
              step={0.01}
              value={[chatStore[field]]}
              onValueChange={(value) => {
                chatStore[field] = value[0];
                setChatStore({ ...chatStore });
              }}
            />
          </div>
          <Input
            type="number"
            disabled={!enabled}
            className="w-24"
            value={chatStore[field]}
            onBlur={(e: React.ChangeEvent<HTMLInputElement>) => {
              const value = parseFloat(e.target.value);
              chatStore[field] = value;
              setChatStore({ ...chatStore });
            }}
          />
        </div>
      )}
    </div>
  );
};
