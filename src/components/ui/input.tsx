import { useState, ComponentProps, forwardRef } from "react";

import { cn } from "@/lib/utils";

const Input = forwardRef<HTMLInputElement, ComponentProps<"input">>(
  ({ className, type, value, ...props }, ref) => {
    const [innerValue, setInnerValue] = useState(value);
    return (
      <input
        value={innerValue}
        onChange={(e) => setInnerValue(e.target.value)}
        type={type}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
