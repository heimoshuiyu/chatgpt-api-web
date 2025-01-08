import { forwardRef, ComponentProps, useState } from "react";

import { cn } from "@/lib/utils";

const Textarea = forwardRef<
  HTMLTextAreaElement,
  ComponentProps<"textarea"> & { mockOnChange?: boolean }
>(({ className, value, onChange, mockOnChange = true, ...props }, ref) => {
  const [innerValue, setInnerValue] = useState(value);
  return (
    <textarea
      value={mockOnChange ? innerValue : value}
      onChange={(e) => {
        if (mockOnChange) {
          setInnerValue(e.target.value);
        } else {
          onChange?.(e);
        }
      }}
      className={cn(
        "flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
