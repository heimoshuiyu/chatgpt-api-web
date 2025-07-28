import React, { useContext, useState } from "react";
import { AppContext } from "@/pages/App";
import { Button } from "@/components/ui/button";
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { Tr } from "@/translate";
import { MCPServerShowBlock, MCPServerAddDialog } from "./MCPServerSettings";

export const MCPSettings: React.FC = () => {
  const { templateMCPServers } = useContext(AppContext);
  const [mcpDialogOpen, setMcpDialogOpen] = useState(false);

  return (
    <AccordionItem value="mcp">
      <AccordionTrigger>
        <Tr>MCP Servers</Tr>
      </AccordionTrigger>
      <AccordionContent>
        <div className="mb-4">
          <Dialog open={mcpDialogOpen} onOpenChange={setMcpDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="mb-2">
                添加 MCP Server
              </Button>
            </DialogTrigger>
          </Dialog>
          <MCPServerAddDialog
            open={mcpDialogOpen}
            onOpenChange={setMcpDialogOpen}
          />
        </div>

        {templateMCPServers.map((template, index) => (
          <div key={index}>
            <MCPServerShowBlock
              index={index}
              label={template.name}
              configJson={template.configJson}
            />
          </div>
        ))}
      </AccordionContent>
    </AccordionItem>
  );
};
