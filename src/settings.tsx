import { createRef } from "preact";
import { StateUpdater } from "preact/hooks";
import { ChatStore } from "./app";
import models from "./models";

const Help = (props: { children: any; help: string }) => {
  return (
    <div>
      <button
        className="absolute"
        onClick={() => {
          alert(props.help);
        }}
      >
        ❓
      </button>
      <p className="flex justify-between">{props.children}</p>
    </div>
  );
};

const SelectModel = (props: {
  chatStore: ChatStore;
  setChatStore: (cs: ChatStore) => void;
  help: string;
}) => {
  return (
    <Help help={props.help}>
      <label className="m-2 p-2">Model</label>
      <select
        className="m-2 p-2"
        value={props.chatStore.model}
        onChange={(event: any) => {
          const model = event.target.value as string;
          props.chatStore.model = model;
          props.chatStore.maxTokens = models[model].maxToken;
          props.setChatStore({ ...props.chatStore });
        }}
      >
        {Object.keys(models).map((opt) => (
          <option value={opt}>{opt}</option>
        ))}
      </select>
    </Help>
  );
};

const Input = (props: {
  chatStore: ChatStore;
  setChatStore: (cs: ChatStore) => void;
  field: "apiKey" | "systemMessageContent" | "apiEndpoint";
  help: string;
}) => {
  return (
    <Help help={props.help}>
      <label className="m-2 p-2">{props.field}</label>
      <input
        className="m-2 p-2 border rounded focus w-32 md:w-fit"
        value={props.chatStore[props.field]}
        onChange={(event: any) => {
          props.chatStore[props.field] = event.target.value;
          props.setChatStore({ ...props.chatStore });
        }}
      ></input>
    </Help>
  );
};
const Number = (props: {
  chatStore: ChatStore;
  setChatStore: (cs: ChatStore) => void;
  field: "totalTokens" | "maxTokens" | "tokenMargin" | "postBeginIndex";
  readOnly: boolean;
  help: string;
}) => {
  return (
    <Help help={props.help}>
      <label className="m-2 p-2">{props.field}</label>
      <input
        readOnly={props.readOnly}
        type="number"
        className="m-2 p-2 border rounded focus w-28"
        value={props.chatStore[props.field]}
        onChange={(event: any) => {
          console.log("type", typeof event.target.value);
          let newNumber = parseInt(event.target.value);
          if (newNumber < 0) newNumber = 0;
          props.chatStore[props.field] = newNumber;
          props.setChatStore({ ...props.chatStore });
        }}
      ></input>
    </Help>
  );
};
const Choice = (props: {
  chatStore: ChatStore;
  setChatStore: (cs: ChatStore) => void;
  field: "streamMode";
  help: string;
}) => {
  return (
    <Help help={props.help}>
      <label className="m-2 p-2">{props.field}</label>
      <input
        type="checkbox"
        className="m-2 p-2 border rounded focus"
        checked={props.chatStore[props.field]}
        onChange={(event: any) => {
          props.chatStore[props.field] = event.target.checked;
          props.setChatStore({ ...props.chatStore });
        }}
      ></input>
    </Help>
  );
};

export default (props: {
  chatStore: ChatStore;
  setChatStore: (cs: ChatStore) => void;
  show: boolean;
  setShow: StateUpdater<boolean>;
  selectedChatStoreIndex: number;
}) => {
  if (!props.show) return <div></div>;
  const link =
    location.protocol +
    "//" +
    location.host +
    location.pathname +
    `?key=${encodeURIComponent(
      props.chatStore.apiKey
    )}&api=${encodeURIComponent(props.chatStore.apiEndpoint)}&mode=${
      props.chatStore.streamMode ? "stream" : "fetch"
    }&model=${props.chatStore.model}&sys=${encodeURIComponent(
      props.chatStore.systemMessageContent
    )}`;

  const importFileRef = createRef();
  return (
    <div className="left-0 top-0 overflow-scroll flex justify-center absolute w-screen h-full bg-black bg-opacity-50 z-10">
      <div className="m-2 p-2 bg-white rounded-lg h-fit">
        <h3 className="text-xl">Settings</h3>
        <hr />
        <p className="m-2 p-2">
          Total cost in this section ${props.chatStore.cost.toFixed(4)}
        </p>
        <div className="box">
          <Input
            field="systemMessageContent"
            help="系统消息，用于指示ChatGPT的角色和一些前置条件，例如“你是一个有帮助的人工智能助理”，或者“你是一个专业英语翻译，把我的话全部翻译成英语”，详情参考 OPEAN AI API 文档"
            {...props}
          />
          <Input
            field="apiKey"
            help="OPEN AI API 密钥，请勿泄漏此密钥"
            {...props}
          />
          <Input
            field="apiEndpoint"
            help="API 端点，方便在不支持的地区使用反向代理服务，默认为 https://api.openai.com/v1/chat/completions"
            {...props}
          />
          <Choice
            field="streamMode"
            help="流模式，使用 stream mode 将可以动态看到生成内容，但无法准确计算 token 数量，在 token 数量过多时可能会裁切过多或过少历史消息"
            {...props}
          />
          <SelectModel
            help="模型，默认 3.5。不同模型性能和定价也不同，请参考 API 文档。（GPT-4 模型处于内测阶段，需要向 OPENAI 申请, 请确保您有访问权限）"
            {...props}
          />
          <Number
            field="maxTokens"
            help="最大 token 数量。如果使用非gpt-3.5模型，请手动修改上限。gpt-4 & gpt-4-0314: 8192。gpt-4-32k & gpt-4-32k-0314: 32768"
            readOnly={false}
            {...props}
          />
          <Number
            field="tokenMargin"
            help="当 totalTokens > maxTokens - tokenMargin 时会触发历史消息裁切，chatgpt会“忘记”一部分对话中的消息（但所有历史消息仍然保存在本地）"
            readOnly={false}
            {...props}
          />
          <Number
            field="postBeginIndex"
            help="指示发送 API 请求时要”忘记“多少历史消息"
            readOnly={false}
            {...props}
          />
          <Number
            field="totalTokens"
            help="token总数，每次对话都会更新此参数，stream模式下该参数为估计值"
            readOnly={true}
            {...props}
          />
          <p className="flex justify-evenly">
            <button
              className="p-2 m-2 rounded bg-amber-500"
              onClick={() => {
                let dataStr =
                  "data:text/json;charset=utf-8," +
                  encodeURIComponent(
                    JSON.stringify(props.chatStore, null, "\t")
                  );
                let downloadAnchorNode = document.createElement("a");
                downloadAnchorNode.setAttribute("href", dataStr);
                downloadAnchorNode.setAttribute(
                  "download",
                  `chatgpt-api-web-${props.selectedChatStoreIndex}.json`
                );
                document.body.appendChild(downloadAnchorNode); // required for firefox
                downloadAnchorNode.click();
                downloadAnchorNode.remove();
              }}
            >
              Export
            </button>
            <button
              className="p-2 m-2 rounded bg-amber-500"
              onClick={() => {
                if (
                  !confirm(
                    "This will OVERWRITE the current chat history! Continue?"
                  )
                )
                  return;
                console.log("importFileRef", importFileRef);
                importFileRef.current.click();
              }}
            >
              Import
            </button>
            <input
              className="hidden"
              ref={importFileRef}
              type="file"
              onChange={() => {
                const file = importFileRef.current.files[0];
                console.log("file to import", file);
                if (!file || file.type !== "application/json") {
                  alert("Please select a json file");
                  return;
                }
                const reader = new FileReader();
                reader.onload = () => {
                  console.log("import content", reader.result);
                  if (!reader) {
                    alert("Empty file");
                    return;
                  }
                  try {
                    const newChatStore: ChatStore = JSON.parse(
                      reader.result as string
                    );
                    if (!newChatStore.chatgpt_api_web_version) {
                      throw "This is not an exported chatgpt-api-web chatstore file. The key 'chatgpt_api_web_version' is missing!";
                    }
                    props.setChatStore({ ...newChatStore });
                  } catch (e) {
                    alert(`Import error on parsing json: ${e}`);
                  }
                };
                reader.readAsText(file);
              }}
            />
          </p>
          <p className="text-center m-2 p-2">
            chatgpt-api-web ChatStore Version{" "}
            {props.chatStore.chatgpt_api_web_version}
          </p>
        </div>
        <hr />
        <div className="flex justify-between">
          <button
            className="p-2 m-2 rounded bg-purple-600 text-white"
            onClick={() => {
              navigator.clipboard.writeText(link);
              alert(`Copied link: ${link}`);
            }}
          >
            Copy Link
          </button>
          <button
            className="p-2 m-2 rounded bg-rose-600 text-white"
            onClick={() => {
              if (
                !confirm(
                  `Are you sure to clear all ${props.chatStore.history.length} messages?`
                )
              )
                return;
              props.chatStore.history = [];
              props.chatStore.postBeginIndex = 0;
              props.chatStore.totalTokens = 0;
              props.setChatStore({ ...props.chatStore });
            }}
          >
            Clear History
          </button>
          <button
            className="p-2 m-2 rounded bg-cyan-600 text-white"
            onClick={() => {
              props.setShow(false);
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
