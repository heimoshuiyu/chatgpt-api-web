import { TemplateAPI } from "@/types/chatstore";
import { Tr } from "@/translate";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "./ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SaveIcon } from "lucide-react";

interface Props {
  temps: TemplateAPI[];
  setTemps: (temps: TemplateAPI[]) => void;
  label: string;
  endpoint: string;
  APIkey: string;
}
export function SetAPIsTemplate({
  endpoint,
  APIkey,
  temps: temps,
  setTemps: setTemps,
  label,
}: Props) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">{Tr(`Save ${label}`)}</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Save {label} as Template</DialogTitle>
          <DialogDescription>
            Once saved, you can easily access your templates from the dropdown
            menu.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center space-x-2">
          <div className="grid flex-1 gap-2">
            <Label htmlFor="templateName" className="sr-only">
              Name
            </Label>
            <Input id="templateName" placeholder="Type Something..." />
            <Label id="templateNameError" className="text-red-600"></Label>
          </div>
        </div>
        <DialogFooter className="sm:justify-start">
          <DialogClose asChild>
            <Button
              type="submit"
              size="sm"
              className="px-3"
              onClick={() => {
                const name = document.getElementById(
                  "templateName"
                ) as HTMLInputElement;
                if (!name.value) {
                  const errorLabel = document.getElementById(
                    "templateNameError"
                  ) as HTMLLabelElement;
                  if (errorLabel) {
                    errorLabel.textContent = "Template name is required.";
                  }
                  return;
                }
                const temp: TemplateAPI = {
                  name: name.value,
                  endpoint,
                  key: APIkey,
                };
                temps.push(temp);
                setTemps([...temps]);
              }}
            >
              <SaveIcon className="w-4 h-4" /> Save
              <span className="sr-only">Save</span>
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
