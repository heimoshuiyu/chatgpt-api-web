import { useState } from "preact/hooks";
import type { ChatStore } from "./app";
import ChatGPT, { ChunkMessage } from "./chatgpt";
import Settings from "./settings";

export default function ChatBOX(props: {
  chatStore: ChatStore;
  setChatStore: (cs: ChatStore) => void;
}) {
  const { chatStore, setChatStore } = props;
  const [inputMsg, setInputMsg] = useState("");
  const [showGenerating, setShowGenerating] = useState(false);
  const [generatingMessage, setGeneratingMessage] = useState("");

  const client = new ChatGPT(chatStore.apiKey);

  const _completeWithStreamMode = async () => {
    // call api, return reponse text
    const response = await client.completeWithSteam();
    console.log("response", response);
    const reader = response.body?.getReader();
    const allChunkMessage: string[] = [];
    await new ReadableStream({
      async start(controller) {
        while (true) {
          let responseDone = false;
          let state = await reader?.read();
          let done = state?.done;
          let value = state?.value;
          if (done) break;
          let text = new TextDecoder().decode(value);
          // console.log("text:", text);
          const lines = text
            .trim()
            .split("\n")
            .map((line) => line.trim())
            .filter((i) => {
              if (!i) return false;
              if (i === "data: [DONE]") {
                responseDone = true;
                return false;
              }
              return true;
            });
          console.log("lines", lines);
          const jsons: ChunkMessage[] = lines
            .map((line) => {
              return JSON.parse(line.trim().slice("data: ".length));
            })
            .filter((i) => i);
          // console.log("jsons", jsons);
          const chunkText = jsons
            .map((j) => j.choices[0].delta.content ?? "")
            .join("");
          // console.log("chunk text", chunkText);
          allChunkMessage.push(chunkText);
          setGeneratingMessage(allChunkMessage.join(""));
          if (responseDone) break;
        }

        // console.log("push to history", allChunkMessage);
        chatStore.history.push({
          role: "assistant",
          content: allChunkMessage.join(""),
        });
        // manually copy status from client to chatStore
        chatStore.maxTokens = client.max_tokens;
        chatStore.tokenMargin = client.tokens_margin;
        chatStore.totalTokens =
          client.total_tokens +
          39 +
          client.calculate_token_length(allChunkMessage.join(""));
        setChatStore({ ...chatStore });
        setGeneratingMessage("");
        setShowGenerating(false);
      },
    });
  };

  const _completeWithFetchMode = async () => {
    // call api, return reponse text
    const response = await client.complete();
    chatStore.history.push({ role: "assistant", content: response });
    setShowGenerating(false);
  };

  // wrap the actuall complete api
  const complete = async () => {
    // manually copy status from chatStore to client
    client.apiEndpoint = chatStore.apiEndpoint;
    client.sysMessageContent = chatStore.systemMessageContent;
    client.messages = chatStore.history.slice(chatStore.postBeginIndex);
    try {
      setShowGenerating(true);
      if (chatStore.streamMode) {
        await _completeWithStreamMode();
      } else {
        await _completeWithFetchMode();
      }
      // manually copy status from client to chatStore
      chatStore.maxTokens = client.max_tokens;
      chatStore.tokenMargin = client.tokens_margin;
      chatStore.totalTokens = client.total_tokens;
      // when total token > max token - margin token:
      // ChatGPT will "forgot" some historical message
      // so client.message.length will be less than chatStore.history.length
      chatStore.postBeginIndex =
        chatStore.history.length - client.messages.length;
      console.log("postBeginIndex", chatStore.postBeginIndex);
      setChatStore({ ...chatStore });
    } catch (error) {
      alert(error);
    }
  };

  // when user click the "send" button or ctrl+Enter in the textarea
  const send = async (msg = "") => {
    const inputMsg = msg;
    if (!inputMsg) {
      console.log("empty message");
      return;
    }
    chatStore.history.push({ role: "user", content: inputMsg.trim() });
    setChatStore({ ...chatStore });
    setInputMsg("");
    await complete();
    setChatStore({ ...chatStore });
  };

  const [showSettings, setShowSettings] = useState(false);
  return (
    <div className="grow flex flex-col p-4">
      <Settings
        chatStore={chatStore}
        setChatStore={setChatStore}
        show={showSettings}
        setShow={setShowSettings}
      />
      <p className="cursor-pointer" onClick={() => setShowSettings(true)}>
        <div>
          <button className="underline">
            {chatStore.systemMessageContent.length > 16
              ? chatStore.systemMessageContent.slice(0, 16) + ".."
              : chatStore.systemMessageContent}
          </button>{" "}
          <button className="underline">
            {chatStore.streamMode ? "STREAM" : "FETCH"}
          </button>
        </div>
        <div className="text-xs">
          <span>Total: {chatStore.totalTokens}</span>{" "}
          <span>Max: {chatStore.maxTokens}</span>{" "}
          <span>Margin: {chatStore.tokenMargin}</span>{" "}
          <span>
            Message: {chatStore.history.length - chatStore.postBeginIndex}
          </span>{" "}
          <span>Cut: {chatStore.postBeginIndex}</span>
        </div>
      </p>
      <div className="grow overflow-scroll">
        {!chatStore.apiKey && (
          <p className="opacity-60 p-6 rounded bg-white my-3 text-left">
            喵喵，请先在上方设置 (OPENAI) API KEY
          </p>
        )}
        {!chatStore.apiEndpoint && (
          <p className="opacity-60 p-6 rounded bg-white my-3 text-left">
            喵喵，请先在上方设置 API Endpoint
          </p>
        )}
        {chatStore.history.length === 0 && (
          <p className="opacity-60 p-6 rounded bg-white my-3 text-left">
            这里什么都没有哦 QwQ
          </p>
        )}
        {chatStore.history.map((chat, i) => {
          const pClassName =
            chat.role === "assistant"
              ? "p-2 rounded relative bg-white my-2 text-left"
              : "p-2 rounded relative bg-green-400 my-2 text-right";
          const iconClassName =
            chat.role === "user"
              ? "absolute bottom-0 left-0"
              : "absolute bottom-0 right-0";
          const DeleteIcon = () => (
            <button
              className={iconClassName}
              onClick={() => {
                if (
                  confirm(
                    `Are you sure to delete this message?\n${chat.content.slice(
                      0,
                      39
                    )}...`
                  )
                ) {
                  chatStore.history.splice(i, 1);
                  chatStore.postBeginIndex = Math.max(
                    chatStore.postBeginIndex - 1,
                    0
                  );
                  setChatStore({ ...chatStore });
                }
              }}
            >
              🗑️
            </button>
          );
          return (
            <p className={pClassName}>
              {chat.content
                .split("\n")
                .filter((line) => line)
                .map((line) => (
                  <p className="my-1">{line}</p>
                ))}
              <DeleteIcon />
            </p>
          );
        })}
        {showGenerating && (
          <p className="p-2 my-2 animate-pulse">
            {generatingMessage
              ? generatingMessage.split("\n").map((line) => <p>{line}</p>)
              : "生成中，保持网络稳定喵"}
            ...
          </p>
        )}
      </div>
      <div className="flex justify-between">
        <textarea
          value={inputMsg}
          onChange={(event: any) => setInputMsg(event.target.value)}
          onKeyPress={(event: any) => {
            console.log(event);
            if (event.ctrlKey && event.code === "Enter") {
              send(event.target.value);
              setInputMsg("");
              return;
            }
            setInputMsg(event.target.value);
          }}
          className="rounded grow m-1 p-1 border-2 border-gray-400 w-0"
          placeholder="Type here..."
        ></textarea>
        <button
          className="disabled:line-through disabled:bg-slate-500 rounded m-1 p-1 border-2 bg-cyan-400 hover:bg-cyan-600"
          disabled={showGenerating || !chatStore.apiKey}
          onClick={() => {
            send(inputMsg);
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}
