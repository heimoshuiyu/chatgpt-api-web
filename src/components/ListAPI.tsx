import React, { useContext, useState, useRef } from "react";
import {
  ChatStore,
  TemplateAPI,
  TemplateChatStore,
  TemplateTools,
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
import { BrushIcon, DeleteIcon, EditIcon } from "lucide-react";

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
import { toast } from 'sonner';
import { ConfirmationDialog } from "./ui/confirmation-dialog";

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

function EditTemplateDialog({ template, onSave, onClose }: EditTemplateDialogProps) {
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
  const [editingTemplate, setEditingTemplate] = useState<TemplateAPI | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<TemplateAPI | null>(null);

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
    const index = API.findIndex(t => t.name === updatedTemplate.name);
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
      const newAPI = API.filter(t => t.name !== templateToDelete.name);
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

function EditChatTemplateDialog({ template, onSave, onClose }: EditChatTemplateDialogProps) {
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
      editor.getAction('editor.action.formatDocument').run();
    }
  };

  const handleSave = () => {
    if (!name.trim()) {
      toast.error('Template name cannot be empty');
      return;
    }

    try {
      const parsedJson = JSON.parse(jsonContent);
      const updatedTemplate: TemplateChatStore = {
        name: name.trim(),
        ...parsedJson
      };
      onSave(updatedTemplate);
      toast.success('Template updated successfully');
    } catch (error) {
      toast.error('Invalid JSON format');
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
                  onChange={(value) => setJsonContent(value || '')}
                  onMount={handleEditorDidMount}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    lineNumbers: 'on',
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    tabSize: 2,
                    wordWrap: 'on'
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
  const [editingTemplate, setEditingTemplate] = useState<TemplateChatStore | null>(null);
  const { toast } = useToast();
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [templateToApply, setTemplateToApply] = useState<TemplateChatStore | null>(null);

  const handleEdit = (template: TemplateChatStore) => {
    setEditingTemplate(template);
  };

  const handleSave = (updatedTemplate: TemplateChatStore) => {
    const index = templates.findIndex(t => t.name === updatedTemplate.name);
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
    setTemplateToApply(template);
    setConfirmDialogOpen(true);
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
                    onSelect={() => handleTemplateSelect(t)}
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
    </div>
  );
}

const APIListMenu: React.FC = () => {
  const ctx = useContext(AppContext);
  return (
    <div className="flex flex-col my-2 gap-2 w-full">
      {ctx.templateTools.length > 0 && <ToolsDropdownList />}
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
