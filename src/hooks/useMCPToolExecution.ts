import { useContext } from "react";
import { ChatStoreMessage } from "@/types/chatstore";
import { AppContext, AppChatStoreContext } from "@/pages/App";

export interface MCPToolExecutionHook {
  executeMCPTools: (assistantMessage: ChatStoreMessage) => Promise<boolean>;
}

export function useMCPToolExecution(): MCPToolExecutionHook {
  const { callingTools, setCallingTools } = useContext(AppContext);
  const { chatStore, setChatStore } = useContext(AppChatStoreContext);

  const executeMCPTools = async (
    assistantMessage: ChatStoreMessage
  ): Promise<boolean> => {
    if (
      !assistantMessage.tool_calls ||
      assistantMessage.tool_calls.length === 0
    ) {
      return false;
    }

    console.log(
      "Executing MCP tools for message with",
      assistantMessage.tool_calls.length,
      "tool calls"
    );

    const connectedServers =
      chatStore.mcpConnections?.filter((conn: any) => conn.connected) || [];
    let allToolCallsCompleted = true;

    // Set all tool calls to loading state
    const toolCallIds = assistantMessage.tool_calls
      .map((tc) => tc.id)
      .filter((id): id is string => Boolean(id));
    const loadingState = toolCallIds.reduce(
      (acc, id) => ({ ...acc, [id as string]: true }),
      {}
    );
    setCallingTools((prev: { [key: string]: boolean }) => ({
      ...prev,
      ...loadingState,
    }));

    for (const toolCall of assistantMessage.tool_calls) {
      const toolName = toolCall.function.name;
      const toolId = toolCall.id;

      if (!toolId) {
        console.warn("Tool call ID is missing for tool:", toolName);
        allToolCallsCompleted = false;
        continue;
      }

      // Find the corresponding tool in MCP connections
      let foundConnection = null;
      let foundTool = null;

      for (const connection of connectedServers) {
        const tool = connection.tools.find((t: any) => t.name === toolName);
        if (tool) {
          foundConnection = connection;
          foundTool = tool;
          break;
        }
      }

      if (!foundConnection || !foundTool) {
        console.warn(`MCP tool not found: "${toolName}"`);
        allToolCallsCompleted = false;
        continue;
      }

      try {
        // Parse tool arguments
        let toolArguments;
        try {
          toolArguments = JSON.parse(toolCall.function.arguments);
        } catch (e) {
          console.warn(
            "Tool arguments is not valid JSON:",
            toolCall.function.arguments
          );
          allToolCallsCompleted = false;
          continue;
        }

        // Build MCP tools/call request
        const mcpRequest = {
          method: "tools/call",
          params: {
            name: toolName,
            arguments: toolArguments,
          },
          id: Date.now(), // Use timestamp as request ID
          jsonrpc: "2.0",
        };

        console.log("Calling MCP tool:", mcpRequest);

        // Send MCP tool call request
        const response = await fetch(foundConnection.config.url, {
          method: "POST",
          headers: {
            Accept: "application/json, text/event-stream",
            "Content-Type": "application/json; charset=utf-8",
            "Mcp-Session-Id": foundConnection.sessionId,
          },
          body: JSON.stringify(mcpRequest),
        });

        if (!response.ok) {
          console.error(
            `MCP tool call failed: ${response.status} ${response.statusText}`
          );
          allToolCallsCompleted = false;
          continue;
        }

        // Parse response
        const responseText = await response.text();
        let mcpResult;

        if (responseText.includes("data: ")) {
          // Parse SSE format
          const lines = responseText.split("\n");
          const dataLine = lines.find((line) => line.startsWith("data: "));
          if (dataLine) {
            const jsonData = dataLine.substring(6);
            mcpResult = JSON.parse(jsonData);
          }
        } else {
          // Regular JSON response
          mcpResult = JSON.parse(responseText);
        }

        console.log("MCP tool result:", mcpResult);

        // Extract result content
        const resultContent = mcpResult?.result?.content;
        let outputText = "";

        if (Array.isArray(resultContent)) {
          outputText = resultContent
            .filter((item) => item.type === "text")
            .map((item) => item.text)
            .join("\n");
        } else if (typeof resultContent === "string") {
          outputText = resultContent;
        } else {
          outputText = JSON.stringify(resultContent);
        }

        // Add tool call result message
        const functionCallOutputMessage: ChatStoreMessage = {
          role: "tool",
          content: outputText,
          tool_call_id: toolId,
          hide: false,
          token: outputText.length / 4, // Estimate token count
          example: false,
          audio: null,
          logprobs: null,
          response_model_name: null,
          reasoning_content: null,
          usage: null,
        };

        // Update chat history
        chatStore.history.push(functionCallOutputMessage);
        chatStore.totalTokens += functionCallOutputMessage.token;

        console.log(`Called MCP tool "${toolName}" successfully`);
      } catch (error) {
        console.error("MCP tool call error:", error);
        allToolCallsCompleted = false;
      }
    }

    // Clear loading states for all tool calls
    const clearingState = toolCallIds.reduce(
      (acc, id) => ({ ...acc, [id as string]: false }),
      {}
    );
    setCallingTools((prev: { [key: string]: boolean }) => ({
      ...prev,
      ...clearingState,
    }));

    if (allToolCallsCompleted && assistantMessage.tool_calls.length > 0) {
      setChatStore({ ...chatStore });
      return true; // Signal that we should regenerate
    }

    return false;
  };

  return {
    executeMCPTools,
  };
}
