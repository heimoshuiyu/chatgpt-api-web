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

interface Props {
  chatStore: ChatStore;
  setChatStore: (cs: ChatStore) => void;
  tmps: TemplateAPI[];
  setTmps: (tmps: TemplateAPI[]) => void;
  label: string;
  apiField: string;
  keyField: string;
}
export function ListAPIs({
  tmps,
  setTmps,
  chatStore,
  setChatStore,
  label,
  apiField,
  keyField,
}: Props) {
  return (
    <NavigationMenuItem>
      <NavigationMenuTrigger>
        {label}{" "}
        <span className="hidden lg:inline">
          {tmps.find(
            (t) =>
              chatStore[apiField as keyof ChatStore] === t.endpoint &&
              chatStore[keyField as keyof ChatStore] === t.key
          )?.name &&
            `: ${
              tmps.find(
                (t) =>
                  chatStore[apiField as keyof ChatStore] === t.endpoint &&
                  chatStore[keyField as keyof ChatStore] === t.key
              )?.name
            }`}
        </span>
      </NavigationMenuTrigger>
      <NavigationMenuContent>
        <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px] ">
          {tmps.map((t, index) => (
            <li>
              <NavigationMenuLink asChild>
                <a
                  onClick={() => {
                    // @ts-ignore
                    chatStore[apiField] = t.endpoint;
                    // @ts-ignore
                    chatStore[keyField] = t.key;
                    setChatStore({ ...chatStore });
                  }}
                  className={cn(
                    "block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
                    chatStore[apiField as keyof ChatStore] === t.endpoint &&
                      chatStore[keyField as keyof ChatStore] === t.key
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
                    setTmps(structuredClone(tmps));
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
                    tmps.splice(index, 1);
                    setTmps(structuredClone(tmps));
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
