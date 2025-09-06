import { useState, useContext } from "react";
import { ChatStoreMessage } from "@/types/chatstore";
import { AppChatStoreContext } from "@/pages/App";
import { useMCPToolExecution } from "./useMCPToolExecution";

export interface MCPConfirmationHook {
  mcpConfirmOpen: boolean;
  pendingMcpMessage: ChatStoreMessage | null;
  showMCPConfirmation: (message: ChatStoreMessage) => void;
  handleMcpConfirm: () => Promise<void>;
  handleMcpCancel: () => void;
}

export function useMCPConfirmation(): MCPConfirmationHook {
  const { chatStore } = useContext(AppChatStoreContext);
  const { executeMCPTools } = useMCPToolExecution();
  const [mcpConfirmOpen, setMcpConfirmOpen] = useState(false);
  const [pendingMcpMessage, setPendingMcpMessage] =
    useState<ChatStoreMessage | null>(null);

  const showMCPConfirmation = (message: ChatStoreMessage) => {
    setPendingMcpMessage(message);
    setMcpConfirmOpen(true);
  };

  const handleMcpConfirm = async () => {
    if (pendingMcpMessage) {
      const messageToExecute = pendingMcpMessage;
      setMcpConfirmOpen(false);
      setPendingMcpMessage(null);

      const shouldRegenerate = await executeMCPTools(messageToExecute);
      if (shouldRegenerate) {
        console.log("MCP tools executed, regeneration may be needed");
      }
    }
  };

  const handleMcpCancel = () => {
    setMcpConfirmOpen(false);
    setPendingMcpMessage(null);
  };

  return {
    mcpConfirmOpen,
    pendingMcpMessage,
    showMCPConfirmation,
    handleMcpConfirm,
    handleMcpCancel,
  };
}
