import React from "react";
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useTheme, Theme } from "@/components/ThemeProvider";
import { Tr } from "@/translate";
import { Sun, Moon, Monitor } from "lucide-react";

export const ThemeSettings: React.FC = () => {
  const { theme, setTheme } = useTheme();

  const themeOptions = [
    {
      value: "light" as Theme,
      label: "Light",
      icon: Sun,
      description: "浅色主题",
    },
    {
      value: "dark" as Theme,
      label: "Dark",
      icon: Moon,
      description: "深色主题",
    },
    {
      value: "system" as Theme,
      label: "System",
      icon: Monitor,
      description: "跟随系统设置",
    },
  ];

  return (
    <AccordionItem value="theme">
      <AccordionTrigger>
        <Tr>Theme / 主题</Tr>
      </AccordionTrigger>
      <AccordionContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="theme-select">
              <Tr>Choose Theme / 选择主题</Tr>
            </Label>
            <Select
              value={theme}
              onValueChange={(value) => setTheme(value as Theme)}
            >
              <SelectTrigger id="theme-select" className="w-full">
                <SelectValue placeholder="Select theme" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>
                    <Tr>Theme Options / 主题选项</Tr>
                  </SelectLabel>
                  {themeOptions.map((option) => {
                    const IconComponent = option.icon;
                    return (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center gap-2">
                          <IconComponent className="w-4 h-4" />
                          <span>{option.label}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
};
