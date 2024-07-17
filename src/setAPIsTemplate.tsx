import { TemplateAPI } from "./app";
import { Tr } from "./translate";

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
    <button
      className="btn btn-primary btn-sm"
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
    </button>
  );
}
