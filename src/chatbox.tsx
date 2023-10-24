import structuredClone from "@ungap/structured-clone";
import { createRef } from "preact";
import { StateUpdater, useEffect, useState } from "preact/hooks";
import {
  ChatStore,
  STORAGE_NAME_TEMPLATE,
  STORAGE_NAME_TEMPLATE_API,
  TemplateAPI,
  addTotalCost,
} from "./app";
import ChatGPT, {
  calculate_token_length,
  ChunkMessage,
  FetchResponse,
} from "./chatgpt";
import Message from "./message";
import models from "./models";
import Settings from "./settings";
import getDefaultParams from "./getDefaultParam";

export interface TemplateChatStore extends ChatStore {
  name: string;
}

export default function ChatBOX(props: {
  chatStore: ChatStore;
  setChatStore: (cs: ChatStore) => void;
  selectedChatIndex: number;
  setSelectedChatIndex: StateUpdater<number>;
}) {
  const { chatStore, setChatStore } = props;
  // prevent error
  if (chatStore === undefined) return <div></div>;
  const [inputMsg, setInputMsg] = useState("");
  const [showGenerating, setShowGenerating] = useState(false);
  const [generatingMessage, setGeneratingMessage] = useState("");
  const [showRetry, setShowRetry] = useState(false);
  const [isRecording, setIsRecording] = useState("Mic");
  const mediaRef = createRef();

  const messagesEndRef = createRef();
  useEffect(() => {
    messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
  }, [showRetry, showGenerating, generatingMessage]);

  const client = new ChatGPT(chatStore.apiKey);

  const update_total_tokens = () => {
    // manually estimate token
    client.total_tokens = calculate_token_length(
      chatStore.systemMessageContent
    );
    for (const msg of chatStore.history
      .filter(({ hide }) => !hide)
      .slice(chatStore.postBeginIndex)) {
      client.total_tokens += msg.token;
    }
    chatStore.totalTokens = client.total_tokens;
  };

  const _completeWithStreamMode = async (response: Response) => {
    let responseTokenCount = 0;
    chatStore.streamMode = true;
    const allChunkMessage: string[] = [];
    setShowGenerating(true);
    for await (const i of client.processStreamResponse(response)) {
      chatStore.responseModelName = i.model;
      responseTokenCount += 1;
      allChunkMessage.push(i.choices[0].delta.content ?? "");
      setGeneratingMessage(allChunkMessage.join(""));
    }
    setShowGenerating(false);
    const content = allChunkMessage.join("");

    // estimate cost
    let cost = 0;
    if (chatStore.responseModelName) {
      cost +=
        responseTokenCount *
        (models[chatStore.responseModelName]?.price?.completion ?? 0);
      let sum = 0;
      for (const msg of chatStore.history
        .filter(({ hide }) => !hide)
        .slice(chatStore.postBeginIndex)) {
        sum += msg.token;
      }
      cost += sum * (models[chatStore.responseModelName]?.price?.prompt ?? 0);
    }

    console.log("cost", cost);
    chatStore.cost += cost;
    addTotalCost(cost);

    chatStore.history.push({
      role: "assistant",
      content,
      hide: false,
      token: responseTokenCount,
      example: false,
    });
    // manually copy status from client to chatStore
    chatStore.maxTokens = client.max_tokens;
    chatStore.tokenMargin = client.tokens_margin;
    update_total_tokens();
    setChatStore({ ...chatStore });
    setGeneratingMessage("");
    setShowGenerating(false);
  };

  const _completeWithFetchMode = async (response: Response) => {
    chatStore.streamMode = false;
    const data = (await response.json()) as FetchResponse;
    chatStore.responseModelName = data.model ?? "";
    if (data.model) {
      let cost = 0;
      cost +=
        (data.usage.prompt_tokens ?? 0) *
        (models[data.model]?.price?.prompt ?? 0);
      cost +=
        (data.usage.completion_tokens ?? 0) *
        (models[data.model]?.price?.completion ?? 0);
      chatStore.cost += cost;
      addTotalCost(cost);
    }
    const content = client.processFetchResponse(data);

    // estimate user's input message token
    let aboveToken = 0;
    for (const msg of chatStore.history
      .filter(({ hide }) => !hide)
      .slice(chatStore.postBeginIndex, -1)) {
      aboveToken += msg.token;
    }
    if (data.usage.prompt_tokens) {
      const userMessageToken = data.usage.prompt_tokens - aboveToken;
      console.log("set user message token");
      if (chatStore.history.filter((msg) => !msg.hide).length > 0) {
        chatStore.history.filter((msg) => !msg.hide).slice(-1)[0].token =
          userMessageToken;
      }
    }

    chatStore.history.push({
      role: "assistant",
      content,
      hide: false,
      token: data.usage.completion_tokens ?? calculate_token_length(content),
      example: false,
    });
    setShowGenerating(false);
  };

  // wrap the actuall complete api
  const complete = async () => {
    // manually copy status from chatStore to client
    client.apiEndpoint = chatStore.apiEndpoint;
    client.sysMessageContent = chatStore.systemMessageContent;
    client.tokens_margin = chatStore.tokenMargin;
    client.temperature = chatStore.temperature;
    client.top_p = chatStore.top_p;
    client.frequency_penalty = chatStore.frequency_penalty;
    client.presence_penalty = chatStore.presence_penalty;
    client.messages = chatStore.history
      // only copy non hidden message
      .filter(({ hide }) => !hide)
      .slice(chatStore.postBeginIndex)
      // only copy content and role attribute to client for posting
      .map(({ content, role, example }) => {
        if (example) {
          return {
            content,
            role: "system",
            name: role === "assistant" ? "example_assistant" : "example_user",
          };
        }
        return {
          content,
          role,
        };
      });
    client.model = chatStore.model;
    client.max_tokens = chatStore.maxTokens;

    try {
      setShowGenerating(true);
      const response = await client._fetch(chatStore.streamMode);
      const contentType = response.headers.get("content-type");
      if (contentType?.startsWith("text/event-stream")) {
        await _completeWithStreamMode(response);
      } else if (contentType?.startsWith("application/json")) {
        await _completeWithFetchMode(response);
      } else {
        throw `unknown response content type ${contentType}`;
      }
      // manually copy status from client to chatStore
      chatStore.maxTokens = client.max_tokens;
      chatStore.tokenMargin = client.tokens_margin;
      chatStore.totalTokens = client.total_tokens;

      console.log("postBeginIndex", chatStore.postBeginIndex);
      setShowRetry(false);
      setChatStore({ ...chatStore });
    } catch (error) {
      setShowRetry(true);
      alert(error);
    } finally {
      setShowGenerating(false);
      props.setSelectedChatIndex(props.selectedChatIndex);
    }
  };

  // when user click the "send" button or ctrl+Enter in the textarea
  const send = async (msg = "") => {
    const inputMsg = msg.trim();
    if (!inputMsg) {
      console.log("empty message");
      return;
    }
    chatStore.responseModelName = "";
    chatStore.history.push({
      role: "user",
      content: inputMsg.trim(),
      hide: false,
      token: calculate_token_length(inputMsg.trim()),
      example: false,
    });
    // manually calculate token length
    chatStore.totalTokens += client.calculate_token_length(inputMsg.trim());
    client.total_tokens += client.calculate_token_length(inputMsg.trim());
    setChatStore({ ...chatStore });
    setInputMsg("");
    await complete();
  };

  const [showSettings, setShowSettings] = useState(false);

  const [templates, _setTemplates] = useState(
    JSON.parse(
      localStorage.getItem(STORAGE_NAME_TEMPLATE) || "[]"
    ) as TemplateChatStore[]
  );
  const [templateAPIs, _setTemplateAPIs] = useState(
    JSON.parse(
      localStorage.getItem(STORAGE_NAME_TEMPLATE_API) || "[]"
    ) as TemplateAPI[]
  );
  const setTemplates = (templates: TemplateChatStore[]) => {
    localStorage.setItem(STORAGE_NAME_TEMPLATE, JSON.stringify(templates));
    _setTemplates(templates);
  };
  const setTemplateAPIs = (templateAPIs: TemplateAPI[]) => {
    localStorage.setItem(
      STORAGE_NAME_TEMPLATE_API,
      JSON.stringify(templateAPIs)
    );
    _setTemplateAPIs(templateAPIs);
  };

  return (
    <div className="grow flex flex-col p-2 dark:text-black">
      {showSettings && (
        <Settings
          chatStore={chatStore}
          setChatStore={setChatStore}
          setShow={setShowSettings}
          selectedChatStoreIndex={props.selectedChatIndex}
          templates={templates}
          setTemplates={setTemplates}
          templateAPIs={templateAPIs}
          setTemplateAPIs={setTemplateAPIs}
        />
      )}
      <p
        className="cursor-pointer rounded bg-cyan-300 dark:text-white p-1 dark:bg-cyan-800"
        onClick={() => setShowSettings(true)}
      >
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
          <span className="underline">{chatStore.model}</span>{" "}
          <span>
            Tokens:{" "}
            <span className="underline">
              {chatStore.totalTokens}/{chatStore.maxTokens}
            </span>
          </span>{" "}
          <span>
            Cut:{" "}
            <span className="underline">
              {chatStore.postBeginIndex}/
              {chatStore.history.filter(({ hide }) => !hide).length}
            </span>{" "}
          </span>{" "}
          <span>
            Cost:{" "}
            <span className="underline">${chatStore.cost.toFixed(4)}</span>
          </span>
        </div>
      </p>
      <div className="grow overflow-scroll">
        {!chatStore.apiKey && (
          <p className="opacity-60 p-6 rounded bg-white my-3 text-left dark:text-black">
            请先在上方设置 (OPENAI) API KEY
          </p>
        )}
        {!chatStore.apiEndpoint && (
          <p className="opacity-60 p-6 rounded bg-white my-3 text-left dark:text-black">
            请先在上方设置 API Endpoint
          </p>
        )}
        {templateAPIs.length > 0 &&
          (chatStore.history.filter((msg) => !msg.example).length == 0 ||
            !chatStore.apiEndpoint ||
            !chatStore.apiKey) && (
            <p className="break-all opacity-80 p-3 rounded bg-white my-3 text-left dark:text-black">
              <h2>已保存的 API 模板</h2>
              <hr className="my-2" />
              <div className="flex flex-wrap">
                {templateAPIs.map((t, index) => (
                  <div
                    className={`cursor-pointer rounded ${
                      chatStore.apiEndpoint === t.endpoint &&
                      chatStore.apiKey === t.key
                        ? "bg-red-600"
                        : "bg-red-400"
                    } w-fit p-2 m-1 flex flex-col`}
                    onClick={() => {
                      chatStore.apiEndpoint = t.endpoint;
                      chatStore.apiKey = t.key;
                      setChatStore({ ...chatStore });
                    }}
                  >
                    <span className="w-full text-center">{t.name}</span>
                    <hr className="mt-2" />
                    <span className="flex justify-between">
                      <button
                        onClick={() => {
                          const name = prompt("Give **API** template a name");
                          if (!name) {
                            return;
                          }
                          t.name = name;
                          setTemplateAPIs(structuredClone(templateAPIs));
                        }}
                      >
                        🖋
                      </button>
                      <button
                        onClick={() => {
                          if (
                            !confirm(
                              "Are you sure to delete this **API** template?"
                            )
                          ) {
                            return;
                          }
                          templateAPIs.splice(index, 1);
                          setTemplateAPIs(structuredClone(templateAPIs));
                        }}
                      >
                        ❌
                      </button>
                    </span>
                  </div>
                ))}
              </div>
            </p>
          )}
        {templates.length > 0 &&
          chatStore.history.filter((msg) => !msg.example).length == 0 && (
            <p className="break-all opacity-80 p-3 rounded bg-white my-3 text-left dark:text-black">
              <h2>Templates</h2>
              <hr className="my-2" />
              <div className="flex flex-wrap">
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
                          chatStore.apiEndpoint
                        );
                      }
                      if (!newChatStore.apiKey) {
                        newChatStore.apiKey = getDefaultParams(
                          "key",
                          chatStore.apiKey
                        );
                      }
                      newChatStore.cost = 0;
                      setChatStore({ ...newChatStore });
                    }}
                  >
                    <span className="w-full text-center">{t.name}</span>
                    <hr className="mt-2" />
                    <span className="flex justify-between">
                      <button
                        onClick={() => {
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
                        onClick={() => {
                          if (
                            !confirm("Are you sure to delete this template?")
                          ) {
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
              </div>
            </p>
          )}
        {chatStore.history.length === 0 && (
          <p className="break-all opacity-60 p-6 rounded bg-white my-3 text-left dark:text-black">
            暂无历史对话记录
            <br />
            ⚙Model: {chatStore.model}
            <br />
            ⬆点击上方更改此对话的参数（请勿泄漏）
            <br />
            ↖点击左上角 NEW 新建对话
            <br />
            请注意，使用 ChatGPT API
            的生成文本质量和速度会受到会话上下文的影响，同时历史上下文过长会被裁切。API
            会根据发送的上下文总量进行计费，因此建议您为不相关的问题或者不需要上文的问题创建新的对话，以避免不必要的计费。
            <br />
            ⚠所有历史对话与参数储存在浏览器本地
            <br />
            ⚠详细文档与源代码:{" "}
            <a
              className="underline"
              href="https://github.com/heimoshuiyu/chatgpt-api-web"
              target="_blank"
            >
              github.com/heimoshuiyu/chatgpt-api-web
            </a>
          </p>
        )}
        {chatStore.history.map((_, messageIndex) => (
          <Message
            chatStore={chatStore}
            setChatStore={setChatStore}
            messageIndex={messageIndex}
            update_total_tokens={update_total_tokens}
          />
        ))}
        {showGenerating && (
          <p className="p-2 my-2 animate-pulse dark:text-white message-content">
            {generatingMessage || "生成中，最长可能需要一分钟，请保持网络稳定"}
            ...
          </p>
        )}
        <p className="text-center">
          {chatStore.history.length > 0 && (
            <button
              className="disabled:line-through disabled:bg-slate-500 rounded m-2 p-2 border-2 bg-teal-500 hover:bg-teal-600"
              disabled={showGenerating || !chatStore.apiKey}
              onClick={async () => {
                const messageIndex = chatStore.history.length - 1;
                if (chatStore.history[messageIndex].role === "assistant") {
                  chatStore.history[messageIndex].hide = true;
                }

                //chatStore.totalTokens =
                update_total_tokens();
                setChatStore({ ...chatStore });

                await complete();
              }}
            >
              Re-Generate
            </button>
          )}
          {chatStore.develop_mode && chatStore.history.length > 0 && (
            <button
              className="disabled:line-through disabled:bg-slate-500 rounded m-2 p-2 border-2 bg-yellow-500 hover:bg-yellow-600"
              disabled={showGenerating || !chatStore.apiKey}
              onClick={async () => {
                await complete();
              }}
            >
              Completion
            </button>
          )}
        </p>
        <p className="p-2 my-2 text-center opacity-50 dark:text-white">
          {chatStore.responseModelName && (
            <>Generated by {chatStore.responseModelName}</>
          )}
          {chatStore.postBeginIndex !== 0 && (
            <>
              <br />
              提示：会话过长，已裁切前 {chatStore.postBeginIndex} 条消息
            </>
          )}
        </p>
        {chatStore.chatgpt_api_web_version < "v1.3.0" && (
          <p className="p-2 my-2 text-center dark:text-white">
            <br />
            提示：当前会话版本 {chatStore.chatgpt_api_web_version}。
            <br />
            v1.3.0
            引入与旧版不兼容的消息裁切算法。继续使用旧版可能会导致消息裁切过多或过少（表现为失去上下文或输出不完整）。
            <br />
            请在左上角创建新会话：）
          </p>
        )}
        {chatStore.chatgpt_api_web_version < "v1.4.0" && (
          <p className="p-2 my-2 text-center dark:text-white">
            <br />
            提示：当前会话版本 {chatStore.chatgpt_api_web_version} {"< v1.4.0"}
            。
            <br />
            v1.4.0 增加了更多参数，继续使用旧版可能因参数确实导致未定义的行为
            <br />
            请在左上角创建新会话：）
          </p>
        )}
        {chatStore.chatgpt_api_web_version < "v1.6.0" && (
          <p className="p-2 my-2 text-center dark:text-white">
            <br />
            提示：当前会话版本 {chatStore.chatgpt_api_web_version} {"< v1.6.0"}
            。
            <br />
            v1.6.0 开始保存会话模板时会将 apiKey 和 apiEndpoint
            设置为空，继续使用旧版可能在保存读取模板时出现问题
            <br />
            请在左上角创建新会话：）
          </p>
        )}
        {showRetry && (
          <p className="text-right p-2 my-2 dark:text-white">
            <button
              className="p-1 rounded bg-rose-500"
              onClick={async () => {
                setShowRetry(false);
                await complete();
              }}
            >
              Retry
            </button>
          </p>
        )}
        <div ref={messagesEndRef}></div>
      </div>
      <div className="flex justify-between">
        <textarea
          rows={Math.min(10, (inputMsg.match(/\n/g) || []).length + 2)}
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
        {chatStore.whisper_api &&
          (chatStore.whisper_key || chatStore.apiKey) && (
            <button
              className={`disabled:line-through disabled:bg-slate-500 rounded m-1 p-1 border-2 ${
                isRecording === "Recording"
                  ? "bg-red-400 hover:bg-red-600"
                  : "bg-cyan-400 hover:bg-cyan-600"
              } ${isRecording !== "Mic" ? "animate-pulse" : ""}`}
              disabled={isRecording === "Transcribing"}
              ref={mediaRef}
              onClick={async () => {
                if (isRecording === "Recording") {
                  // @ts-ignore
                  window.mediaRecorder.stop();
                  setIsRecording("Transcribing");
                  return;
                }

                // build prompt
                const prompt = [chatStore.systemMessageContent]
                  .concat(
                    chatStore.history
                      .filter(({ hide }) => !hide)
                      .slice(chatStore.postBeginIndex)
                      .map(({ content }) => content)
                  )
                  .concat([inputMsg])
                  .join(" ");
                console.log({ prompt });

                setIsRecording("Recording");
                console.log("start recording");

                try {
                  const mediaRecorder = new MediaRecorder(
                    await navigator.mediaDevices.getUserMedia({
                      audio: true,
                    }),
                    { audioBitsPerSecond: 64 * 1000 }
                  );

                  // mount mediaRecorder to ref
                  // @ts-ignore
                  window.mediaRecorder = mediaRecorder;

                  mediaRecorder.start();
                  const audioChunks: Blob[] = [];
                  mediaRecorder.addEventListener("dataavailable", (event) => {
                    audioChunks.push(event.data);
                  });
                  mediaRecorder.addEventListener("stop", async () => {
                    setIsRecording("Transcribing");
                    const audioBlob = new Blob(audioChunks);
                    const audioUrl = URL.createObjectURL(audioBlob);
                    console.log({ audioUrl });
                    const audio = new Audio(audioUrl);
                    // audio.play();
                    const reader = new FileReader();
                    reader.readAsDataURL(audioBlob);

                    // file-like object with mimetype
                    const blob = new Blob([audioBlob], {
                      type: "application/octet-stream",
                    });

                    reader.onloadend = async () => {
                      try {
                        const base64data = reader.result;

                        // post to openai whisper api
                        const formData = new FormData();
                        // append file
                        formData.append("file", blob, "audio.ogg");
                        formData.append("model", "whisper-1");
                        formData.append("response_format", "text");
                        formData.append("prompt", prompt);

                        const response = await fetch(chatStore.whisper_api, {
                          method: "POST",
                          headers: {
                            Authorization: `Bearer ${
                              chatStore.whisper_api || chatStore.apiKey
                            }`,
                          },
                          body: formData,
                        });

                        const text = await response.text();

                        setInputMsg(inputMsg ? inputMsg + " " + text : text);
                      } catch (error) {
                        alert(error);
                        console.log(error);
                      } finally {
                        setIsRecording("Mic");
                      }
                    };
                  });
                } catch (error) {
                  alert(error);
                  console.log(error);
                  setIsRecording("Mic");
                }
              }}
            >
              {isRecording}
            </button>
          )}
        {chatStore.develop_mode && (
          <button
            className="disabled:line-through disabled:bg-slate-500 rounded m-1 p-1 border-2 bg-cyan-400 hover:bg-cyan-600"
            disabled={showGenerating || !chatStore.apiKey}
            onClick={() => {
              chatStore.history.push({
                role: "assistant",
                content: inputMsg,
                token: calculate_token_length(inputMsg),
                hide: false,
                example: false,
              });
              update_total_tokens();
              setInputMsg("");
              setChatStore({ ...chatStore });
            }}
          >
            Assistant
          </button>
        )}
        {chatStore.develop_mode && (
          <button
            className="disabled:line-through disabled:bg-slate-500 rounded m-1 p-1 border-2 bg-cyan-400 hover:bg-cyan-600"
            disabled={showGenerating || !chatStore.apiKey}
            onClick={() => {
              chatStore.history.push({
                role: "user",
                content: inputMsg,
                token: calculate_token_length(inputMsg),
                hide: false,
                example: false,
              });
              update_total_tokens();
              setInputMsg("");
              setChatStore({ ...chatStore });
            }}
          >
            User
          </button>
        )}
      </div>
    </div>
  );
}
