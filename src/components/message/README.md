# Message Components

这个目录包含了从 `MessageBubble.tsx` 拆分出来的消息相关组件，用于提高代码的可维护性和可读性。

## 目录结构

```
message/
├── index.ts                    # 导出所有组件
├── MessageRenderer.tsx         # Markdown 渲染器
├── MessageTTS.tsx             # TTS 相关功能
├── MessageActions.tsx         # 消息操作按钮
├── MessageContent.tsx         # 消息内容渲染
├── MessageDevMode.tsx         # 开发模式功能
└── MessageTypes/              # 各种消息类型组件
    ├── HiddenMessage.tsx      # 隐藏消息
    ├── ToolCallMessage.tsx    # 工具调用消息
    ├── ToolResponseMessage.tsx # 工具响应消息
    ├── MessageDetail.tsx      # 消息详情
    └── ReasoningContent.tsx   # 推理内容
```

## 组件说明

### 核心组件

- **MessageRenderer.tsx**: 可复用的 Markdown 渲染器，支持代码块复制功能
- **MessageTTS.tsx**: TTS 播放和生成按钮组件
- **MessageActions.tsx**: 消息操作按钮（隐藏、编辑、复制、TTS）
- **MessageContent.tsx**: 统一的消息内容渲染逻辑
- **MessageDevMode.tsx**: 开发模式下的调试功能

### 消息类型组件

- **HiddenMessage.tsx**: 显示被隐藏的消息
- **ToolCallMessage.tsx**: 工具调用消息的渲染和交互
- **ToolResponseMessage.tsx**: 工具响应消息的显示
- **MessageDetail.tsx**: 处理复杂消息内容（文本+图片）
- **ReasoningContent.tsx**: 显示 AI 的推理过程

## 重构效果

- **原文件大小**: 904 行 → **重构后**: 94 行
- **代码复用**: 提高了组件的复用性
- **可维护性**: 每个组件职责单一，易于维护
- **可测试性**: 组件独立，便于单元测试
- **可读性**: 代码结构更清晰，逻辑更明确

## 使用方式

```tsx
import {
  MessageContent,
  MessageActions,
  MessageDevMode,
  // ... 其他组件
} from "@/components/message";

// 在主组件中使用
<MessageContent
  chat={chat}
  renderMarkdown={renderMarkdown}
  renderColor={renderColor}
  messageIndex={messageIndex}
/>;
```
