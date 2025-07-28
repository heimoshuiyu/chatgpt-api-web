import React, { useContext, useState } from "react";
import { AppContext } from "@/pages/App";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { SaveIcon } from "lucide-react";

export const MCPServerShowBlock = (props: {
  index: number;
  label: string;
  configJson: string;
}) => {
  const { templateMCPServers, setTemplateMCPServers } = useContext(AppContext);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const handleEdit = () => {
    const nameInput = document.getElementById(
      `editMcpServerName_${props.index}`
    ) as HTMLInputElement;
    const configInput = document.getElementById(
      `editMcpServerConfig_${props.index}`
    ) as HTMLTextAreaElement;
    const nameError = document.getElementById(
      `editMcpServerNameError_${props.index}`
    ) as HTMLLabelElement;
    const configError = document.getElementById(
      `editMcpServerConfigError_${props.index}`
    ) as HTMLLabelElement;

    // 清除之前的错误信息
    if (nameError) nameError.textContent = "";
    if (configError) configError.textContent = "";

    if (!nameInput.value.trim()) {
      if (nameError) {
        nameError.textContent = "MCP Server 名称不能为空";
      }
      return;
    }

    if (!configInput.value.trim()) {
      if (configError) {
        configError.textContent = "MCP Server 配置不能为空";
      }
      return;
    }

    // 验证 JSON 格式
    try {
      const config = JSON.parse(configInput.value.trim());
      if (!config.mcpServers || typeof config.mcpServers !== "object") {
        if (configError) {
          configError.textContent = "配置必须包含 mcpServers 对象";
        }
        return;
      }
    } catch (error) {
      if (configError) {
        configError.textContent = "无效的 JSON 格式";
      }
      return;
    }

    const updatedServers = [...templateMCPServers];
    updatedServers[props.index] = {
      name: nameInput.value.trim(),
      configJson: configInput.value.trim(),
    };
    setTemplateMCPServers(updatedServers);
    setEditDialogOpen(false);
  };

  const openEditDialog = () => {
    setEditDialogOpen(true);
    // 在下一个事件循环中设置初始值
    setTimeout(() => {
      const nameInput = document.getElementById(
        `editMcpServerName_${props.index}`
      ) as HTMLInputElement;
      const configInput = document.getElementById(
        `editMcpServerConfig_${props.index}`
      ) as HTMLTextAreaElement;
      if (nameInput) nameInput.value = props.label;
      if (configInput) {
        try {
          // 格式化 JSON 显示
          const formatted = JSON.stringify(
            JSON.parse(props.configJson),
            null,
            2
          );
          configInput.value = formatted;
        } catch {
          configInput.value = props.configJson;
        }
      }
    }, 0);
  };

  return (
    <div className="border-b border-gray-200 pb-4 pt-4">
      <Badge variant="outline">MCP Server</Badge> <Label>{props.label}</Label>
      <div className="mt-4">
        <div className="grid w-full max-w-sm items-center gap-1.5 mt-2">
          <Label>配置</Label>
          <ScrollArea className="w-72 h-32 whitespace-nowrap rounded-md border">
            <pre className="text-xs p-2">
              {JSON.stringify(JSON.parse(props.configJson), null, 2)}
            </pre>
          </ScrollArea>
        </div>
      </div>
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="mt-2 mr-2"
            onClick={openEditDialog}
          >
            编辑
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>编辑 MCP Server</DialogTitle>
            <DialogDescription>
              修改 MCP Server 的名称和配置。
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col space-y-4">
            <div className="grid gap-2">
              <Label htmlFor={`editMcpServerName_${props.index}`}>名称</Label>
              <Input
                id={`editMcpServerName_${props.index}`}
                placeholder="请输入 MCP Server 名称..."
              />
              <Label
                id={`editMcpServerNameError_${props.index}`}
                className="text-red-600 text-sm"
              ></Label>
            </div>
            <div className="grid gap-2">
              <Label htmlFor={`editMcpServerConfig_${props.index}`}>
                配置 (JSON)
              </Label>
              <textarea
                id={`editMcpServerConfig_${props.index}`}
                className="min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="请输入 MCP Server 配置..."
              />
              <Label
                id={`editMcpServerConfigError_${props.index}`}
                className="text-red-600 text-sm"
              ></Label>
            </div>
          </div>
          <DialogFooter className="sm:justify-start">
            <DialogClose asChild>
              <Button variant="outline">取消</Button>
            </DialogClose>
            <Button
              type="submit"
              size="sm"
              className="px-3"
              onClick={handleEdit}
            >
              <SaveIcon className="w-4 h-4" /> 保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Button
        variant="destructive"
        size="sm"
        className="mt-2"
        onClick={() => {
          if (!confirm(`确定要删除 ${props.label} MCP Server 吗？`)) {
            return;
          }
          templateMCPServers.splice(props.index, 1);
          setTemplateMCPServers(structuredClone(templateMCPServers));
        }}
      >
        删除
      </Button>
    </div>
  );
};

export const MCPServerAddDialog = (props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const { templateMCPServers, setTemplateMCPServers } = useContext(AppContext);

  const handleAddMCPServer = () => {
    const nameInput = document.getElementById(
      "mcpServerName"
    ) as HTMLInputElement;
    const configInput = document.getElementById(
      "mcpServerConfig"
    ) as HTMLTextAreaElement;
    const nameError = document.getElementById(
      "mcpServerNameError"
    ) as HTMLLabelElement;
    const configError = document.getElementById(
      "mcpServerConfigError"
    ) as HTMLLabelElement;

    // 清除之前的错误信息
    if (nameError) nameError.textContent = "";
    if (configError) configError.textContent = "";

    if (!nameInput.value.trim()) {
      if (nameError) {
        nameError.textContent = "MCP Server 名称不能为空";
      }
      return;
    }

    if (!configInput.value.trim()) {
      if (configError) {
        configError.textContent = "MCP Server 配置不能为空";
      }
      return;
    }

    // 验证 JSON 格式
    try {
      const config = JSON.parse(configInput.value.trim());
      if (!config.mcpServers || typeof config.mcpServers !== "object") {
        if (configError) {
          configError.textContent = "配置必须包含 mcpServers 对象";
        }
        return;
      }
    } catch (error) {
      if (configError) {
        configError.textContent = "无效的 JSON 格式";
      }
      return;
    }

    const newMCPServer = {
      name: nameInput.value.trim(),
      configJson: configInput.value.trim(),
    };

    setTemplateMCPServers([...templateMCPServers, newMCPServer]);

    // 清空输入框
    nameInput.value = "";
    configInput.value = "";
    props.onOpenChange(false);
  };

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>添加 MCP Server</DialogTitle>
          <DialogDescription>
            请输入 MCP Server 的名称和配置。配置应该是包含 mcpServers 的 JSON
            对象。
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="mcpServerName">名称</Label>
            <Input id="mcpServerName" placeholder="请输入 MCP Server 名称..." />
            <Label
              id="mcpServerNameError"
              className="text-red-600 text-sm"
            ></Label>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="mcpServerConfig">配置 (JSON)</Label>
            <textarea
              id="mcpServerConfig"
              className="min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder='请输入 MCP Server 配置，例如:
{
  "mcpServers": {
    "fetch": {
      "type": "sse",
      "url": "https://mcp.api-inference.modelscope.net/85c065ca33464d/sse"
    }
  }
}'
            />
            <Label
              id="mcpServerConfigError"
              className="text-red-600 text-sm"
            ></Label>
          </div>
        </div>
        <DialogFooter className="sm:justify-start">
          <DialogClose asChild>
            <Button variant="outline">取消</Button>
          </DialogClose>
          <Button
            type="submit"
            size="sm"
            className="px-3"
            onClick={handleAddMCPServer}
          >
            <SaveIcon className="w-4 h-4" /> 保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
