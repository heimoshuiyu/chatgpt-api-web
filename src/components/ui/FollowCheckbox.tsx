import React, { useContext } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { AppContext } from "@/pages/App";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { InfoIcon } from "lucide-react";

interface FollowCheckboxProps {
  help?: string;
}

export const FollowCheckbox: React.FC<FollowCheckboxProps> = ({ help }) => {
  const { follow, setFollow } = useContext(AppContext);

  return (
    <div className="flex items-center space-x-2">
      <div className="flex items-center">
        <Checkbox
          id="follow-checkbox"
          checked={follow}
          onCheckedChange={(checked: boolean) => {
            setFollow(checked);
          }}
        />
      </div>
      <label
        htmlFor="follow-checkbox"
        className="flex items-center gap-2 font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
      >
        Follow
        {help && (
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon">
                <InfoIcon />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Follow Help</DialogTitle>
              </DialogHeader>
              {help}
            </DialogContent>
          </Dialog>
        )}
      </label>
    </div>
  );
};
