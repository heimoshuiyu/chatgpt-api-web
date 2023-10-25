import { render } from "preact";
import { App } from "./app";
import { useState, useEffect } from "preact/hooks";
import { Tr, langCodeContext, LANG_OPTIONS } from "./translate";

function Base() {
  const [langCode, setLangCode] = useState("en-US");

  // select language
  useEffect(() => {
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
      <App />
    </langCodeContext.Provider>
  );
}

render(<Base />, document.getElementById("app") as HTMLElement);
