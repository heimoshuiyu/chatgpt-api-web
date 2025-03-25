import { Tr } from "@/translate";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { useContext } from "react";
import { AppChatStoreContext, AppContext } from "@/pages/App";
import { STORAGE_NAME } from "@/const";

const Item = ({ children }: { children: React.ReactNode }) => (
  <div className="mt-2">{children}</div>
);

const ImportDialog = ({
  open,
  setOpen,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
}) => {
  const { handleNewChatStoreWithOldOne } = useContext(AppContext);
  const { chatStore } = useContext(AppChatStoreContext);

  const params = new URLSearchParams(window.location.search);
  const api = params.get("api");
  const key = params.get("key");
  const sys = params.get("sys");
  const mode = params.get("mode");
  const model = params.get("model");
  const max = params.get("max");
  const temp = params.get("temp");
  const dev = params.get("dev");
  const whisper_api = params.get("whisper-api");
  const whisper_key = params.get("whisper-key");
  const tts_api = params.get("tts-api");
  const tts_key = params.get("tts-key");
  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            <Tr>Import Configuration</Tr>
          </AlertDialogTitle>
          <AlertDialogDescription className="message-content">
            <Tr>There are some configurations in the URL, import them?</Tr>
            {key && <Item>Key: {key}</Item>}
            {api && <Item>API: {api}</Item>}
            {sys && <Item>Sys: {sys}</Item>}
            {mode && <Item>Mode: {mode}</Item>}
            {model && <Item>Model: {model}</Item>}
            {max && <Item>Max: {max}</Item>}
            {temp && <Item>Temp: {temp}</Item>}
            {dev && <Item>Dev: {dev}</Item>}
            {whisper_api && <Item>Whisper API: {whisper_api}</Item>}
            {whisper_key && <Item>Whisper Key: {whisper_key}</Item>}
            {tts_api && <div className="mt-2">TTS API: {tts_api}</div>}
            {tts_key && <div className="mt-2">TTS Key: {tts_key}</div>}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setOpen(false)}>
            <Tr>Cancel</Tr>
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={async () => {
              params.delete("key");
              params.delete("api");
              params.delete("sys");
              params.delete("mode");
              params.delete("model");
              params.delete("max");
              params.delete("temp");
              params.delete("dev");
              params.delete("whisper-api");
              params.delete("whisper-key");
              params.delete("tts-api");
              params.delete("tts-key");

              const newChatStore = structuredClone(chatStore);
              if (key) newChatStore.apiKey = key;
              if (api) newChatStore.apiEndpoint = api;
              if (sys) newChatStore.systemMessageContent = sys;
              if (mode) newChatStore.streamMode = mode === "stream";
              if (model) newChatStore.model = model;
              if (max) {
                try {
                  newChatStore.maxTokens = parseInt(max);
                } catch (e) {
                  console.error(e);
                }
              }
              if (temp) {
                try {
                  newChatStore.temperature = parseFloat(temp);
                } catch (e) {
                  console.error(e);
                }
              }
              if (dev) newChatStore.develop_mode = dev === "true";
              if (whisper_api) newChatStore.whisper_api = whisper_api;
              if (whisper_key) newChatStore.whisper_key = whisper_key;
              if (tts_api) newChatStore.tts_api = tts_api;
              if (tts_key) newChatStore.tts_key = tts_key;

              await handleNewChatStoreWithOldOne(newChatStore);

              const newUrl =
                window.location.pathname +
                (params.toString() ? `?${params}` : "");
              window.history.replaceState(null, "", newUrl); // 替换URL不刷新页面

              setOpen(false);
            }}
          >
            <Tr>Import</Tr>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ImportDialog;
