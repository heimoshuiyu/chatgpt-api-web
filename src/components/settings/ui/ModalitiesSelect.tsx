import React, { useState } from "react";
import { useContext } from "react";
import { AppChatStoreContext } from "@/pages/App";
import { tr, langCodeContext } from "@/translate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown } from "lucide-react";

const MODALITY_OPTIONS = [
  { value: "text", label: "Text", description: "Process text content" },
  { value: "audio", label: "Audio", description: "Process audio content" },
];

interface ModalitiesSelectProps {
  help?: string;
}

export const ModalitiesSelect: React.FC<ModalitiesSelectProps> = ({ help }) => {
  const { chatStore, setChatStore } = useContext(AppChatStoreContext);
  const { langCode } = useContext(langCodeContext);
  const [open, setOpen] = useState(false);

  const currentModalities = chatStore.modalities || [];
  const selectedOptions = MODALITY_OPTIONS.filter((option) =>
    currentModalities.includes(option.value)
  );

  const handleModalitiesEnabledToggle = (enabled: boolean) => {
    setChatStore({
      ...chatStore,
      modalities_enabled: enabled,
      modalities: enabled ? currentModalities : [],
    });
  };

  const handleSelectModality = (value: string) => {
    const newModalities = currentModalities.includes(value)
      ? currentModalities.filter((item) => item !== value)
      : [...currentModalities, value];

    setChatStore({
      ...chatStore,
      modalities: newModalities,
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Modalities</Label>
        <div className="flex items-center space-x-2">
          <Switch
            id="modalities-enabled"
            checked={chatStore.modalities_enabled || false}
            onCheckedChange={handleModalitiesEnabledToggle}
          />
          <label
            htmlFor="modalities-enabled"
            className="text-sm cursor-pointer"
          >
            Enabled
          </label>
        </div>
      </div>

      {chatStore.modalities_enabled && (
        <div className="space-y-3 ml-4">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="w-full justify-between"
              >
                {selectedOptions.length > 0
                  ? `${selectedOptions.length} modalit${selectedOptions.length === 1 ? "y" : "ies"} selected`
                  : "Select modalities..."}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0" align="start">
              <Command>
                <CommandInput placeholder="Search modalities..." />
                <CommandList>
                  <CommandEmpty>No modalities found.</CommandEmpty>
                  <CommandGroup>
                    {MODALITY_OPTIONS.map((option) => (
                      <CommandItem
                        key={option.value}
                        value={option.value}
                        onSelect={handleSelectModality}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            currentModalities.includes(option.value)
                              ? "opacity-100"
                              : "opacity-0"
                          )}
                        />
                        <div className="flex-1">
                          <div className="font-medium">{option.label}</div>
                          <div className="text-sm text-muted-foreground">
                            {option.description}
                          </div>
                        </div>
                        <Badge variant="outline" className="ml-2">
                          {option.value}
                        </Badge>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          {/* Selected items display */}
          {selectedOptions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedOptions.map((option) => (
                <Badge
                  key={option.value}
                  variant="secondary"
                  className="cursor-pointer"
                  onClick={() => handleSelectModality(option.value)}
                >
                  {option.label}
                  <span className="ml-1 text-xs opacity-70">
                    ({option.value})
                  </span>
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}

      {!chatStore.modalities_enabled && (
        <p className="text-xs text-muted-foreground ml-4">disabled</p>
      )}
    </div>
  );
};
