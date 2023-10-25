import { createContext } from "preact";
import MAP_zh_CN from "./zh_CN";

interface LangOption {
  name: string;
  langMap: Record<string, string>;
  matches: string[];
}

const LANG_OPTIONS: Record<string, LangOption> = {
  "en-US": {
    name: "English",
    langMap: {},
    matches: ["en-US", "en"],
  },
  "zh-CN": {
    name: "中文（简体）",
    langMap: MAP_zh_CN,
    matches: ["zh-CN", "zh"],
  },
};

const langCodeContext = createContext("en-US");

function tr(text: string, langCode: "en-US" | "zh-CN") {
  const option = LANG_OPTIONS[langCode];
  if (option === undefined) {
    return text;
  }
  const langMap = LANG_OPTIONS[langCode].langMap;

  const translatedText = langMap[text.toLowerCase()];
  if (translatedText === undefined) {
    return text;
  }

  return translatedText;
}

function Tr(text: string) {
  return (
    <langCodeContext.Consumer>
      {/* @ts-ignore */}
      {({ langCode }) => {
        return tr(text, langCode);
      }}
    </langCodeContext.Consumer>
  );
}

export { tr, Tr, LANG_OPTIONS, langCodeContext };
