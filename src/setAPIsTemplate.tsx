import { TemplateAPI } from "@/types/chatstore";
import { Tr } from "@/translate";
import { Button } from "./components/ui/button";

interface Props {
  tmps: TemplateAPI[];
  setTmps: (tmps: TemplateAPI[]) => void;
  label: string;
  endpoint: string;
  APIkey: string;
}
export function SetAPIsTemplate({
  endpoint,
  APIkey,
  tmps,
  setTmps,
  label,
}: Props) {
  return (
    <Button
      variant="default"
      size="sm"
      className="mt-3"
      onClick={() => {
        const name = prompt(`Give this **${label}** template a name:`);
        if (!name) {
          alert("No template name specified");
          return;
        }
        const tmp: TemplateAPI = {
          name,
          endpoint,
          key: APIkey,
        };
        tmps.push(tmp);
        setTmps([...tmps]);
      }}
    >
      {Tr(`Save ${label}`)}
    </Button>
  );
}
