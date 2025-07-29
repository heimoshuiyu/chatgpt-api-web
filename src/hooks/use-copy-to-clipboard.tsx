import { useToast } from "./use-toast";
import { useContext } from "react";
import { langCodeContext, tr } from "@/translate";

export function useCopyToClipboard() {
  const { toast } = useToast();
  const { langCode } = useContext(langCodeContext);

  const copyToClipboard = async (
    text: string,
    customSuccessMessage?: string
  ) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        description:
          customSuccessMessage || tr("Message copied to clipboard!", langCode),
      });
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand("copy");
        toast({
          description:
            customSuccessMessage ||
            tr("Message copied to clipboard!", langCode),
        });
      } catch (err) {
        toast({
          description: tr("Failed to copy to clipboard", langCode),
          variant: "destructive",
        });
      }
      document.body.removeChild(textArea);
    }
  };

  return copyToClipboard;
}
