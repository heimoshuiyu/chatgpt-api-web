import { themeChange } from "theme-change";
import { createRoot } from "react-dom/client";
import { useState, useEffect } from "react";
import { App } from "@/pages/App";
import { Tr, langCodeContext, LANG_OPTIONS } from "@/translate";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/ThemeProvider";

import "./registerSW"; // 添加此行

function Base() {
  const [langCode, _setLangCode] = useState("en-US");

  const setLangCode = (langCode: string) => {
    _setLangCode(langCode);
    if (!localStorage) return;

    localStorage.setItem("chatgpt-api-web-lang", langCode);
  };

  // select language
  useEffect(() => {
    themeChange(false);
    // query localStorage
    if (localStorage) {
      const lang = localStorage.getItem("chatgpt-api-web-lang");
      if (lang) {
        console.log(`query langCode ${lang} from localStorage`);
        _setLangCode(lang);
        return;
      }
    }

    const browserCode = window.navigator.language;
    for (const key in LANG_OPTIONS) {
      for (const i in LANG_OPTIONS[key].matches) {
        const code = LANG_OPTIONS[key].matches[i];
        if (code === browserCode) {
          console.log(`set langCode to "${code}"`);
          setLangCode(key);
          return;
        }
      }
    }
    // fallback to english
    console.log('fallback langCode to "en-US"');
    setLangCode("en-US");
  }, []);

  return (
    /* @ts-ignore */

    <langCodeContext.Provider value={{ langCode, setLangCode }}>
      <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
        <SidebarProvider>
          <App />
          <Toaster />
        </SidebarProvider>
      </ThemeProvider>
    </langCodeContext.Provider>
  );
}

createRoot(document.getElementById("app") as HTMLElement).render(<Base />);
