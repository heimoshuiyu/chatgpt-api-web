import { ChatStore, TemplateTools } from "@/types/chatstore";
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
import { cn } from "@/lib/utils";
import { Button } from "./components/ui/button";
import { useContext } from "react";
import { AppContext } from "./pages/App";

export function ListToolsTempaltes() {
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
