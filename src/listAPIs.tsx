import { ChatStore, TemplateAPI } from "./app";
import { Tr } from "./translate";

interface Props {
  chatStore: ChatStore;
  setChatStore: (cs: ChatStore) => void;
  tmps: TemplateAPI[];
  setTmps: (tmps: TemplateAPI[]) => void;
  label: string;
  apiField: string;
  keyField: string;
}
export function ListAPIs({
  tmps,
  setTmps,
  chatStore,
  setChatStore,
  label,
  apiField,
  keyField,
}: Props) {
  return (
    <div className="break-all opacity-80 p-3 rounded base-200 my-3 text-left">
      <h2>{Tr(`Saved ${label} templates`)}</h2>
      <hr className="my-2" />
      <div className="flex flex-wrap">
        {tmps.map((t, index) => (
          <div
            className={`cursor-pointer rounded ${
              // @ts-ignore
              chatStore[apiField] === t.endpoint &&
              // @ts-ignore
              chatStore[keyField] === t.key
                ? "bg-info"
                : "bg-base-300"
            } w-fit p-2 m-1 flex flex-col`}
            onClick={() => {
              // @ts-ignore
              chatStore[apiField] = t.endpoint;
              // @ts-ignore
              chatStore[keyField] = t.key;
              setChatStore({ ...chatStore });
            }}
          >
            <span className="w-full text-center">{t.name}</span>
            <span className="flex justify-between gap-x-2">
              <button
                class="link"
                onClick={() => {
                  const name = prompt(`Give **${label}** template a name`);
                  if (!name) {
                    return;
                  }
                  t.name = name;
                  setTmps(structuredClone(tmps));
                }}
              >
                Edit
              </button>
              <button
                class="link"
                onClick={() => {
                  if (
                    !confirm(
                      `Are you sure to delete this **${label}** template?`
                    )
                  ) {
                    return;
                  }
                  tmps.splice(index, 1);
                  setTmps(structuredClone(tmps));
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
