import { ChatStore } from "@/types/chatstore";

export function BuildFiledForSearch(chatStore: ChatStore): string[] {
  const contents_for_index: string[] = [];

  if (chatStore.systemMessageContent.trim()) {
    contents_for_index.push(chatStore.systemMessageContent.trim());
  }

  for (const msg of chatStore.history) {
    if (typeof msg.content === "string") {
      contents_for_index.push(msg.content);
      continue;
    }

    for (const chunk of msg.content) {
      if (chunk.type === "text") {
        const text = chunk.text;
        if (text?.trim()) {
          contents_for_index.push(text);
        }
      }
    }
  }

  return contents_for_index;
}
