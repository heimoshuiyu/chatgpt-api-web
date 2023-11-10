import { Tr, langCodeContext, LANG_OPTIONS } from "./translate";
import structuredClone from "@ungap/structured-clone";
import { createRef } from "preact";
import { StateUpdater, useEffect, useState } from "preact/hooks";
import {
  ChatStore,
  ChatStoreMessage,
  STORAGE_NAME_TEMPLATE,
  STORAGE_NAME_TEMPLATE_API,
  TemplateAPI,
  addTotalCost,
} from "./app";
import ChatGPT, {
  calculate_token_length,
  ChunkMessage,
  FetchResponse,
  Message as MessageType,
  MessageDetail,
  ToolCall,
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
  const [images, setImages] = useState<MessageDetail[]>([]);
  const [enableHighResolution, setEnableHighResolution] = useState(true);
  const [showAddImage, setShowAddImage] = useState(false);
  const [showGenerating, setShowGenerating] = useState(false);
  const [generatingMessage, setGeneratingMessage] = useState("");
  const [showRetry, setShowRetry] = useState(false);
  const [isRecording, setIsRecording] = useState("Mic");
  const [showAddToolMsg, setShowAddToolMsg] = useState(false);
  const [newToolCallID, setNewToolCallID] = useState("");
  const [newToolContent, setNewToolContent] = useState("");
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
    const allChunkTool: ToolCall[] = [];
    setShowGenerating(true);
    for await (const i of client.processStreamResponse(response)) {
      chatStore.responseModelName = i.model;
      responseTokenCount += 1;
      allChunkMessage.push(i.choices[0].delta.content ?? "");
      const tool_calls = i.choices[0].delta.tool_calls;
      if (tool_calls) {
        for (const tool_call of tool_calls) {
          // init
          if (tool_call.id) {
            allChunkTool.push({
              id: tool_call.id,
              type: tool_call.type,
              index: tool_call.index,
              function: {
                name: tool_call.function.name,
                arguments: "",
              },
            });
            continue;
          }

          // update tool call arguments
          const tool = allChunkTool.find(
            (tool) => tool.index === tool_call.index
          );

          if (!tool) {
            console.log("tool (by index) not found", tool_call.index);
            continue;
          }

          tool.function.arguments += tool_call.function.arguments;
        }
      }
      setGeneratingMessage(
        allChunkMessage.join("") +
          allChunkTool.map((tool) => {
            return `Tool Call ID: ${tool.id}\nType: ${tool.type}\nFunction: ${tool.function.name}\nArguments: ${tool.function.arguments}`;
          })
      );
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

    const newMsg: ChatStoreMessage = {
      role: "assistant",
      content,
      hide: false,
      token: responseTokenCount,
      example: false,
    };
    if (allChunkTool.length > 0) newMsg.tool_calls = allChunkTool;

    chatStore.history.push(newMsg);
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
    const msg = client.processFetchResponse(data);

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
      content: msg.content,
      tool_calls: msg.tool_calls,
      hide: false,
      token:
        data.usage.completion_tokens ?? calculate_token_length(msg.content),
      example: false,
    });
    setShowGenerating(false);
  };

  // wrap the actuall complete api
  const complete = async () => {
    // manually copy status from chatStore to client
    client.apiEndpoint = chatStore.apiEndpoint;
    client.sysMessageContent = chatStore.systemMessageContent;
    client.toolsString = chatStore.toolsString;
    client.tokens_margin = chatStore.tokenMargin;
    client.temperature = chatStore.temperature;
    client.enable_temperature = chatStore.temperature_enabled;
    client.top_p = chatStore.top_p;
    client.enable_top_p = chatStore.top_p_enabled;
    client.frequency_penalty = chatStore.frequency_penalty;
    client.presence_penalty = chatStore.presence_penalty;
    client.messages = chatStore.history
      // only copy non hidden message
      .filter(({ hide }) => !hide)
      .slice(chatStore.postBeginIndex)
      // only copy content and role attribute to client for posting
      .map(({ content, role, example, tool_call_id, tool_calls }) => {
        const ret: MessageType = {
          content,
          role,
          tool_calls,
        };

        if (example) {
          ret.name =
            ret.role === "assistant" ? "example_assistant" : "example_user";
          ret.role = "system";
        }

        if (tool_call_id) ret.tool_call_id = tool_call_id;

        return ret;
      });
    client.model = chatStore.model;
    client.max_tokens = chatStore.maxTokens;
    client.max_gen_tokens = chatStore.maxGenTokens;
    client.enable_max_gen_tokens = chatStore.maxGenTokens_enabled;

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
  const send = async (msg = "", call_complete = true) => {
    const inputMsg = msg.trim();
    if (!inputMsg && images.length === 0) {
      console.log("empty message");
      return;
    }
    if (call_complete) chatStore.responseModelName = "";

    let content: string | MessageDetail[] = inputMsg;
    if (images.length > 0) {
      content = images;
    }
    if (images.length > 0 && inputMsg.trim()) {
      content = [{ type: "text", text: inputMsg }, ...images];
    }
    chatStore.history.push({
      role: "user",
      content,
      hide: false,
      token: calculate_token_length(inputMsg.trim()),
      example: false,
    });

    // manually calculate token length
    chatStore.totalTokens +=
      calculate_token_length(inputMsg.trim()) + calculate_token_length(images);
    client.total_tokens = chatStore.totalTokens;

    setChatStore({ ...chatStore });
    setInputMsg("");
    setImages([]);
    if (call_complete) {
      await complete();
    }
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
      <div
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
            {chatStore.streamMode ? Tr("STREAM") : Tr("FETCH")}
          </button>{" "}
          {chatStore.toolsString.trim() && (
            <button className="underline">TOOL</button>
          )}
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
            {Tr("Cut")}:{" "}
            <span className="underline">
              {chatStore.postBeginIndex}/
              {chatStore.history.filter(({ hide }) => !hide).length}
            </span>{" "}
          </span>{" "}
          <span>
            {Tr("Cost")}:{" "}
            <span className="underline">${chatStore.cost.toFixed(4)}</span>
          </span>
        </div>
      </div>
      <div className="grow overflow-scroll">
        {!chatStore.apiKey && (
          <p className="opacity-60 p-6 rounded bg-white my-3 text-left dark:text-black">
            {Tr("Please click above to set")} (OpenAI) API KEY
          </p>
        )}
        {!chatStore.apiEndpoint && (
          <p className="opacity-60 p-6 rounded bg-white my-3 text-left dark:text-black">
            {Tr("Please click above to set")} API Endpoint
          </p>
        )}
        {templateAPIs.length > 0 &&
          (chatStore.develop_mode ||
            chatStore.history.filter((msg) => !msg.example).length == 0 ||
            !chatStore.apiEndpoint ||
            !chatStore.apiKey) && (
            <div className="break-all opacity-80 p-3 rounded bg-white my-3 text-left dark:text-black">
              <h2>{Tr("Saved API templates")}</h2>
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
            </div>
          )}
        {chatStore.history.filter((msg) => !msg.example).length == 0 && (
          <div className="break-all opacity-80 p-3 rounded bg-white my-3 text-left dark:text-black">
            <h2>
              <span>{Tr("Saved prompt templates")}</span>
              <button
                className="mx-2 underline cursor-pointer"
                onClick={() => {
                  chatStore.systemMessageContent = "";
                  chatStore.toolsString = "";
                  chatStore.history = [];
                  setChatStore({ ...chatStore });
                }}
              >
                {Tr("Reset Current")}
              </button>
            </h2>
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
            </div>
          </div>
        )}
        {chatStore.history.length === 0 && (
          <p className="break-all opacity-60 p-6 rounded bg-white my-3 text-left dark:text-black">
            {Tr("No chat history here")}
            <br />⚙{Tr("Model")}: {chatStore.model}
            <br />⬆{Tr("Click above to change the settings of this chat")}
            <br />↖{Tr("Click the conor to create a new chat")}
            <br />⚠
            {Tr(
              "All chat history and settings are stored in the local browser"
            )}
            <br />⚠{Tr("Documents and source code are avaliable here")}:{" "}
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
            {generatingMessage || Tr("Generating...")}
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
              {Tr("Re-Generate")}
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
              {Tr("Completion")}
            </button>
          )}
        </p>
        <p className="p-2 my-2 text-center opacity-50 dark:text-white">
          {chatStore.responseModelName && (
            <>
              {Tr("Generated by")} {chatStore.responseModelName}
            </>
          )}
          {chatStore.postBeginIndex !== 0 && (
            <>
              <br />
              {Tr("Info: chat history is too long, forget messages")}:{" "}
              {chatStore.postBeginIndex}
            </>
          )}
        </p>
        {chatStore.chatgpt_api_web_version < "v1.3.0" && (
          <p className="p-2 my-2 text-center dark:text-white">
            <br />
            {Tr("Warning: current chatStore version")}:{" "}
            {chatStore.chatgpt_api_web_version} {"< v1.3.0"}
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
            {Tr("Warning: current chatStore version")}:{" "}
            {chatStore.chatgpt_api_web_version} {"< v1.4.0"}
            <br />
            v1.4.0 增加了更多参数，继续使用旧版可能因参数确实导致未定义的行为
            <br />
            请在左上角创建新会话：）
          </p>
        )}
        {chatStore.chatgpt_api_web_version < "v1.6.0" && (
          <p className="p-2 my-2 text-center dark:text-white">
            <br />
            提示：当前会话版本 {chatStore.chatgpt_api_web_version}
            {Tr("Warning: current chatStore version")}:{" "}
            {chatStore.chatgpt_api_web_version} {"< v1.6.0"}
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
              {Tr("Retry")}
            </button>
          </p>
        )}
        <div ref={messagesEndRef}></div>
      </div>
      {images.length > 0 && (
        <div className="flex flex-wrap">
          {images.map((image, index) => (
            <div className="flex flex-col">
              {image.type === "image_url" && (
                <img
                  className="rounded m-1 p-1 border-2 border-gray-400 max-h-32 max-w-xs"
                  src={image.image_url?.url}
                />
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-between">
        {chatStore.model.match("vision") && (
          <button
            className="disabled:line-through disabled:bg-slate-500 rounded m-1 p-1 border-2 bg-cyan-400 hover:bg-cyan-600"
            disabled={showGenerating || !chatStore.apiKey}
            onClick={() => {
              setShowAddImage(!showAddImage);
            }}
          >
            Img
          </button>
        )}
        {showAddImage && (
          <div
            className="absolute z-10 bg-black bg-opacity-50 w-full h-full flex justify-center items-center left-0 top-0 overflow-scroll"
            onClick={() => {
              setShowAddImage(false);
            }}
          >
            <div
              className="bg-white rounded p-2 z-20"
              onClick={(event) => {
                event.stopPropagation();
              }}
            >
              <h2>Add Images</h2>
              <span>
                <button
                  className="disabled:line-through disabled:bg-slate-500 rounded m-1 p-1 border-2 bg-cyan-400 hover:bg-cyan-600"
                  onClick={() => {
                    const image_url = prompt("Image URL");
                    if (!image_url) {
                      return;
                    }
                    setImages([
                      ...images,
                      {
                        type: "image_url",
                        image_url: {
                          url: image_url,
                          detail: enableHighResolution ? "high" : "low",
                        },
                      },
                    ]);
                  }}
                >
                  Add from URL
                </button>
                <button
                  className="disabled:line-through disabled:bg-slate-500 rounded m-1 p-1 border-2 bg-cyan-400 hover:bg-cyan-600"
                  onClick={() => {
                    // select file and load it to base64 image URL format
                    const input = document.createElement("input");
                    input.type = "file";
                    input.accept = "image/*";
                    input.onchange = (event) => {
                      const file = (event.target as HTMLInputElement)
                        .files?.[0];
                      if (!file) {
                        return;
                      }
                      const reader = new FileReader();
                      reader.readAsDataURL(file);
                      reader.onloadend = () => {
                        const base64data = reader.result;
                        setImages([
                          ...images,
                          {
                            type: "image_url",
                            image_url: {
                              url: String(base64data),
                              detail: enableHighResolution ? "high" : "low",
                            },
                          },
                        ]);
                      };
                    };
                    input.click();
                  }}
                >
                  Add from local file
                </button>
                <span
                  onClick={() => {
                    setEnableHighResolution(!enableHighResolution);
                  }}
                >
                  <label>High resolution</label>
                  <input type="checkbox" checked={enableHighResolution} />
                </span>
              </span>
              <div className="flex flex-wrap">
                {images.map((image, index) => (
                  <div className="flex flex-col">
                    {image.type === "image_url" && (
                      <img
                        className="rounded m-1 p-1 border-2 border-gray-400 w-32"
                        src={image.image_url?.url}
                      />
                    )}
                    <span className="flex justify-between">
                      <button
                        onClick={() => {
                          const image_url = prompt("Image URL");
                          if (!image_url) {
                            return;
                          }
                          images[index].image_url = {
                            url: image_url,
                            detail: enableHighResolution ? "high" : "low",
                          };
                          setImages([...images]);
                        }}
                      >
                        🖋
                      </button>
                      <span
                        onClick={() => {
                          if (image.image_url === undefined) return;
                          image.image_url.detail =
                            image.image_url?.detail === "low" ? "high" : "low";
                          setImages([...images]);
                        }}
                      >
                        <label>HiRes</label>
                        <input
                          type="checkbox"
                          checked={image.image_url?.detail === "high"}
                        />
                      </span>
                      <button
                        onClick={() => {
                          if (!confirm("Are you sure to delete this image?")) {
                            return;
                          }
                          images.splice(index, 1);
                          setImages([...images]);
                        }}
                      >
                        ❌
                      </button>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        <textarea
          rows={Math.min(10, (inputMsg.match(/\n/g) || []).length + 2)}
          value={inputMsg}
          onChange={(event: any) => setInputMsg(event.target.value)}
          onKeyPress={(event: any) => {
            console.log(event);
            if (event.ctrlKey && event.code === "Enter") {
              send(event.target.value, true);
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
            send(inputMsg, true);
          }}
        >
          {Tr("Send")}
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
                      .map(({ content }) => {
                        if (typeof content === "string") {
                          return content;
                        } else {
                          return content.map((c) => c?.text).join(" ");
                        }
                      })
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
                    // Stop the MediaRecorder
                    mediaRecorder.stop();
                    // Stop the media stream
                    mediaRecorder.stream.getTracks()[0].stop();

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
                token:
                  calculate_token_length(inputMsg) +
                  calculate_token_length(images),
                hide: false,
                example: false,
              });
              update_total_tokens();
              setInputMsg("");
              setChatStore({ ...chatStore });
            }}
          >
            {Tr("Assistant")}
          </button>
        )}
        {chatStore.develop_mode && (
          <button
            className="disabled:line-through disabled:bg-slate-500 rounded m-1 p-1 border-2 bg-cyan-400 hover:bg-cyan-600"
            disabled={showGenerating || !chatStore.apiKey}
            onClick={() => {
              send(inputMsg, false);
            }}
          >
            {Tr("User")}
          </button>
        )}
        {chatStore.develop_mode && (
          <button
            className="disabled:line-through disabled:bg-slate-500 rounded m-1 p-1 border-2 bg-cyan-400 hover:bg-cyan-600"
            disabled={showGenerating || !chatStore.apiKey}
            onClick={() => {
              setShowAddToolMsg(true);
            }}
          >
            {Tr("Tool")}
          </button>
        )}
        {showAddToolMsg && (
          <div
            className="absolute z-10 bg-black bg-opacity-50 w-full h-full flex justify-center items-center left-0 top-0 overflow-scroll"
            onClick={() => {
              setShowAddToolMsg(false);
            }}
          >
            <div
              className="bg-white rounded p-2 z-20 flex flex-col"
              onClick={(event) => {
                event.stopPropagation();
              }}
            >
              <h2>Add Tool Message</h2>
              <hr className="my-2" />
              <span>
                <label>tool_call_id</label>
                <input
                  className="rounded m-1 p-1 border-2 border-gray-400"
                  type="text"
                  value={newToolCallID}
                  onChange={(event: any) =>
                    setNewToolCallID(event.target.value)
                  }
                />
              </span>
              <span>
                <label>Content</label>
                <textarea
                  className="rounded m-1 p-1 border-2 border-gray-400"
                  rows={5}
                  value={newToolContent}
                  onChange={(event: any) =>
                    setNewToolContent(event.target.value)
                  }
                ></textarea>
              </span>
              <span className={`flex justify-between p-2`}>
                <button
                  className="rounded m-1 p-1 border-2 bg-red-400 hover:bg-red-600"
                  onClick={() => setShowAddToolMsg(false)}
                >
                  {Tr("Cancle")}
                </button>
                <button
                  className="rounded m-1 p-1 border-2 bg-cyan-400 hover:bg-cyan-600"
                  onClick={() => {
                    if (!newToolCallID.trim()) {
                      alert("tool_call_id is empty");
                      return;
                    }
                    if (!newToolContent.trim()) {
                      alert("content is empty");
                      return;
                    }
                    chatStore.history.push({
                      role: "tool",
                      tool_call_id: newToolCallID.trim(),
                      content: newToolContent.trim(),
                      token: calculate_token_length(newToolContent),
                      hide: false,
                      example: false,
                    });
                    update_total_tokens();
                    setChatStore({ ...chatStore });
                    setNewToolCallID("");
                    setNewToolContent("");
                    setShowAddToolMsg(false);
                  }}
                >
                  {Tr("Add")}
                </button>
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
