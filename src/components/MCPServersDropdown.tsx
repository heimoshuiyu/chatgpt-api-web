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
import { BrushIcon, CheckCircle, Loader2, AlertCircle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { MCPTool, MCPServerConnection } from "@/types/chatstore";

interface MCPHandshakeStep {
  id: string;
  title: string;
  status: "pending" | "loading" | "success" | "error";
  description?: string;
  data?: any;
}

interface MCPHandshakeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  serverName: string;
  templateName: string;
  serverConfig: any;
  onHandshakeComplete: (connection: MCPServerConnection) => void;
}

function MCPHandshakeDialog({
  isOpen,
  onClose,
  serverName,
  templateName,
  serverConfig,
  onHandshakeComplete,
}: MCPHandshakeDialogProps) {
  const [steps, setSteps] = useState<MCPHandshakeStep[]>([
    {
      id: "initialize",
      title: "1. 发送初始化请求",
      status: "pending",
      description: "向 MCP Server 发送 initialize 方法请求",
    },
    {
      id: "confirm",
      title: "2. 确认初始化",
      status: "pending",
      description: "发送 notifications/initialized 确认握手",
    },
    {
      id: "tools",
      title: "3. 获取工具列表",
      status: "pending",
      description: "发送 tools/list 请求获取可用工具",
    },
  ]);
  const [tools, setTools] = useState<MCPTool[]>([]);
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [sessionId, setSessionId] = useState<string>("");
  const { toast } = useToast();

  const updateStepStatus = (
    stepId: string,
    status: MCPHandshakeStep["status"],
    data?: any
  ) => {
    setSteps((prev) =>
      prev.map((step) =>
        step.id === stepId ? { ...step, status, data } : step
      )
    );
  };

  const performHandshake = async () => {
    try {
      // Step 1: Initialize
      updateStepStatus("initialize", "loading");

      const initializePayload = {
        method: "initialize",
        params: {
          protocolVersion: "2025-06-18",
          capabilities: {
            sampling: {},
            elicitation: {},
            roots: { listChanged: true },
          },
          clientInfo: {
            name: "chatgpt-api-web",
            version: "1.0.0",
          },
        },
        jsonrpc: "2.0",
        id: 0,
      };

      console.log("Sending initialize request:", initializePayload);

      // 发送真实的初始化请求
      const initResponse = await fetch(serverConfig.url, {
        method: "POST",
        headers: {
          Accept: "application/json, text/event-stream",
          "Content-Type": "application/json; charset=utf-8",
        },
        body: JSON.stringify(initializePayload),
      });

      if (!initResponse.ok) {
        throw new Error(
          `Initialize request failed: ${initResponse.status} ${initResponse.statusText}`
        );
      }

      // 获取会话 ID
      const sessionId = initResponse.headers.get("mcp-session-id");
      if (!sessionId) {
        console.error("headers", initResponse.headers);
        throw new Error("No session ID received from server");
      }
      setSessionId(sessionId);

      // 解析 SSE 响应
      const responseText = await initResponse.text();
      let initResult;

      if (responseText.includes("data: ")) {
        // 解析 SSE 格式
        const lines = responseText.split("\n");
        const dataLine = lines.find((line) => line.startsWith("data: "));
        if (dataLine) {
          const jsonData = dataLine.substring(6); // 移除 "data: " 前缀
          initResult = JSON.parse(jsonData);
        }
      } else {
        // 普通 JSON 响应
        initResult = JSON.parse(responseText);
      }

      updateStepStatus("initialize", "success", {
        request: initializePayload,
        response: initResult,
        sessionId: sessionId,
      });

      // Step 2: Send initialized notification
      updateStepStatus("confirm", "loading");

      const initializedPayload = {
        method: "notifications/initialized",
        params: {},
        jsonrpc: "2.0",
      };

      console.log("Sending initialized notification:", initializedPayload);

      const confirmResponse = await fetch(serverConfig.url, {
        method: "POST",
        headers: {
          Accept: "application/json, text/event-stream",
          "Content-Type": "application/json; charset=utf-8",
          "Mcp-Session-Id": sessionId,
        },
        body: JSON.stringify(initializedPayload),
      });

      if (!confirmResponse.ok) {
        throw new Error(
          `Initialized notification failed: ${confirmResponse.status} ${confirmResponse.statusText}`
        );
      }

      updateStepStatus("confirm", "success", {
        request: initializedPayload,
        response: {
          status: confirmResponse.status,
          statusText: confirmResponse.statusText,
          headers: Object.fromEntries(confirmResponse.headers.entries()),
        },
      });

      // Step 3: Get tools list
      updateStepStatus("tools", "loading");

      const toolsListPayload = {
        method: "tools/list",
        params: {},
        id: 2,
        jsonrpc: "2.0",
      };

      console.log("Sending tools/list request:", toolsListPayload);

      const toolsResponse = await fetch(serverConfig.url, {
        method: "POST",
        headers: {
          Accept: "application/json, text/event-stream",
          "Content-Type": "application/json; charset=utf-8",
          "Mcp-Session-Id": sessionId,
        },
        body: JSON.stringify(toolsListPayload),
      });

      if (!toolsResponse.ok) {
        throw new Error(
          `Tools list request failed: ${toolsResponse.status} ${toolsResponse.statusText}`
        );
      }

      // 解析工具列表响应
      const toolsResponseText = await toolsResponse.text();
      let toolsResult;

      if (toolsResponseText.includes("data: ")) {
        // 解析 SSE 格式
        const lines = toolsResponseText.split("\n");
        const dataLine = lines.find((line) => line.startsWith("data: "));
        if (dataLine) {
          const jsonData = dataLine.substring(6);
          toolsResult = JSON.parse(jsonData);
        }
      } else {
        // 普通 JSON 响应
        toolsResult = JSON.parse(toolsResponseText);
      }

      // 提取工具列表
      const receivedTools: MCPTool[] = toolsResult?.result?.tools || [];
      setTools(receivedTools);
      // 默认选中所有工具
      setSelectedTools(receivedTools.map((tool) => tool.name));

      updateStepStatus("tools", "success", {
        request: toolsListPayload,
        response: toolsResult,
      });
    } catch (error) {
      console.error("Handshake error:", error);
      const currentStep = steps.find((step) => step.status === "loading");
      if (currentStep) {
        updateStepStatus(currentStep.id, "error", {
          error: error instanceof Error ? error.message : String(error),
        });
      }
      toast({
        title: "握手失败",
        description:
          error instanceof Error
            ? error.message
            : "连接 MCP Server 时发生未知错误",
        variant: "destructive",
      });
    }
  };

  React.useEffect(() => {
    if (isOpen) {
      // Reset state when dialog opens
      setSteps([
        {
          id: "initialize",
          title: "1. 发送初始化请求",
          status: "pending",
          description: "向 MCP Server 发送 initialize 方法请求",
        },
        {
          id: "confirm",
          title: "2. 确认初始化",
          status: "pending",
          description: "发送 notifications/initialized 确认握手",
        },
        {
          id: "tools",
          title: "3. 获取工具列表",
          status: "pending",
          description: "发送 tools/list 请求获取可用工具",
        },
      ]);
      setTools([]);
      setSelectedTools([]);
      setSessionId("");

      // Start handshake
      performHandshake();
    }
  }, [isOpen]);

  const getStepIcon = (status: MCPHandshakeStep["status"]) => {
    switch (status) {
      case "loading":
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return (
          <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
        );
    }
  };

  const handleToolToggle = (toolName: string, checked: boolean) => {
    setSelectedTools((prev) =>
      checked ? [...prev, toolName] : prev.filter((name) => name !== toolName)
    );
  };

  const handleSelectAllTools = (checked: boolean) => {
    setSelectedTools(checked ? tools.map((tool) => tool.name) : []);
  };

  const handleImportTools = () => {
    // 只导入选中的工具
    const selectedToolsData = tools.filter((tool) =>
      selectedTools.includes(tool.name)
    );

    const connection: MCPServerConnection = {
      serverName,
      templateName,
      config: serverConfig,
      sessionId,
      tools: selectedToolsData,
      connected: true,
      connectedAt: new Date().toISOString(),
    };

    onHandshakeComplete(connection);
    onClose();
  };

  const allStepsCompleted = steps.every((step) => step.status === "success");
  const hasSelectedTools = selectedTools.length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>MCP Server 连接: {serverName}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 握手过程 */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">握手过程</h3>
            <div className="space-y-3">
              {steps.map((step) => (
                <div
                  key={step.id}
                  className="flex items-start space-x-3 p-3 border rounded-lg"
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {getStepIcon(step.status)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <h4 className="text-sm font-medium">{step.title}</h4>
                      <Badge
                        variant={
                          step.status === "success"
                            ? "default"
                            : step.status === "loading"
                              ? "secondary"
                              : step.status === "error"
                                ? "destructive"
                                : "outline"
                        }
                      >
                        {step.status === "pending"
                          ? "等待中"
                          : step.status === "loading"
                            ? "进行中"
                            : step.status === "success"
                              ? "成功"
                              : "失败"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {step.description}
                    </p>
                    {step.status === "success" && step.data && (
                      <details className="mt-2">
                        <summary className="text-xs text-blue-600 cursor-pointer hover:text-blue-800">
                          查看详情
                        </summary>
                        <pre className="text-xs bg-gray-50 p-2 rounded mt-1 overflow-auto max-h-32">
                          {JSON.stringify(step.data, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {sessionId && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="text-sm font-medium text-blue-900">会话信息</h4>
                <p className="text-xs text-blue-700 mt-1">
                  Session ID:{" "}
                  <code className="bg-blue-100 px-1 rounded">{sessionId}</code>
                </p>
                <p className="text-xs text-blue-700">
                  服务器:{" "}
                  <code className="bg-blue-100 px-1 rounded">
                    {serverConfig.url}
                  </code>
                </p>
              </div>
            )}
          </div>

          {/* 工具列表 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">可用工具</h3>
              {tools.length > 0 && (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="select-all-tools"
                    checked={selectedTools.length === tools.length}
                    onCheckedChange={handleSelectAllTools}
                  />
                  <label
                    htmlFor="select-all-tools"
                    className="text-sm cursor-pointer"
                  >
                    全选
                  </label>
                </div>
              )}
            </div>
            {tools.length > 0 ? (
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {tools.map((tool, index) => (
                    <div key={index} className="p-3 border rounded-lg">
                      <div className="flex items-center space-x-2 mb-2">
                        <Checkbox
                          id={`tool-${index}`}
                          checked={selectedTools.includes(tool.name)}
                          onCheckedChange={(checked) =>
                            handleToolToggle(tool.name, checked as boolean)
                          }
                        />
                        <label
                          htmlFor={`tool-${index}`}
                          className="flex items-center space-x-2 cursor-pointer flex-1"
                        >
                          <h4 className="text-sm font-medium">{tool.name}</h4>
                          <Badge variant="outline">工具</Badge>
                        </label>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2 ml-6">
                        {tool.description}
                      </p>
                      <details className="ml-6">
                        <summary className="text-xs text-blue-600 cursor-pointer hover:text-blue-800">
                          参数 Schema
                        </summary>
                        <pre className="text-xs bg-gray-50 p-2 rounded mt-1 overflow-auto max-h-32">
                          {JSON.stringify(tool.inputSchema, null, 2)}
                        </pre>
                      </details>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="flex items-center justify-center h-32 text-muted-foreground">
                {steps.find((s) => s.id === "tools")?.status === "loading" ? (
                  <div className="flex items-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>正在获取工具列表...</span>
                  </div>
                ) : (
                  <span>暂无可用工具</span>
                )}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {tools.length > 0 && (
              <span>
                已选择 {selectedTools.length} / {tools.length} 个工具
              </span>
            )}
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={onClose}>
              取消
            </Button>
            <Button
              onClick={handleImportTools}
              disabled={!allStepsCompleted || !hasSelectedTools}
            >
              导入工具
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function MCPServersDropdownList() {
  const { chatStore, setChatStore } = useContext(AppChatStoreContext);
  const { templateMCPServers } = useContext(AppContext);
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [handshakeDialogOpen, setHandshakeDialogOpen] = useState(false);
  const [selectedServerForHandshake, setSelectedServerForHandshake] = useState<{
    serverName: string;
    templateName: string;
    config: any;
  } | null>(null);

  // 计算已连接的 MCP 服务器数量
  const connectedServersCount =
    chatStore.mcpConnections?.filter((conn) => conn.connected).length || 0;

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

  const isServerConnected = (serverName: string) => {
    return (
      chatStore.mcpConnections?.some(
        (conn) => conn.serverName === serverName && conn.connected
      ) || false
    );
  };

  const handleMCPServerToggle = (
    serverName: string,
    checked: boolean,
    serverInfo?: any
  ) => {
    if (checked && serverInfo) {
      // 当勾选时，显示握手弹窗
      setSelectedServerForHandshake({
        serverName,
        templateName: serverInfo.templateName,
        config: serverInfo.config,
      });
      setHandshakeDialogOpen(true);
    } else {
      // 取消勾选时，断开连接并更新状态
      const updatedConnections = (chatStore.mcpConnections || []).map((conn) =>
        conn.serverName === serverName ? { ...conn, connected: false } : conn
      );

      const updatedChatStore = {
        ...chatStore,
        mcpConnections: updatedConnections,
      };
      setChatStore(updatedChatStore);

      toast({
        title: "MCP Server 已断开",
        description: `${serverName} 连接已断开`,
      });
    }
  };

  const handleHandshakeComplete = (connection: MCPServerConnection) => {
    const existingConnections = chatStore.mcpConnections || [];

    // 检查是否已存在同名连接，如果存在则更新，否则添加新连接
    const existingIndex = existingConnections.findIndex(
      (conn) => conn.serverName === connection.serverName
    );

    let updatedConnections: MCPServerConnection[];
    if (existingIndex >= 0) {
      updatedConnections = [...existingConnections];
      updatedConnections[existingIndex] = connection;
    } else {
      updatedConnections = [...existingConnections, connection];
    }

    const updatedChatStore = {
      ...chatStore,
      mcpConnections: updatedConnections,
    };
    setChatStore(updatedChatStore);

    toast({
      title: "MCP Server 连接成功",
      description: `${connection.serverName} 已成功连接，获取到 ${connection.tools.length} 个工具`,
    });
  };

  const handleClearAll = () => {
    // 断开所有连接
    const updatedConnections = (chatStore.mcpConnections || []).map((conn) => ({
      ...conn,
      connected: false,
    }));

    const updatedChatStore = {
      ...chatStore,
      mcpConnections: updatedConnections,
      selectedMCPServers: [],
    };
    setChatStore(updatedChatStore);

    toast({
      title: "所有 MCP 连接已清除",
      description: "所有 MCP 服务器连接已断开",
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
            {connectedServersCount > 0 ? (
              <>已连接 {connectedServersCount} 个服务器</>
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
                {connectedServersCount > 0 && (
                  <CommandItem
                    key="clear-all"
                    onSelect={handleClearAll}
                    className="text-red-600"
                  >
                    <BrushIcon className="mr-2 h-4 w-4" />
                    断开所有连接
                  </CommandItem>
                )}
                {allMCPServers.map((server, index) => {
                  const isConnected = isServerConnected(server.serverName);
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
                        checked={isConnected}
                        onCheckedChange={(checked) =>
                          handleMCPServerToggle(
                            server.serverName,
                            checked as boolean,
                            server
                          )
                        }
                      />
                      <div className="flex flex-col">
                        <label
                          htmlFor={`mcp-server-${index}`}
                          className="text-sm font-medium cursor-pointer flex items-center space-x-2"
                        >
                          <span>{server.serverName}</span>
                          {isConnected && (
                            <Badge variant="default" className="text-xs">
                              已连接
                            </Badge>
                          )}
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

      <MCPHandshakeDialog
        isOpen={handshakeDialogOpen}
        onClose={() => {
          setHandshakeDialogOpen(false);
          setSelectedServerForHandshake(null);
        }}
        serverName={selectedServerForHandshake?.serverName || ""}
        templateName={selectedServerForHandshake?.templateName || ""}
        serverConfig={selectedServerForHandshake?.config || {}}
        onHandshakeComplete={handleHandshakeComplete}
      />
    </div>
  );
}
