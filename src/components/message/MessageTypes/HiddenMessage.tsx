import { Badge } from "@/components/ui/badge";
import { Tr } from "@/translate";

// 隐藏消息通用组件
interface HiddenMessageProps {
  text: string;
  maxLength?: number;
}

export const HiddenMessage = ({ text, maxLength = 28 }: HiddenMessageProps) => (
  <>
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <span>{text.trim().slice(0, maxLength)} ...</span>
    </div>
    <div className="flex mt-2 justify-center">
      <Badge variant="destructive">
        <Tr>Removed from context</Tr>
      </Badge>
    </div>
  </>
);
