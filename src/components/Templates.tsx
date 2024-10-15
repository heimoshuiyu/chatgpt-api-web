import { TemplateChatStore } from "@/types/chatstore";
import { ChatStore } from "@/types/chatstore";
import { getDefaultParams } from "@/utils/getDefaultParam";

const Templates = (props: {
  templates: TemplateChatStore[];
  chatStore: ChatStore;
  setChatStore: (cs: ChatStore) => void;
  setTemplates: (templates: TemplateChatStore[]) => void;
}) => {
  const { templates, chatStore, setChatStore, setTemplates } = props;
  return (
    <>
      {templates.map((t, index) => (
        <div
          className="cursor-pointer rounded bg-green-400 w-fit p-2 m-1 flex flex-col"
          onClick={() => {
            const newChatStore: ChatStore = structuredClone(t);
            // @ts-ignore
            delete newChatStore.name;
            if (!newChatStore.apiEndpoint) {
              newChatStore.apiEndpoint = getDefaultParams(
                "api",
                chatStore.apiEndpoint,
              );
            }
            if (!newChatStore.apiKey) {
              newChatStore.apiKey = getDefaultParams("key", chatStore.apiKey);
            }
            if (!newChatStore.whisper_api) {
              newChatStore.whisper_api = getDefaultParams(
                "whisper-api",
                chatStore.whisper_api,
              );
            }
            if (!newChatStore.whisper_key) {
              newChatStore.whisper_key = getDefaultParams(
                "whisper-key",
                chatStore.whisper_key,
              );
            }
            if (!newChatStore.tts_api) {
              newChatStore.tts_api = getDefaultParams(
                "tts-api",
                chatStore.tts_api,
              );
            }
            if (!newChatStore.tts_key) {
              newChatStore.tts_key = getDefaultParams(
                "tts-key",
                chatStore.tts_key,
              );
            }
            if (!newChatStore.image_gen_api) {
              newChatStore.image_gen_api = getDefaultParams(
                "image-gen-api",
                chatStore.image_gen_api,
              );
            }
            if (!newChatStore.image_gen_key) {
              newChatStore.image_gen_key = getDefaultParams(
                "image-gen-key",
                chatStore.image_gen_key,
              );
            }
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
