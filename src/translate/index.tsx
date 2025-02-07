import { createContext, useContext } from "react";
import MAP_zh_CN from "@/translate/zh_CN";

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

// lowercase all langMap keys
Object.keys(LANG_OPTIONS).forEach((langCode) => {
  const langMap = LANG_OPTIONS[langCode].langMap;
  const newLangMap: Record<string, string> = {};
  Object.keys(langMap).forEach((key) => {
    newLangMap[key.toLowerCase()] = langMap[key];
  });
  LANG_OPTIONS[langCode].langMap = newLangMap;
});

type LangCode = "en-US" | "zh-CN";

interface LangCodeContextSchema {
  langCode: LangCode;
  setLangCode: (langCode: LangCode) => void;
}
const langCodeContext = createContext<LangCodeContextSchema>({
  langCode: "en-US",
  setLangCode: () => {},
});

function tr(text: string, langCode: "en-US" | "zh-CN") {
  const option = LANG_OPTIONS[langCode];
  if (option === undefined) {
    return text;
  }
  const langMap = LANG_OPTIONS[langCode].langMap;

  const translatedText = langMap[text.toLowerCase()];
  if (translatedText === undefined) {
    console.log(`[Translation] not found for "${text}"`);
    return text;
  }

  return translatedText;
}
function Tr({ children }: { children: string }) {
  return (
    <langCodeContext.Consumer>
      {/* @ts-ignore */}
      {({ langCode }) => {
        return tr(children, langCode);
      }}
    </langCodeContext.Consumer>
  );
}

export { tr, Tr, LANG_OPTIONS, langCodeContext };
