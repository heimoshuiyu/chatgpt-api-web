import { useState } from "react";
import { ChatStore } from "@/types/chatstore";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { ControlledInput } from "@/components/ui/controlled-input";
import { tr } from "@/translate";

interface TemplateAttributeDialogProps {
  chatStore: ChatStore;
  onSave: (name: string, selectedAttributes: Partial<ChatStore>) => void;
  onClose: () => void;
  open: boolean;
  langCode: "en-US" | "zh-CN";
}

export function TemplateAttributeDialog({
  chatStore,
  onSave,
  onClose,
  open,
  langCode,
}: TemplateAttributeDialogProps) {
  // Create a map of all ChatStore attributes and their selection state
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    // Initialize all attributes as selected by default
    Object.keys(chatStore).forEach((key) => {
      initial[key] = true;
    });
    return initial;
  });

  const [templateName, setTemplateName] = useState("");
  const [nameError, setNameError] = useState("");

  const handleSave = () => {
    // Validate name
    if (!templateName.trim()) {
      setNameError(tr("Template name is required", langCode));
      return;
    }
    setNameError("");

    // Create a new object with only the selected attributes
    const filteredStore = {} as Partial<ChatStore>;
    Object.entries(selectedAttributes).forEach(([key, isSelected]) => {
      if (isSelected) {
        const typedKey = key as keyof ChatStore;
        // Use type assertion to ensure type safety
        (filteredStore as any)[typedKey] = chatStore[typedKey];
      }
    });
    onSave(templateName, filteredStore);
  };

  const toggleAll = (checked: boolean) => {
    const newSelected = { ...selectedAttributes };
    Object.keys(newSelected).forEach((key) => {
      newSelected[key] = checked;
    });
    setSelectedAttributes(newSelected);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Select Template Attributes</DialogTitle>
          <DialogDescription>
            Choose which attributes to include in your template. Unselected attributes will be omitted.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="template-name">Template Name</Label>
            <ControlledInput
              id="template-name"
              value={templateName}
              onChange={(e) => {
                setTemplateName(e.target.value);
                setNameError("");
              }}
              placeholder={tr("Enter template name", langCode)}
            />
            {nameError && (
              <p className="text-sm text-red-500">{nameError}</p>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="select-all"
              checked={Object.values(selectedAttributes).every((v) => v)}
              onCheckedChange={(checked) => toggleAll(checked as boolean)}
            />
            <Label htmlFor="select-all">Select All</Label>
          </div>

          <ScrollArea className="h-[400px] rounded-md border p-4">
            <div className="grid grid-cols-2 gap-4">
              {Object.keys(chatStore).map((key) => (
                <div key={key} className="flex items-center space-x-2">
                  <Checkbox
                    id={key}
                    checked={selectedAttributes[key]}
                    onCheckedChange={(checked) =>
                      setSelectedAttributes((prev) => ({
                        ...prev,
                        [key]: checked as boolean,
                      }))
                    }
                  />
                  <Label htmlFor={key} className="text-sm">
                    {key}
                  </Label>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Template</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 