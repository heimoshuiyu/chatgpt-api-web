import { useState, useMemo } from "react";
import Markdown from "react-markdown";
import remarkMath from "remark-math";
import remarkGfm from "remark-gfm";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";
import "katex/dist/katex.min.css";
import { Button } from "@/components/ui/button";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { ClipboardIcon, CheckIcon } from "lucide-react";

// 可复用的Markdown组件配置
const createMarkdownComponents = () => {
  const CodeBlockWithCopy = ({ children, ...props }: any) => {
    const [copied, setCopied] = useState(false);
    const copyToClipboard = useCopyToClipboard();

    const extractTextContent = (node: any): string => {
      if (typeof node === "string") return node;
      if (Array.isArray(node)) return node.map(extractTextContent).join("");
      if (node?.props?.children) return extractTextContent(node.props.children);
      return "";
    };

    const codeText = extractTextContent(children);

    const handleCopy = async () => {
      await copyToClipboard(codeText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };

    return (
      <div className="relative group">
        <pre
          className="break-words whitespace-pre-wrap overflow-x-auto"
          {...props}
        >
          {children}
        </pre>
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 hover:bg-background"
          onClick={handleCopy}
        >
          {copied ? (
            <CheckIcon className="h-4 w-4 text-green-600" />
          ) : (
            <ClipboardIcon className="h-4 w-4" />
          )}
        </Button>
      </div>
    );
  };

  return {
    p: ({ children, node }: any) => {
      if (node?.parent?.type === "listItem") {
        return (
          <span className="break-words whitespace-pre-wrap overflow-wrap-anywhere">
            {children}
          </span>
        );
      }
      return (
        <p className="break-words whitespace-pre-wrap overflow-wrap-anywhere">
          {children}
        </p>
      );
    },
    code: ({ children }: any) => (
      <code className="break-all whitespace-pre-wrap">{children}</code>
    ),
    pre: CodeBlockWithCopy,
  };
};

// 可复用的 Markdown 渲染器组件
interface MarkdownRendererProps {
  content: string;
  className?: string;
  disallowedElements?: string[];
}

export function MarkdownRenderer({
  content,
  className = "prose max-w-none break-words overflow-wrap-anywhere",
  disallowedElements,
}: MarkdownRendererProps) {
  const markdownComponents = useMemo(() => createMarkdownComponents(), []);

  return (
    <Markdown
      remarkPlugins={[remarkMath, remarkGfm]}
      rehypePlugins={[rehypeKatex, rehypeHighlight]}
      className={className}
      disallowedElements={disallowedElements}
      components={markdownComponents}
    >
      {content}
    </Markdown>
  );
}

// 用于用户消息的Markdown渲染器，确保文本颜色适配主题
export function UserMessageMarkdownRenderer({
  content,
  disallowedElements,
}: Omit<MarkdownRendererProps, 'className'>) {
  const markdownComponents = useMemo(() => createMarkdownComponents(), []);

  return (
    <Markdown
      remarkPlugins={[remarkMath, remarkGfm]}
      rehypePlugins={[rehypeKatex, rehypeHighlight]}
      className="prose prose-invert max-w-none break-words overflow-wrap-anywhere [&>*]:text-primary-foreground [&_p]:text-primary-foreground [&_h1]:text-primary-foreground [&_h2]:text-primary-foreground [&_h3]:text-primary-foreground [&_h4]:text-primary-foreground [&_h5]:text-primary-foreground [&_h6]:text-primary-foreground [&_li]:text-primary-foreground [&_ul]:text-primary-foreground [&_ol]:text-primary-foreground [&_blockquote]:text-primary-foreground [&_a]:text-primary-foreground [&_strong]:text-primary-foreground [&_em]:text-primary-foreground [&_code]:text-primary-foreground [&_pre]:text-primary-foreground"
      disallowedElements={disallowedElements}
      components={markdownComponents}
    >
      {content}
    </Markdown>
  );
}
