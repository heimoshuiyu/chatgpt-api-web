import { createContext, useCallback } from "react";
import {
  TemplateChatStore,
  TemplateAPI,
  TemplateTools,
  TemplateMCPServer,
} from "../types/chatstore";
import {
  STORAGE_NAME_TEMPLATE,
  STORAGE_NAME_TEMPLATE_API,
  STORAGE_NAME_TEMPLATE_API_IMAGE_GEN,
  STORAGE_NAME_TEMPLATE_API_TTS,
  STORAGE_NAME_TEMPLATE_API_WHISPER,
  STORAGE_NAME_TEMPLATE_TOOLS,
  STORAGE_NAME_TEMPLATE_MCP_SERVERS,
} from "@/const";

interface TemplateContextType {
  templates: TemplateChatStore[];
  setTemplates: (t: TemplateChatStore[]) => void;
  templateAPIs: TemplateAPI[];
  setTemplateAPIs: (t: TemplateAPI[]) => void;
  templateAPIsWhisper: TemplateAPI[];
  setTemplateAPIsWhisper: (t: TemplateAPI[]) => void;
  templateAPIsTTS: TemplateAPI[];
  setTemplateAPIsTTS: (t: TemplateAPI[]) => void;
  templateAPIsImageGen: TemplateAPI[];
  setTemplateAPIsImageGen: (t: TemplateAPI[]) => void;
  templateTools: TemplateTools[];
  setTemplateTools: (t: TemplateTools[]) => void;
  templateMCPServers: TemplateMCPServer[];
  setTemplateMCPServers: (t: TemplateMCPServer[]) => void;
}

const TemplateContext = createContext<TemplateContextType | null>(null);

export const useLocalStorage = <T,>(key: string, defaultValue: T) => {
  const getStoredValue = useCallback((): T => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return defaultValue;
    }
  }, [key, defaultValue]);

  const setStoredValue = useCallback((value: T) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  }, [key]);

  return { getStoredValue, setStoredValue };
};

export { TemplateContext };