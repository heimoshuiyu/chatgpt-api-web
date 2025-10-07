import { AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { StreamError } from "@/hooks/useMessageCompletion";
import { ChatStoreMessage } from "@/types/chatstore";
import { useState } from "react";

interface StreamErrorDisplayProps {
  message: ChatStoreMessage;
  onDismiss?: () => void;
}

export function StreamErrorDisplay({
  message,
  onDismiss,
}: StreamErrorDisplayProps) {
  const [showResponseBody, setShowResponseBody] = useState(false);

  if (!message.error) return null;

  const { error } = message;

  const getErrorDescription = () => {
    switch (error.type) {
      case "network_error":
        return "Network connection failed. Please check your internet connection and try again.";
      case "rate_limit_error":
        return "Rate limit exceeded. Please wait a moment and try again later.";
      case "timeout_error":
        return "Request timed out. The server took too long to respond.";
      case "http_error":
        return `Server error (${error.statusCode}). Please try again later.`;
      case "parse_error":
        return "Failed to parse server response. The response format was unexpected.";
      case "abort_error":
        return "Request was cancelled.";
      default:
        return error.message || "An unknown error occurred.";
    }
  };

  const hasResponseBody = error.errorBody && error.errorBody.trim() !== "";

  return (
    <Alert className="mb-2 border-red-200 bg-red-50">
      <AlertCircle className="h-4 w-4 text-red-600" />
      <div className="flex-1">
        <AlertDescription className="text-red-800">
          <div className="font-medium mb-1">API Error</div>
          <div className="text-sm">{getErrorDescription()}</div>

          {message.incomplete && (
            <div className="text-xs mt-1 text-red-600">
              Partial response was saved due to the error.
            </div>
          )}

          {/* 显示服务器返回的错误响应体 */}
          {hasResponseBody && (
            <div className="mt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowResponseBody(!showResponseBody)}
                className="h-6 px-2 text-xs text-red-700 hover:bg-red-100"
              >
                {showResponseBody ? (
                  <ChevronUp className="h-3 w-3 mr-1" />
                ) : (
                  <ChevronDown className="h-3 w-3 mr-1" />
                )}
                {showResponseBody ? "Hide" : "Show"} Server Response
              </Button>

              {showResponseBody && (
                <div className="mt-2 p-2 bg-red-100 rounded border border-red-200">
                  <div className="text-xs font-mono text-red-900 whitespace-pre-wrap break-all max-h-40 overflow-y-auto">
                    {error.errorBody}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 开发模式下的详细错误信息 */}
          {error.details && process.env.NODE_ENV === "development" && (
            <details className="mt-2 text-xs">
              <summary className="cursor-pointer">Debug Details</summary>
              <pre className="mt-1 p-2 bg-red-100 rounded overflow-auto">
                {JSON.stringify(error.details, null, 2)}
              </pre>
            </details>
          )}
        </AlertDescription>
      </div>
      <div className="flex gap-2 ml-2">
        {onDismiss && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            className="h-8 px-2 text-red-700 hover:bg-red-100"
          >
            Dismiss
          </Button>
        )}
      </div>
    </Alert>
  );
}
