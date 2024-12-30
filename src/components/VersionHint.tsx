import { ChatStore } from "@/types/chatstore";
import { Tr } from "@/translate";
import { useContext } from "react";
import { AppContext } from "@/pages/App";

const VersionHint = () => {
  const ctx = useContext(AppContext);
  if (!ctx) return <div>error</div>;

  const { chatStore } = ctx;
  return (
    <>
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
    </>
  );
};

export default VersionHint;
