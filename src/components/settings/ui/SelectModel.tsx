import React, { useState, useContext } from "react";
import { AppChatStoreContext } from "@/pages/App";
import { models } from "@/types/models";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ListIcon, InfoIcon, CogIcon } from "lucide-react";
import { Tr } from "@/translate";

interface SelectModelProps {
  help: string;
}

export const SelectModel: React.FC<SelectModelProps> = ({ help }) => {
  const { chatStore, setChatStore } = useContext(AppChatStoreContext);

  let shouldIUseCustomModel: boolean = true;
  for (const model in models) {
    if (chatStore.model === model) {
      shouldIUseCustomModel = false;
    }
  }
  const [useCustomModel, setUseCustomModel] = useState(shouldIUseCustomModel);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2">
          <ListIcon className="w-4 h-4" />
          Model
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon">
                <InfoIcon className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Model Selection</DialogTitle>
                <DialogDescription>{help}</DialogDescription>
              </DialogHeader>
            </DialogContent>
          </Dialog>
        </Label>

        <div className="flex items-center gap-2">
          <Label className="flex items-center gap-2">
            <CogIcon className="w-4 h-4" />
            <Tr>Custom</Tr>
          </Label>
          <Checkbox
            checked={useCustomModel}
            onCheckedChange={() => setUseCustomModel(!useCustomModel)}
          />
        </div>
      </div>

      {useCustomModel ? (
        <Input
          value={chatStore.model}
          onBlur={(e: React.ChangeEvent<HTMLInputElement>) => {
            chatStore.model = e.target.value;
            setChatStore({ ...chatStore });
          }}
        />
      ) : (
        <Select
          value={chatStore.model}
          onValueChange={(model: string) => {
            chatStore.model = model;
            chatStore.maxTokens = models[model].maxToken;
            setChatStore({ ...chatStore });
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a model" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Models</SelectLabel>
              {Object.keys(models).map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      )}
    </div>
  );
};
