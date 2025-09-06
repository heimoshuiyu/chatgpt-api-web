import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tr } from "@/translate";
import { ChatStoreMessage } from "@/types/chatstore";

interface MCPConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pendingMcpMessage: ChatStoreMessage | null;
  chatStore: {
    mcpConnections?: Array<{
      connected: boolean;
      tools: Array<{
        name: string;
      }>;
    }>;
  };
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

export function MCPConfirmationDialog({
  open,
  onOpenChange,
  pendingMcpMessage,
  chatStore,
  onConfirm,
  onCancel,
}: MCPConfirmationDialogProps) {
  const renderMcpTools = () => {
    if (!pendingMcpMessage?.tool_calls) return null;

    const mcpTools = pendingMcpMessage.tool_calls
      .map((toolCall, index) => {
        const connectedServers =
          chatStore.mcpConnections?.filter((conn) => conn.connected) || [];
        const isMcpTool = connectedServers.some((connection) =>
          connection.tools.some((tool) => tool.name === toolCall.function.name)
        );

        if (!isMcpTool) {
          console.warn(
            `Tool ${toolCall.function.name} is not an MCP tool, skipping from confirmation dialog`
          );
          return null;
        }

        return (
          <div key={index} className="p-2 border rounded-lg bg-gray-50">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-xs">
                MCP Tool
              </Badge>
              <span className="font-medium text-sm">
                {toolCall.function.name}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Arguments: {toolCall.function.arguments}
            </p>
          </div>
        );
      })
      .filter(Boolean);

    if (mcpTools.length === 0) {
      return (
        <div className="p-2 border rounded-lg bg-yellow-50 border-yellow-200">
          <p className="text-sm text-yellow-800">
            <Tr>No valid MCP tools found in the assistant&apos;s response.</Tr>
          </p>
        </div>
      );
    }

    return mcpTools;
  };

  const isExecuteDisabled = () => {
    if (!pendingMcpMessage?.tool_calls) return true;

    const connectedServers =
      chatStore.mcpConnections?.filter((conn) => conn.connected) || [];
    const validMcpTools = pendingMcpMessage.tool_calls.filter((toolCall) => {
      return connectedServers.some((connection) =>
        connection.tools.some((tool) => tool.name === toolCall.function.name)
      );
    });

    return validMcpTools.length === 0;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            <Tr>Confirm MCP Tool Execution</Tr>
          </DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm text-muted-foreground mb-3">
            <Tr>The assistant wants to execute the following MCP tools:</Tr>
          </p>
          <div className="space-y-2">{renderMcpTools()}</div>
          <p className="text-sm text-muted-foreground mt-3">
            <Tr>Do you want to execute these tools?</Tr>
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            <Tr>Cancel</Tr>
          </Button>
          <Button onClick={onConfirm} disabled={isExecuteDisabled()}>
            <Tr>Execute</Tr>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
