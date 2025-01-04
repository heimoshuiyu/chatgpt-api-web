import React from "react";
import { ChatStore, TemplateAPI } from "@/types/chatstore";
import { Tr } from "@/translate";

import {
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useContext } from "react";
import { AppContext } from "@/pages/App";
import {
  NavigationMenu,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";

interface APITemplateItemProps {
  label: string;
  shortLabel: string;
  apiField: string;
  keyField: string;
}
function ListAPIs({
  label,
  shortLabel,
  apiField,
  keyField,
}: APITemplateItemProps) {
  const ctx = useContext(AppContext);
  if (ctx === null) return <></>;

  return (
    <NavigationMenuItem>
      <NavigationMenuTrigger>
        <span className="lg:hidden">{shortLabel}</span>
        <span className="hidden lg:inline">
          {label}{" "}
          {ctx.templateAPIs.find(
            (t) =>
              ctx.chatStore[apiField as keyof ChatStore] === t.endpoint &&
              ctx.chatStore[keyField as keyof ChatStore] === t.key
          )?.name &&
            `: ${
              ctx.templateAPIs.find(
                (t) =>
                  ctx.chatStore[apiField as keyof ChatStore] === t.endpoint &&
                  ctx.chatStore[keyField as keyof ChatStore] === t.key
              )?.name
            }`}
        </span>
      </NavigationMenuTrigger>
      <NavigationMenuContent>
        <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px] ">
          {ctx.templateAPIs.map((t, index) => (
            <li>
              <NavigationMenuLink asChild>
                <a
                  onClick={() => {
                    // @ts-ignore
                    ctx.chatStore[apiField as keyof ChatStore] = t.endpoint;
                    // @ts-ignore
                    ctx.chatStore[keyField] = t.key;
                    ctx.setChatStore({ ...ctx.chatStore });
                  }}
                  className={cn(
                    "block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
                    ctx.chatStore[apiField as keyof ChatStore] === t.endpoint &&
                      ctx.chatStore[keyField as keyof ChatStore] === t.key
                      ? "bg-accent text-accent-foreground"
                      : ""
                  )}
                >
                  <div className="text-sm font-medium leading-none">
                    {t.name}
                  </div>
                  <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                    {new URL(t.endpoint).host}
                  </p>
                </a>
              </NavigationMenuLink>
              <div className="mt-2 flex justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const name = prompt(`Give **${label}** template a name`);
                    if (!name) return;
                    t.name = name;
                    ctx.setTemplateAPIs(structuredClone(ctx.templateAPIs));
                  }}
                >
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (
                      !confirm(
                        `Are you sure to delete this **${label}** template?`
                      )
                    ) {
                      return;
                    }
                    ctx.templateAPIs.splice(index, 1);
                    ctx.setTemplateAPIs(structuredClone(ctx.templateAPIs));
                  }}
                >
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </NavigationMenuContent>
    </NavigationMenuItem>
  );
}

function ListToolsTemplates() {
  const ctx = useContext(AppContext);
  if (!ctx) return <div>error</div>;

  const { chatStore, setChatStore } = ctx;

  return (
    <NavigationMenuItem className="p-3">
      <NavigationMenuTrigger>
        <span>{Tr(`Saved tools templates`)}</span>
        <Button
          variant="link"
          className="ml-2 text-sm"
          onClick={() => {
            chatStore.toolsString = "";
            setChatStore({ ...chatStore });
          }}
        >
          {Tr(`Clear`)}
        </Button>
      </NavigationMenuTrigger>
      <NavigationMenuContent>
        <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px]">
          {ctx.templateTools.map((t, index) => (
            <li key={index}>
              <NavigationMenuLink asChild>
                <a
                  onClick={() => {
                    chatStore.toolsString = t.toolsString;
                    setChatStore({ ...chatStore });
                  }}
                  className={cn(
                    "block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
                    chatStore.toolsString === t.toolsString
                      ? "bg-accent text-accent-foreground"
                      : ""
                  )}
                >
                  <div className="text-sm font-medium leading-none">
                    {t.name}
                  </div>
                  <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                    {t.toolsString}
                  </p>
                </a>
              </NavigationMenuLink>
              <div className="mt-2 flex justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const name = prompt(`Give **tools** template a name`);
                    if (!name) return;
                    t.name = name;
                    ctx.setTemplateTools(structuredClone(ctx.templateTools));
                  }}
                >
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (
                      !confirm(
                        `Are you sure to delete this **tools** template?`
                      )
                    ) {
                      return;
                    }
                    ctx.templateTools.splice(index, 1);
                    ctx.setTemplateTools(structuredClone(ctx.templateTools));
                  }}
                >
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </NavigationMenuContent>
    </NavigationMenuItem>
  );
}

const ListAPI: React.FC = () => {
  const ctx = useContext(AppContext);
  if (!ctx) return <div>error</div>;
  return (
    <div className="flex flex-col p-2 gap-2 w-full">
      <NavigationMenu>
        <NavigationMenuList>
          {ctx.templateAPIs.length > 0 && (
            <ListAPIs
              label="Chat API"
              shortLabel="API"
              apiField="apiEndpoint"
              keyField="apiKey"
            />
          )}
          {ctx.templateAPIsWhisper.length > 0 && (
            <ListAPIs
              label="Whisper API"
              shortLabel="Whisper"
              apiField="whisper_api"
              keyField="whisper_key"
            />
          )}
          {ctx.templateAPIsTTS.length > 0 && (
            <ListAPIs
              label="TTS API"
              shortLabel="TTS"
              apiField="tts_api"
              keyField="tts_key"
            />
          )}
          {ctx.templateAPIsImageGen.length > 0 && (
            <ListAPIs
              label="Image Gen API"
              shortLabel="ImgGen"
              apiField="image_gen_api"
              keyField="image_gen_key"
            />
          )}
          {ctx.templateTools.length > 0 && <ListToolsTemplates />}
        </NavigationMenuList>
      </NavigationMenu>
    </div>
  );
};

export default ListAPI;
