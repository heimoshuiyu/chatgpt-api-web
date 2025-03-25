import { AppChatStoreContext, AppContext } from "@/pages/App";
import { TemplateChatStore } from "@/types/chatstore";
import { ChatStore } from "@/types/chatstore";
import { useContext } from "react";

const Templates = () => {
  const ctx = useContext(AppContext);
  const { templates, setTemplates } = useContext(AppContext);
  const { chatStore, setChatStore } = useContext(AppChatStoreContext);

  return (
    <>
      {templates.map((t, index) => (
        <div
          className="cursor-pointer rounded bg-green-400 w-fit p-2 m-1 flex flex-col"
          onClick={() => {
            const newChatStore: ChatStore = structuredClone(t);
            // @ts-ignore
            delete newChatStore.name;
            newChatStore.cost = 0;

            // manage undefined value because of version update
            newChatStore.toolsString = newChatStore.toolsString || "";

            setChatStore({ ...newChatStore });
          }}
        >
          <span className="w-full text-center">{t.name}</span>
          <hr className="mt-2" />
          <span className="flex justify-between">
            <button
              onClick={(event) => {
                // prevent triggert other event
                event.stopPropagation();

                const name = prompt("Give template a name");
                if (!name) {
                  return;
                }
                t.name = name;
                setTemplates(structuredClone(templates));
              }}
            >
              🖋
            </button>
            <button
              onClick={(event) => {
                // prevent triggert other event
                event.stopPropagation();

                if (!confirm("Are you sure to delete this template?")) {
                  return;
                }
                templates.splice(index, 1);
                setTemplates(structuredClone(templates));
              }}
            >
              ❌
            </button>
          </span>
        </div>
      ))}
    </>
  );
};

export default Templates;
