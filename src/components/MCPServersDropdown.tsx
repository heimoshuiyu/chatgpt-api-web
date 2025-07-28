import React, { useContext, useState } from "react";
import { Tr } from "@/translate";
import { Button } from "@/components/ui/button";
import { AppChatStoreContext, AppContext } from "@/pages/App";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { BrushIcon } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

export function MCPServersDropdownList() {
  const { chatStore, setChatStore } = useContext(AppChatStoreContext);
  const { templateMCPServers } = useContext(AppContext);
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);

  const selectedCount = chatStore.selectedMCPServers?.length || 0;

  // 从配置 JSON 中提取所有可用的 MCP server 名字
  const getAllMCPServerNames = () => {
    const allServers: {
      templateName: string;
      serverName: string;
      config: any;
    }[] = [];

    templateMCPServers.forEach((template) => {
      try {
        const config = JSON.parse(template.configJson);
        if (config.mcpServers && typeof config.mcpServers === "object") {
          Object.keys(config.mcpServers).forEach((serverName) => {
            allServers.push({
              templateName: template.name,
              serverName: serverName,
              config: config.mcpServers[serverName],
            });
          });
        }
      } catch (error) {
        console.error(`Invalid JSON in template ${template.name}:`, error);
      }
    });

    return allServers;
  };

  const handleMCPServerToggle = (serverName: string, checked: boolean) => {
    const currentSelected = chatStore.selectedMCPServers || [];
    let newSelected: string[];

    if (checked) {
      newSelected = [...currentSelected, serverName];
    } else {
      newSelected = currentSelected.filter((name) => name !== serverName);
    }

    const updatedChatStore = { ...chatStore, selectedMCPServers: newSelected };
    setChatStore(updatedChatStore);

    toast({
      title: "MCP Servers Updated",
      description: `${newSelected.length} MCP server(s) selected`,
    });
  };

  const handleClearAll = () => {
    const updatedChatStore = { ...chatStore, selectedMCPServers: [] };
    setChatStore(updatedChatStore);
    toast({
      title: "MCP Servers Cleared",
      description: "All MCP servers have been deselected",
    });
    setOpen(false);
  };

  const allMCPServers = getAllMCPServerNames();

  if (allMCPServers.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center space-x-4 mx-3">
      <p className="text-sm text-muted-foreground">MCP Servers</p>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-[200px] justify-start">
            {selectedCount > 0 ? (
              <>已选择 {selectedCount} 个服务器</>
            ) : (
              <>+ 选择 MCP Servers</>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0" side="bottom" align="start">
          <Command>
            <CommandInput placeholder="搜索 MCP Servers..." />
            <CommandList>
              <CommandEmpty>
                <Tr>No results found.</Tr>
              </CommandEmpty>
              <CommandGroup>
                {selectedCount > 0 && (
                  <CommandItem
                    key="clear-all"
                    onSelect={handleClearAll}
                    className="text-red-600"
                  >
                    <BrushIcon className="mr-2 h-4 w-4" />
                    清除所有选择
                  </CommandItem>
                )}
                {allMCPServers.map((server, index) => {
                  const isSelected =
                    chatStore.selectedMCPServers?.includes(server.serverName) ||
                    false;
                  return (
                    <CommandItem
                      key={index}
                      onSelect={() => {
                        // 阻止默认的选择行为，我们用 checkbox 来处理
                      }}
                      className="flex items-center space-x-2"
                    >
                      <Checkbox
                        id={`mcp-server-${index}`}
                        checked={isSelected}
                        onCheckedChange={(checked) =>
                          handleMCPServerToggle(
                            server.serverName,
                            checked as boolean
                          )
                        }
                      />
                      <div className="flex flex-col">
                        <label
                          htmlFor={`mcp-server-${index}`}
                          className="text-sm font-medium cursor-pointer"
                        >
                          {server.serverName}
                        </label>
                        <span className="text-xs text-muted-foreground">
                          来自: {server.templateName} | {server.config.type} |{" "}
                          {server.config.url}
                        </span>
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
