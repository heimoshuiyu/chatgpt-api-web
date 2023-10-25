import { render } from "preact";
import { App } from "./app";
import { useState } from "preact/hooks";
import { Tr, langCodeContext, LANG_OPTIONS } from "./translate";

function Base() {
  const [langCode, setLangCode] = useState("en-US");
  return (
    /* @ts-ignore */
    <langCodeContext.Provider value={{ langCode, setLangCode }}>
      <App />
    </langCodeContext.Provider>
  );
}

render(<Base />, document.getElementById("app") as HTMLElement);
