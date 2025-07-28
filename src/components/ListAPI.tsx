import React, { useContext, useState, useRef } from "react";
import {
  ChatStore,
  TemplateAPI,
  TemplateChatStore,
  TemplateTools,
  MCPServerConnection,
} from "@/types/chatstore";
import { Tr } from "@/translate";
import Editor from "@monaco-editor/react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AppChatStoreContext, AppContext } from "@/pages/App";
import {
  NavigationMenu,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";
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
import {
  BrushIcon,
  DeleteIcon,
  EditIcon,
  InfoIcon,
  WrenchIcon,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

import { useToast } from "@/hooks/use-toast";
import { newChatStore } from "@/types/newChatstore";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "./ui/dialog";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { SetAPIsTemplate } from "./setAPIsTemplate";
import { isVailedJSON } from "@/utils/isVailedJSON";
import { toast } from "sonner";
import { ConfirmationDialog } from "./ui/confirmation-dialog";
import { MCPServersDropdownList } from "./MCPServersDropdown";
import { Badge } from "./ui/badge";
import { ScrollArea } from "./ui/scroll-area";

interface APITemplateDropdownProps {
  label: string;
  shortLabel: string;
  apiField: string;
  keyField: string;
}

interface EditTemplateDialogProps {
  template: TemplateAPI;
  onSave: (updatedTemplate: TemplateAPI) => void;
  onClose: () => void;
}

function EditTemplateDialog({
  template,
  onSave,
  onClose,
}: EditTemplateDialogProps) {
  const [name, setName] = useState(template.name);
  const [endpoint, setEndpoint] = useState(template.endpoint);
  const [key, setKey] = useState(template.key);
  const { toast } = useToast();

  const handleSave = () => {
    if (!name.trim()) {
      toast({
        title: "Error",
        description: "Template name cannot be empty",
        variant: "destructive",
      });
      return;
    }

    onSave({
      ...template,
      name: name.trim(),
      endpoint: endpoint.trim(),
      key: key.trim(),
    });
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Template</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Template Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="endpoint">API Endpoint</Label>
            <Input
              id="endpoint"
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="key">API Key</Label>
            <Input
              id="key"
              value={key}
              onChange={(e) => setKey(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function APIsDropdownList({
  label,
  shortLabel,
  apiField,
  keyField,
}: APITemplateDropdownProps) {
  const { chatStore, setChatStore } = useContext(AppChatStoreContext);
  const {
    templates,
    templateAPIs,
    templateAPIsImageGen,
    templateAPIsTTS,
    templateAPIsWhisper,
    setTemplates,
    setTemplateAPIs,
    setTemplateAPIsImageGen,
    setTemplateAPIsTTS,
    setTemplateAPIsWhisper,
    setTemplateTools,
  } = useContext(AppContext);
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TemplateAPI | null>(
    null
  );
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<TemplateAPI | null>(
    null
  );

  let API = templateAPIs;
  let setAPI = setTemplateAPIs;
  if (label === "Chat API") {
    API = templateAPIs;
    setAPI = setTemplateAPIs;
  } else if (label === "Whisper API") {
    API = templateAPIsWhisper;
    setAPI = setTemplateAPIsWhisper;
  } else if (label === "TTS API") {
    API = templateAPIsTTS;
    setAPI = setTemplateAPIsTTS;
  } else if (label === "Image Gen API") {
    API = templateAPIsImageGen;
    setAPI = setTemplateAPIsImageGen;
  }

  const handleEdit = (template: TemplateAPI) => {
    setEditingTemplate(template);
  };

  const handleSave = (updatedTemplate: TemplateAPI) => {
    const index = API.findIndex((t) => t.name === updatedTemplate.name);
    if (index !== -1) {
      const newAPI = [...API];
      newAPI[index] = updatedTemplate;
      setAPI(newAPI);
      toast({
        title: "Success",
        description: "Template updated successfully",
      });
    }
  };

  const handleDelete = (template: TemplateAPI) => {
    setTemplateToDelete(template);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (templateToDelete) {
      const newAPI = API.filter((t) => t.name !== templateToDelete.name);
      setAPI(newAPI);
      toast({
        title: "Success",
        description: "Template deleted successfully",
      });
    }
  };

  return (
    <div className="flex items-center space-x-4 mx-3">
      <p className="text-sm text-muted-foreground">
        <Tr>{label}</Tr>
      </p>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-[150px] justify-start">
            {API.find(
              (t: TemplateAPI) =>
                chatStore[apiField as keyof ChatStore] === t.endpoint &&
                chatStore[keyField as keyof ChatStore] === t.key
            )?.name || `+ ${shortLabel}`}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0" side="bottom" align="start">
          <Command>
            <CommandInput placeholder="Search template..." />
            <CommandList>
              <CommandEmpty>
                <Tr>No results found.</Tr>
              </CommandEmpty>
              <CommandGroup>
                {API.map((t: TemplateAPI, index: number) => (
                  <CommandItem
                    key={index}
                    value={t.name}
                    onSelect={() => {
                      setChatStore({
                        ...chatStore,
                        [apiField]: t.endpoint,
                        [keyField]: t.key,
                      });
                      setOpen(false);
                    }}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span>{t.name}</span>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(t);
                          }}
                        >
                          <EditIcon className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(t);
                          }}
                        >
                          <DeleteIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {editingTemplate && (
        <EditTemplateDialog
          template={editingTemplate}
          onSave={handleSave}
          onClose={() => setEditingTemplate(null)}
        />
      )}
      <ConfirmationDialog
        isOpen={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setTemplateToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Delete Template"
        description={`Are you sure you want to delete "${templateToDelete?.name}"?`}
      />
    </div>
  );
}

function ToolsDropdownList() {
  const { chatStore, setChatStore } = useContext(AppChatStoreContext);
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);

  const ctx = useContext(AppContext);

  return (
    <div className="flex items-center space-x-4 mx-3">
      <p className="text-sm text-muted-foreground">
        <Tr>Tools</Tr>
      </p>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-[150px] justify-start">
            {chatStore.toolsString ? (
              <>
                {
                  ctx.templateTools.find(
                    (t) => t.toolsString === chatStore.toolsString
                  )?.name
                }
              </>
            ) : (
              <>
                + <Tr>Set tools</Tr>
              </>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0" side="bottom" align="start">
          <Command>
            <CommandInput placeholder="You can search..." />
            <CommandList>
              <CommandEmpty>
                <Tr>No results found.</Tr>
              </CommandEmpty>
              <CommandGroup>
                {chatStore.toolsString && (
                  <CommandItem
                    key={-1}
                    value=""
                    onSelect={() => {
                      chatStore.toolsString = "";
                      setChatStore({ ...chatStore });
                      toast({
                        title: "Tools Cleaned",
                        description: "Tools cleaned successfully",
                      });
                      setOpen(false);
                    }}
                  >
                    <BrushIcon /> <Tr>Clear tools</Tr>
                  </CommandItem>
                )}
                {ctx.templateTools.map((t: TemplateTools, index: number) => (
                  <CommandItem
                    key={index}
                    value={t.toolsString}
                    onSelect={(value) => {
                      chatStore.toolsString = value;
                      setChatStore({ ...chatStore });
                    }}
                  >
                    {t.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

interface EditChatTemplateDialogProps {
  template: TemplateChatStore;
  onSave: (updatedTemplate: TemplateChatStore) => void;
  onClose: () => void;
}

function EditChatTemplateDialog({
  template,
  onSave,
  onClose,
}: EditChatTemplateDialogProps) {
  const [name, setName] = useState(template.name);
  const [jsonContent, setJsonContent] = useState(() => {
    const { name: _, ...rest } = template;
    return JSON.stringify(rest, null, 2);
  });
  const [editor, setEditor] = useState<any>(null);

  const handleEditorDidMount = (editor: any) => {
    setEditor(editor);
  };

  const handleFormat = () => {
    if (editor) {
      editor.getAction("editor.action.formatDocument").run();
    }
  };

  const handleSave = () => {
    if (!name.trim()) {
      toast.error("Template name cannot be empty");
      return;
    }

    try {
      const parsedJson = JSON.parse(jsonContent);
      const updatedTemplate: TemplateChatStore = {
        name: name.trim(),
        ...parsedJson,
      };
      onSave(updatedTemplate);
      toast.success("Template updated successfully");
    } catch (error) {
      toast.error("Invalid JSON format");
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Edit Template</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Template Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter template name"
            />
          </div>
          <div>
            <Label>Template Content (JSON)</Label>
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                className="absolute right-2 top-2 z-10"
                onClick={handleFormat}
              >
                Format JSON
              </Button>
              <div className="h-[400px] border rounded-md">
                <Editor
                  height="400px"
                  defaultLanguage="json"
                  value={jsonContent}
                  onChange={(value) => setJsonContent(value || "")}
                  onMount={handleEditorDidMount}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    lineNumbers: "on",
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    tabSize: 2,
                    wordWrap: "on",
                  }}
                />
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ChatTemplateDropdownList() {
  const ctx = useContext(AppContext);
  const { chatStore, setChatStore } = useContext(AppChatStoreContext);
  const { templates, setTemplates } = useContext(AppContext);
  const [open, setOpen] = React.useState(false);
  const [editingTemplate, setEditingTemplate] =
    useState<TemplateChatStore | null>(null);
  const { toast } = useToast();
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [templateToApply, setTemplateToApply] =
    useState<TemplateChatStore | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] =
    useState<TemplateChatStore | null>(null);

  const handleEdit = (template: TemplateChatStore) => {
    setEditingTemplate(template);
  };

  const handleSave = (updatedTemplate: TemplateChatStore) => {
    const index = templates.findIndex((t) => t.name === updatedTemplate.name);
    if (index !== -1) {
      const newTemplates = [...templates];
      newTemplates[index] = updatedTemplate;
      setTemplates(newTemplates);
      toast({
        title: "Success",
        description: "Template updated successfully",
      });
    }
  };

  const handleDelete = (template: TemplateChatStore) => {
    setTemplateToDelete(template);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (templateToDelete) {
      const newTemplates = templates.filter(
        (t) => t.name !== templateToDelete.name
      );
      setTemplates(newTemplates);
      toast({
        title: "Success",
        description: "Template deleted successfully",
      });
    }
  };

  const handleTemplateSelect = (template: TemplateChatStore) => {
    if (chatStore.history.length > 0 || chatStore.systemMessageContent) {
      setTemplateToApply(template);
      setConfirmDialogOpen(true);
    } else {
      applyTemplate(template);
    }
  };

  const applyTemplate = (template: TemplateChatStore) => {
    setChatStore({
      ...newChatStore({
        ...chatStore,
        ...{
          use_this_history: template.history ?? chatStore.history,
        },
        ...template,
      }),
    });
    setOpen(false);
  };

  return (
    <div className="flex items-center space-x-4 mx-3">
      <p className="text-sm text-muted-foreground">
        <Tr>Chat Template</Tr>
      </p>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-[150px] justify-start">
            <Tr>Select Template</Tr>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0" side="bottom" align="start">
          <Command>
            <CommandInput placeholder="Search template..." />
            <CommandList>
              <CommandEmpty>
                <Tr>No results found.</Tr>
              </CommandEmpty>
              <CommandGroup>
                {templates.map((t: TemplateChatStore, index: number) => (
                  <CommandItem
                    key={index}
                    value={t.name}
                    onSelect={() => handleTemplateSelect(structuredClone(t))}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span>{t.name}</span>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(t);
                          }}
                        >
                          <EditIcon className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(t);
                          }}
                        >
                          <DeleteIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {editingTemplate && (
        <EditChatTemplateDialog
          template={editingTemplate}
          onSave={handleSave}
          onClose={() => setEditingTemplate(null)}
        />
      )}
      <ConfirmationDialog
        isOpen={confirmDialogOpen}
        onClose={() => {
          setConfirmDialogOpen(false);
          setTemplateToApply(null);
        }}
        onConfirm={() => templateToApply && applyTemplate(templateToApply)}
        title="Replace Chat History"
        description="This will replace the current chat history. Are you sure?"
      />
      <ConfirmationDialog
        isOpen={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setTemplateToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Delete Template"
        description={`Are you sure you want to delete "${templateToDelete?.name}"?`}
      />
    </div>
  );
}

function ConnectedMCPServersInfo() {
  const { chatStore } = useContext(AppChatStoreContext);
  const [infoDialogOpen, setInfoDialogOpen] = useState(false);
  const [selectedConnection, setSelectedConnection] =
    useState<MCPServerConnection | null>(null);

  const connectedServers =
    chatStore.mcpConnections?.filter((conn) => conn.connected) || [];

  if (connectedServers.length === 0) {
    return null;
  }

  const handleShowInfo = (connection: MCPServerConnection) => {
    setSelectedConnection(connection);
    setInfoDialogOpen(true);
  };

  const totalTools = connectedServers.reduce(
    (sum, conn) => sum + conn.tools.length,
    0
  );

  return (
    <div className="flex items-center space-x-4 mx-3">
      <p className="text-sm text-muted-foreground">已连接 MCP</p>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-[200px] justify-start">
            <WrenchIcon className="w-4 h-4 mr-2" />
            {connectedServers.length} 服务器 / {totalTools} 工具
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0" side="bottom" align="start">
          <Command>
            <CommandInput placeholder="搜索已连接的服务器..." />
            <CommandList>
              <CommandEmpty>没有找到匹配的服务器</CommandEmpty>
              <CommandGroup>
                {connectedServers.map((connection, index) => (
                  <CommandItem
                    key={index}
                    onSelect={() => handleShowInfo(connection)}
                    className="flex items-center justify-between"
                  >
                    <div className="flex flex-col">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium">
                          {connection.serverName}
                        </span>
                        <Badge variant="default" className="text-xs">
                          {connection.tools.length} 工具
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        来自: {connection.templateName}
                      </span>
                    </div>
                    <InfoIcon className="h-4 w-4 text-blue-500" />
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedConnection && (
        <Dialog open={infoDialogOpen} onOpenChange={setInfoDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>
                MCP Server 详情: {selectedConnection.serverName}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {/* 连接信息 */}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="text-sm font-medium text-blue-900 mb-2">
                  连接信息
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs text-blue-700">
                  <div>
                    服务器:{" "}
                    <code className="bg-blue-100 px-1 rounded">
                      {selectedConnection.config.url}
                    </code>
                  </div>
                  <div>
                    模板:{" "}
                    <code className="bg-blue-100 px-1 rounded">
                      {selectedConnection.templateName}
                    </code>
                  </div>
                  <div>
                    Session ID:{" "}
                    <code className="bg-blue-100 px-1 rounded">
                      {selectedConnection.sessionId}
                    </code>
                  </div>
                  <div>
                    连接时间:{" "}
                    <code className="bg-blue-100 px-1 rounded">
                      {new Date(
                        selectedConnection.connectedAt
                      ).toLocaleString()}
                    </code>
                  </div>
                </div>
              </div>

              {/* 工具列表 */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium">
                  可用工具 ({selectedConnection.tools.length})
                </h4>
                {selectedConnection.tools.length > 0 ? (
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-3">
                      {selectedConnection.tools.map((tool, index) => (
                        <div key={index} className="p-3 border rounded-lg">
                          <div className="flex items-center space-x-2 mb-2">
                            <h5 className="text-sm font-medium">{tool.name}</h5>
                            <Badge variant="outline">工具</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {tool.description}
                          </p>
                          <details>
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
                  <div className="text-center py-8 text-muted-foreground">
                    该服务器未提供任何工具
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button onClick={() => setInfoDialogOpen(false)}>关闭</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

const APIListMenu: React.FC = () => {
  const ctx = useContext(AppContext);
  return (
    <div className="flex flex-col my-2 gap-2 w-full">
      {ctx.templateTools.length > 0 && <ToolsDropdownList />}
      {ctx.templateMCPServers.length > 0 && <MCPServersDropdownList />}
      <ConnectedMCPServersInfo />
      {ctx.templates.length > 0 && <ChatTemplateDropdownList />}
      {ctx.templateAPIs.length > 0 && (
        <APIsDropdownList
          label="Chat API"
          shortLabel="Chat"
          apiField="apiEndpoint"
          keyField="apiKey"
        />
      )}
      {ctx.templateAPIsWhisper.length > 0 && (
        <APIsDropdownList
          label="Whisper API"
          shortLabel="Whisper"
          apiField="whisper_api"
          keyField="whisper_key"
        />
      )}
      {ctx.templateAPIsTTS.length > 0 && (
        <APIsDropdownList
          label="TTS API"
          shortLabel="TTS"
          apiField="tts_api"
          keyField="tts_key"
        />
      )}
      {ctx.templateAPIsImageGen.length > 0 && (
        <APIsDropdownList
          label="Image Gen API"
          shortLabel="ImgGen"
          apiField="image_gen_api"
          keyField="image_gen_key"
        />
      )}
    </div>
  );
};

export default APIListMenu;
