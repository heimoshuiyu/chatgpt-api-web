import { ChatStore, TemplateAPI } from "@/types/chatstore";
import { Tr } from "@/translate";

import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuIndicator,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  NavigationMenuViewport,
} from "@/components/ui/navigation-menu";
import { Button } from "./components/ui/button";
import { cn } from "@/lib/utils";
import { useContext } from "react";
import { AppContext } from "./pages/App";

interface Props {
  label: string;
  apiField: string;
  keyField: string;
}
export function ListAPIs({ label, apiField, keyField }: Props) {
  const ctx = useContext(AppContext);
  if (ctx === null) return <></>;

  return (
    <NavigationMenuItem>
      <NavigationMenuTrigger>
        {label}{" "}
        <span className="hidden lg:inline">
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
