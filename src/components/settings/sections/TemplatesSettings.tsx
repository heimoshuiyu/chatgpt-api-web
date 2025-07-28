import React, { useContext, useState } from "react";
import { AppContext } from "@/pages/App";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
import { Tr } from "@/translate";
import { MCPServerShowBlock, MCPServerAddDialog } from "./MCPServerSettings";

const APIShowBlock = (props: {
  index: number;
  label: string;
  type: string;
  apiField: string;
  keyField: string;
}) => {
  const {
    templateAPIs,
    setTemplateAPIs,
    templateAPIsWhisper,
    setTemplateAPIsWhisper,
    templateAPIsTTS,
    setTemplateAPIsTTS,
    templateAPIsImageGen,
    setTemplateAPIsImageGen,
  } = useContext(AppContext);

  return (
    <div className="border-b border-gray-200 pb-4 pt-4">
      <Badge variant="outline">{props.type}</Badge> <Label>{props.label}</Label>
      <div className="mt-4">
        <div className="grid w-full max-w-sm items-center gap-1.5 mt-2">
          <Label>Endpoint</Label>
          <div className="w-72">
            <pre className="text-xs whitespace-pre-wrap">{props.apiField}</pre>
          </div>
        </div>
        <div className="grid w-full max-w-sm items-center gap-1.5 mt-2">
          <Label>Key</Label>
          {props.keyField ? (
            <div className="w-72">
              <pre className="text-xs whitespace-pre-wrap">
                {props.keyField}
              </pre>
            </div>
          ) : (
            <span className="text-gray-500 italic">empty</span>
          )}
        </div>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="mt-2 mr-2"
        onClick={() => {
          const name = prompt(`Give template ${props.label} a new name`);
          if (!name) return;
          if (props.type === "Chat") {
            templateAPIs[props.index].name = name;
            setTemplateAPIs(structuredClone(templateAPIs));
          } else if (props.type === "Whisper") {
            templateAPIsWhisper[props.index].name = name;
            setTemplateAPIsWhisper(structuredClone(templateAPIsWhisper));
          } else if (props.type === "TTS") {
            templateAPIsTTS[props.index].name = name;
            setTemplateAPIsTTS(structuredClone(templateAPIsTTS));
          } else if (props.type === "ImgGen") {
            templateAPIsImageGen[props.index].name = name;
            setTemplateAPIsImageGen(structuredClone(templateAPIsImageGen));
          }
        }}
      >
        Change Name
      </Button>
      <Button
        variant="destructive"
        size="sm"
        className="mt-2"
        onClick={() => {
          if (
            !confirm(
              `Are you sure to delete ${props.label}(${props.type}) API?`
            )
          ) {
            return;
          }
          if (props.type === "Chat") {
            templateAPIs.splice(props.index, 1);
            setTemplateAPIs(structuredClone(templateAPIs));
          } else if (props.type === "Whisper") {
            templateAPIsWhisper.splice(props.index, 1);
            setTemplateAPIsWhisper(structuredClone(templateAPIsWhisper));
          } else if (props.type === "TTS") {
            templateAPIsTTS.splice(props.index, 1);
            setTemplateAPIsTTS(structuredClone(templateAPIsTTS));
          } else if (props.type === "ImgGen") {
            templateAPIsImageGen.splice(props.index, 1);
            setTemplateAPIsImageGen(structuredClone(templateAPIsImageGen));
          }
        }}
      >
        Delete
      </Button>
    </div>
  );
};

const ToolsShowBlock = (props: {
  index: number;
  label: string;
  content: string;
}) => {
  const { templateTools, setTemplateTools } = useContext(AppContext);

  return (
    <div className="border-b border-gray-200 pb-4 pt-4">
      <Badge variant="outline">Tool</Badge> <Label>{props.label}</Label>
      <div className="mt-4">
        <div className="grid w-full max-w-sm items-center gap-1.5 mt-2">
          <Label>Content</Label>
          <ScrollArea className="w-72 whitespace-nowrap rounded-md border">
            <pre className="text-xs">
              {JSON.stringify(JSON.parse(props.content), null, 2)}
            </pre>
          </ScrollArea>
        </div>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="mt-2 mr-2"
        onClick={() => {
          const name = prompt(`Give the tool ${props.label} a new name`);
          if (!name) return;
          templateTools[props.index].name = name;
          setTemplateTools(structuredClone(templateTools));
        }}
      >
        Edit
      </Button>
      <Button
        variant="destructive"
        size="sm"
        className="mt-2"
        onClick={() => {
          if (!confirm(`Are you sure to delete ${props.label} Tool?`)) {
            return;
          }
          templateTools.splice(props.index, 1);
          setTemplateTools(structuredClone(templateTools));
        }}
      >
        Delete
      </Button>
    </div>
  );
};

export const TemplatesSettings: React.FC = () => {
  const {
    templateAPIs,
    templateAPIsWhisper,
    templateAPIsTTS,
    templateAPIsImageGen,
    templateTools,
    templateMCPServers,
  } = useContext(AppContext);

  const [mcpDialogOpen, setMcpDialogOpen] = useState(false);

  return (
    <AccordionItem value="templates">
      <AccordionTrigger>
        <Tr>Saved Template</Tr>
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

        {templateAPIs.map((template, index) => (
          <div key={index}>
            <APIShowBlock
              index={index}
              label={template.name}
              type="Chat"
              apiField={template.endpoint}
              keyField={template.key}
            />
          </div>
        ))}
        {templateAPIsWhisper.map((template, index) => (
          <div key={index}>
            <APIShowBlock
              index={index}
              label={template.name}
              type="Whisper"
              apiField={template.endpoint}
              keyField={template.key}
            />
          </div>
        ))}
        {templateAPIsTTS.map((template, index) => (
          <div key={index}>
            <APIShowBlock
              index={index}
              label={template.name}
              type="TTS"
              apiField={template.endpoint}
              keyField={template.key}
            />
          </div>
        ))}
        {templateAPIsImageGen.map((template, index) => (
          <div key={index}>
            <APIShowBlock
              index={index}
              label={template.name}
              type="ImgGen"
              apiField={template.endpoint}
              keyField={template.key}
            />
          </div>
        ))}
        {templateTools.map((template, index) => (
          <div key={index}>
            <ToolsShowBlock
              index={index}
              label={template.name}
              content={template.toolsString}
            />
          </div>
        ))}
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
