import React, { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tr } from "@/translate";

interface CustomPricingInputProps {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
}

export const CustomPricingInput: React.FC<CustomPricingInputProps> = ({
  id,
  label,
  value,
  onChange,
}) => {
  const [unit, setUnit] = useState<"token" | "k" | "m">("m"); // Default to per million tokens
  const [displayValue, setDisplayValue] = useState<string>("");

  // Update display value when unit or actual value changes
  useEffect(() => {
    let converted = value;
    if (unit === "k") {
      converted = value * 1000;
    } else if (unit === "m") {
      converted = value * 1000000;
    }
    // Use toFixed to handle precision, but remove trailing zeros
    const formattedValue = parseFloat(converted.toFixed(10)).toString();
    setDisplayValue(formattedValue);
  }, [value, unit]);

  const handleValueChange = (inputValue: string) => {
    setDisplayValue(inputValue);
    const numValue = parseFloat(inputValue) || 0;
    let actualValue = numValue;

    // Convert to per token price
    if (unit === "k") {
      actualValue = numValue / 1000;
    } else if (unit === "m") {
      actualValue = numValue / 1000000;
    }

    onChange(actualValue);
  };

  const handleUnitChange = (newUnit: "token" | "k" | "m") => {
    // Convert current display value to the new unit
    const currentValue = parseFloat(displayValue) || 0;
    let actualPerTokenValue = currentValue;

    // First convert current display value to per token
    if (unit === "k") {
      actualPerTokenValue = currentValue / 1000;
    } else if (unit === "m") {
      actualPerTokenValue = currentValue / 1000000;
    }

    // Then convert to new unit for display
    let newDisplayValue = actualPerTokenValue;
    if (newUnit === "k") {
      newDisplayValue = actualPerTokenValue * 1000;
    } else if (newUnit === "m") {
      newDisplayValue = actualPerTokenValue * 1000000;
    }

    setUnit(newUnit);
    const formattedValue = parseFloat(newDisplayValue.toFixed(10)).toString();
    setDisplayValue(formattedValue);
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        <Tr>{label}</Tr>
      </Label>
      <div className="flex gap-2">
        <input
          className={
            "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
          }
          id={id}
          type="number"
          step="any"
          value={displayValue}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            handleValueChange(e.target.value);
          }}
        />
        <Select value={unit} onValueChange={handleUnitChange}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="token">
              <Tr>Per token</Tr>
            </SelectItem>
            <SelectItem value="k">
              <Tr>Per k tokens</Tr>
            </SelectItem>
            <SelectItem value="m">
              <Tr>Per m tokens</Tr>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};
