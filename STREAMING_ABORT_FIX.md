# 流式处理停止生成功能修复

## 问题描述

在流式处理过程中，当用户点击"Stop Generating"按钮时，后台请求没有正确被中止，导致服务器继续处理请求。

## 根本原因分析

通过代码分析发现，问题出现在 `useMessageCompletion` hook 中的 AbortController 管理不当：

1. **Chatbox.tsx (第73行)**：创建了新的 AbortController 并存储在 `abortControllerRef.current`
2. **useMessageCompletion.ts (第640行)**：在 `complete` 函数内部又创建了一个新的 AbortController，覆盖了外部传递的
3. **核心问题**：`useMessageCompletion` 创建的 AbortController 没有暴露给外部调用者，导致点击停止按钮时无法正确中止正在进行的请求

## 修复方案

### 1. 修改 MessageCompletionHook 接口

```typescript
export interface MessageCompletionHook {
  completeWithStreamMode: (
    response: Response,
    signal: AbortSignal,
    setGeneratingMessage?: (message: string) => void
  ) => Promise<ChatStoreMessage>;
  completeWithFetchMode: (response: Response) => Promise<ChatStoreMessage>;
  complete: (
    onMCPToolCall?: (message: ChatStoreMessage) => void,
    setGeneratingMessage?: (message: string) => void,
    abortSignal?: AbortSignal  // 新增：接受外部 AbortSignal
  ) => Promise<void>;
}
```

### 2. 修改 complete 函数实现

```typescript
const complete = async (
  onMCPToolCall?: (message: ChatStoreMessage) => void,
  setGeneratingMessage?: (message: string) => void,
  abortSignal?: AbortSignal
) => {
  try {
    let signal: AbortSignal;
    let abortController: AbortController | null = null;

    if (abortSignal) {
      // 使用外部传入的 AbortSignal
      signal = abortSignal;
    } else {
      // 创建新的 AbortController（向后兼容）
      abortController = new AbortController();
      signal = abortController.signal;
    }

    // 超时处理只对内部创建的 AbortController
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    if (abortController) {
      timeoutId = setTimeout(() => {
        abortController!.abort();
      }, 120000); // 2分钟超时
    }

    const response = await client._fetch(
      chatStore.streamMode,
      chatStore.logprobs,
      signal
    );

    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }

    // ... 其余处理逻辑
  }
};
```

### 3. 修改 Chatbox.tsx 中的调用

```typescript
const handleComplete = async () => {
  try {
    setShowGenerating(true);
    abortControllerRef.current = new AbortController();

    await complete(
      (message) => {
        showMCPConfirmation(message);
      }, 
      setGeneratingMessage, 
      abortControllerRef.current.signal  // 传递 AbortSignal
    );

    setShowRetry(false);
  } catch (error: any) {
    if (error.name === "AbortError") {
      console.log("abort complete");
      return;
    }
    setShowRetry(true);
    alert(error);
  } finally {
    setShowGenerating(false);
    setSelectedChatIndex(selectedChatIndex);
  }
};
```

## 修复效果

1. **正确的信号传递**：外部创建的 AbortController 现在能正确传递到底层的网络请求和流式处理逻辑
2. **有效的中断机制**：当用户点击"Stop Generating"按钮时，`abortControllerRef.current.abort()` 能正确中止：
   - HTTP 请求（通过 fetch 的 signal 参数）
   - 流式响应处理（通过 processStreamResponse 的 signal 检查）
3. **向后兼容**：保持了原有的 API 兼容性，如果外部不传入 AbortSignal，会创建内部的 AbortController

## 测试验证

修复后的代码通过了：
- TypeScript 类型检查 (`npm run typecheck`)
- 项目构建 (`npm run build`)
- 保持了原有功能的完整性

## 相关文件

- `/src/hooks/useMessageCompletion.ts` - 主要修复文件
- `/src/pages/Chatbox.tsx` - 调用修改
- `/src/chatgpt.ts` - 底层流式处理逻辑（已有正确的 signal 检查）

这个修复确保了流式处理过程中用户点击停止按钮时，后台请求能被正确中止，解决了资源浪费和用户体验问题。