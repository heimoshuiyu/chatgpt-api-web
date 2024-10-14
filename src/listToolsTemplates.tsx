import { ChatStore, TemplateTools } from "./app";
import { Tr } from "./translate";

interface Props {
  templateTools: TemplateTools[];
  setTemplateTools: (tmps: TemplateTools[]) => void;
  chatStore: ChatStore;
  setChatStore: (cs: ChatStore) => void;
}
export function ListToolsTempaltes({
  chatStore,
  templateTools,
  setTemplateTools,
  setChatStore,
}: Props) {
  return (
    <div className="break-all opacity-80 p-3 rounded bg-white my-3 text-left dark:text-black">
      <h2>
        <span>{Tr(`Saved tools templates`)}</span>
        <button
          className="mx-2 underline cursor-pointer"
          onClick={() => {
            chatStore.toolsString = "";
            setChatStore({ ...chatStore });
          }}
        >
          {Tr(`Clear`)}
        </button>
      </h2>
      <hr className="my-2" />
      <div className="flex flex-wrap">
        {templateTools.map((t, index) => (
          <div
            className={`cursor-pointer rounded ${
              chatStore.toolsString === t.toolsString
                ? "bg-info"
                : "bg-base-300"
            } w-fit p-2 m-1 flex flex-col`}
            onClick={() => {
              chatStore.toolsString = t.toolsString;
              setChatStore({ ...chatStore });
            }}
          >
            <span className="w-full text-center">{t.name}</span>
            <span className="flex justify-between gap-x-2">
              <button
                className="link"
                onClick={() => {
                  const name = prompt(`Give **tools** template a name`);
                  if (!name) {
                    return;
                  }
                  t.name = name;
                  setTemplateTools(structuredClone(templateTools));
                }}
              >
                Edit
              </button>
              <button
                className="link"
                onClick={() => {
                  if (
                    !confirm(`Are you sure to delete this **tools** template?`)
                  ) {
                    return;
                  }
                  templateTools.splice(index, 1);
                  setTemplateTools(structuredClone(templateTools));
                }}
              >
                Delete
              </button>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
