import * as React from "react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface ChatInputProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const ChatInput = React.forwardRef<HTMLTextAreaElement, ChatInputProps>(
  ({ className, onChange, ...props }, ref) => {
    const internalRef = React.useRef<HTMLTextAreaElement>(null);

    // Combine the forwarded ref with the internal ref
    React.useImperativeHandle(
      ref,
      () => internalRef.current as HTMLTextAreaElement
    );

    // Function to adjust the height of the textarea
    const adjustHeight = () => {
      if (internalRef.current) {
        // Reset the height to auto to calculate the new height
        internalRef.current.style.height = "auto";
        // Set the height to the scrollHeight (content height)
        internalRef.current.style.height = `${internalRef.current.scrollHeight}px`;
      }
    };

    // Adjust height whenever the content changes
    React.useEffect(() => {
      adjustHeight();
    }, [props.value]); // Run whenever the value changes

    // Handle input changes
    const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      adjustHeight();
      if (onChange) {
        onChange(e); // Call the passed onChange handler
      }
    };

    return (
      <Textarea
        mockOnChange={false}
        autoComplete="off"
        ref={internalRef}
        name="message"
        className={cn(
          "max-h-48 px-4 py-3 bg-background text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 w-full rounded-md flex items-center resize-none",
          className
        )}
        onChange={handleInput}
        {...props}
      />
    );
  }
);

ChatInput.displayName = "ChatInput";

export { ChatInput };
