import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type {
  PermissionResult,
  SDKAssistantMessage,
  SDKMessage,
  SDKResultMessage,
  SDKUserMessage
} from "@anthropic-ai/claude-agent-sdk";
import type { StreamMessage } from "../types";
import type { PermissionRequest } from "../store/useAppStore";
import MDContent from "../render/markdown";
import { DecisionPanel } from "./DecisionPanel";

type MessageContent = SDKAssistantMessage["message"]["content"][number];
type ToolResultContent = SDKUserMessage["message"]["content"][number];
type ToolStatus = "pending" | "success" | "error";

// --- Global Tool Status Management ---
const toolStatusMap = new Map<string, ToolStatus>();
const toolResultMap = new Map<string, { content: string; isError: boolean }>();
const toolStatusListeners = new Set<() => void>();
const MAX_VISIBLE_LINES = 6;

const setToolStatus = (toolUseId: string | undefined, status: ToolStatus) => {
  if (!toolUseId) return;
  toolStatusMap.set(toolUseId, status);
  toolStatusListeners.forEach((listener) => listener());
};

const setToolResult = (toolUseId: string | undefined, content: string, isError: boolean) => {
  if (!toolUseId) return;
  toolResultMap.set(toolUseId, { content, isError });
  toolStatusListeners.forEach((listener) => listener());
};

const useToolStatus = (toolUseId: string | undefined) => {
  const [status, setStatus] = useState<ToolStatus | undefined>(() =>
    toolUseId ? toolStatusMap.get(toolUseId) : undefined
  );
  const [result, setResult] = useState<{ content: string; isError: boolean } | undefined>(() =>
    toolUseId ? toolResultMap.get(toolUseId) : undefined
  );

  useEffect(() => {
    if (!toolUseId) return;
    const handleUpdate = () => {
      setStatus(toolStatusMap.get(toolUseId));
      setResult(toolResultMap.get(toolUseId));
    };
    toolStatusListeners.add(handleUpdate);
    return () => { toolStatusListeners.delete(handleUpdate); };
  }, [toolUseId]);

  return { status, result };
};

// --- Helper Functions ---
export function isMarkdown(text: string): boolean {
  if (!text || typeof text !== "string") return false;
  const patterns: RegExp[] = [/^#{1,6}\s+/m, /```[\s\S]*?```/];
  return patterns.some((pattern) => pattern.test(text));
}

function extractTagContent(input: string, tag: string): string | null {
  const match = input.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
  return match ? match[1] : null;
}

// --- Components ---

const StatusIndicator = ({ status, size = "sm" }: { status: ToolStatus; size?: "sm" | "md" }) => {
  const sizeClass = size === "md" ? "h-2.5 w-2.5" : "h-2 w-2";

  if (status === "pending") {
    return (
      <span className={`relative flex ${sizeClass}`}>
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
        <span className={`relative inline-flex ${sizeClass} rounded-full bg-accent`} />
      </span>
    );
  }

  const colorClass = status === "success" ? "bg-success" : "bg-error";
  return <span className={`inline-flex ${sizeClass} rounded-full ${colorClass}`} />;
};

const UserAvatar = () => (
  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-secondary border border-ink-900/5 text-xs font-bold text-ink-700 shadow-sm ring-2 ring-white">
    U
  </div>
);

const AssistantAvatar = () => (
  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-secondary border border-ink-900/5 text-xs font-bold text-transparent bg-clip-text bg-gradient-to-br from-accent to-accent-hover shadow-sm ring-2 ring-white">
    AI
  </div>
);

// --- Unified Tool Card (combines tool use + result) ---

const UnifiedToolCard = ({
  messageContent,
  result
}: {
  messageContent: MessageContent;
  result?: { content: string; isError: boolean };
}) => {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showArgs, setShowArgs] = useState(false);

  // Get toolUseId safely before any hooks that depend on it
  const toolUseId = messageContent.type === "tool_use" ? messageContent.id : undefined;

  // Call hooks before conditional return
  const { status, result: liveResult } = useToolStatus(toolUseId);

  // Initialize pending state - also before conditional return
  useEffect(() => {
    if (toolUseId && !toolStatusMap.has(toolUseId)) {
      setToolStatus(toolUseId, "pending");
    }
  }, [toolUseId]);

  // Now safe to do early return
  if (messageContent.type !== "tool_use") return null;

  const actualResult = result || liveResult;
  const isPending = !status || status === "pending";
  const isError = status === "error" || actualResult?.isError;
  const currentStatus = status || "pending";

  const getToolInfo = () => {
    const input = messageContent.input as Record<string, any>;
    if (messageContent.name === "Bash") return input?.command;
    if (messageContent.name === "Read" || messageContent.name === "Write") return input?.file_path;
    return null;
  };

  const getToolArgs = () => {
    try {
      return JSON.stringify(messageContent.input, null, 2);
    } catch {
      return String(messageContent.input);
    }
  };

  const toolInfo = getToolInfo();
  const lines = actualResult?.content?.split("\n") || [];
  const hasMoreLines = lines.length > MAX_VISIBLE_LINES;
  const visibleContent = hasMoreLines && !isExpanded
    ? lines.slice(0, MAX_VISIBLE_LINES).join("\n")
    : actualResult?.content || "";
  const isMarkdownContent = isMarkdown(visibleContent);

  const statusLabel = isPending ? "RUNNING" : isError ? "FAILED" : "DONE";
  const statusColor = isPending ? "text-accent bg-accent/10" : isError ? "text-error bg-error-light" : "text-success bg-success-light";

  return (
    <div className="mb-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className={`
        group overflow-hidden rounded-xl border shadow-sm transition-all duration-300
        ${isError ? 'border-error/30 bg-white' : 'border-ink-900/10 bg-white'}
        hover:shadow-md hover:border-ink-900/20
      `}>
        {/* Header */}
        <div className={`
          flex items-center gap-3 px-4 py-3 border-b transition-colors
          ${isError ? 'border-error/10 bg-error-light/20' : 'border-ink-900/5 bg-surface-secondary/30'}
        `}>
          {/* Tool Icon */}
          <div className={`
            flex h-9 w-9 shrink-0 items-center justify-center rounded-lg shadow-sm transition-all
            ${isPending ? 'bg-accent/10 text-accent' : isError ? 'bg-error-light text-error' : 'bg-success-light text-success'}
          `}>
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
            </svg>
          </div>

          {/* Tool Info */}
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-ink-800 uppercase tracking-wide">
                {messageContent.name}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${statusColor}`}>
                {statusLabel}
              </span>
            </div>
            {toolInfo && (
              <div className="truncate font-mono text-xs text-ink-500 mt-1" title={toolInfo}>
                {toolInfo}
              </div>
            )}
          </div>

          {/* Status Indicator */}
          <StatusIndicator status={currentStatus} size="md" />
        </div>

        {/* Arguments Toggle (for complex tools) */}
        {!toolInfo && (
          <button
            onClick={() => setShowArgs(!showArgs)}
            className="flex w-full items-center gap-2 px-4 py-2 text-[10px] font-medium text-ink-400 hover:bg-surface-secondary/50 hover:text-ink-600 transition-colors border-b border-ink-900/5"
          >
            <span className={`transition-transform duration-200 ${showArgs ? 'rotate-90' : ''}`}>▶</span>
            <span className="uppercase tracking-wider">Arguments</span>
          </button>
        )}

        {showArgs && !toolInfo && (
          <div className="px-4 py-3 bg-surface-secondary/20 border-b border-ink-900/5 animate-in slide-in-from-top-1 duration-200">
            <pre className="text-xs font-mono text-ink-600 whitespace-pre-wrap overflow-x-auto">
              {getToolArgs()}
            </pre>
          </div>
        )}

        {/* Result Output */}
        {actualResult && (
          <div className="animate-in fade-in slide-in-from-top-2 duration-300">
            {/* Result Header */}
            <div className={`
              flex items-center gap-2 px-4 py-2 text-[10px] font-bold uppercase tracking-wider
              ${isError ? 'text-error bg-error-light/30' : 'text-ink-400 bg-surface-cream/50'}
            `}>
              <StatusIndicator status={isError ? "error" : "success"} />
              <span>{isError ? "Error Output" : "Result Output"}</span>
            </div>

            {/* Result Content */}
            <div className={`
              px-4 py-3 text-xs font-mono overflow-x-auto
              ${isError ? 'text-error bg-error-light/10' : 'text-ink-600 bg-surface-cream/30'}
            `}>
              {isMarkdownContent ? (
                <MDContent text={visibleContent} />
              ) : (
                <pre className="whitespace-pre-wrap leading-relaxed">{visibleContent}</pre>
              )}
            </div>

            {/* Expand/Collapse */}
            {hasMoreLines && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="group flex w-full items-center justify-center gap-2 border-t border-ink-900/5 bg-surface-secondary/20 py-2 text-[10px] font-medium text-ink-400 hover:bg-surface-secondary/50 hover:text-ink-600 transition-colors"
              >
                <span>{isExpanded ? t('event.collapse') : t('event.show_more', { count: lines.length - MAX_VISIBLE_LINES })}</span>
                <svg viewBox="0 0 24 24" className={`h-3 w-3 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
            )}
          </div>
        )}

        {/* Loading Skeleton for pending results */}
        {isPending && !actualResult && (
          <div className="px-4 py-3 animate-in fade-in duration-300">
            <div className="flex flex-col gap-2">
              <div className="relative h-2.5 w-3/4 overflow-hidden rounded-full bg-ink-900/5">
                <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-accent/20 to-transparent animate-shimmer" />
              </div>
              <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-ink-900/5">
                <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-accent/20 to-transparent animate-shimmer" style={{ animationDelay: '0.1s' }} />
              </div>
              <div className="relative h-2.5 w-1/2 overflow-hidden rounded-full bg-ink-900/5">
                <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-accent/20 to-transparent animate-shimmer" style={{ animationDelay: '0.2s' }} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Legacy ToolResult - now syncs with global state
const ToolResult = ({ messageContent }: { messageContent: ToolResultContent }) => {
  const toolUseId = messageContent.type === "tool_result" ? messageContent.tool_use_id : undefined;
  const isError = messageContent.type === "tool_result" && messageContent.is_error;

  // Extract content - compute before useEffect
  const contentStr = (() => {
    if (messageContent.type !== "tool_result") return "";

    if (isError) {
      return extractTagContent(String(messageContent.content), "tool_use_error") || String(messageContent.content);
    }

    try {
      if (Array.isArray(messageContent.content)) {
        return messageContent.content.map((item: any) => item.text || "").join("\n");
      }
      return String(messageContent.content);
    } catch {
      return JSON.stringify(messageContent, null, 2);
    }
  })();

  // Sync with global state - must be called before any conditional return
  useEffect(() => {
    if (toolUseId) {
      setToolStatus(toolUseId, isError ? "error" : "success");
      setToolResult(toolUseId, contentStr, !!isError);
    }
  }, [toolUseId, isError, contentStr]);

  // Don't render - the UnifiedToolCard will show the result
  if (messageContent.type !== "tool_result") return null;
  return null;
};

// --- Content Cards ---

const SessionResult = ({ message }: { message: SDKResultMessage }) => {
  const { t } = useTranslation();
  const formatMinutes = (ms: number | undefined) => typeof ms !== "number" ? "-" : `${(ms / 60000).toFixed(2)}m`;
  const formatUsd = (usd: number | undefined) => typeof usd !== "number" ? "-" : `$${usd.toFixed(2)}`;

  return (
    <div className="flex items-center gap-4 py-6 px-8 opacity-60 hover:opacity-100 transition-opacity animate-in fade-in duration-500">
      <div className="flex-1 border-t border-ink-900/10"></div>
      <div className="flex flex-col items-center gap-1 text-[10px] text-muted-light font-bold uppercase tracking-widest">
        <span>{t('event.session_result')}</span>
        <div className="flex gap-4 text-ink-500 normal-case tracking-normal font-mono">
          <span>⏱ {formatMinutes(message.duration_ms)}</span>
          <span>•</span>
          <span>💰 {formatUsd(message.total_cost_usd)}</span>
          <span>•</span>
          <span>IN: {message.usage?.input_tokens ?? 0}</span>
          <span>•</span>
          <span>OUT: {message.usage?.output_tokens ?? 0}</span>
        </div>
      </div>
      <div className="flex-1 border-t border-ink-900/10"></div>
    </div>
  );
};

const AskUserQuestionCard = ({
  messageContent,
  permissionRequest,
  onPermissionResult
}: {
  messageContent: MessageContent;
  permissionRequest?: PermissionRequest;
  onPermissionResult?: (toolUseId: string, result: PermissionResult) => void;
}) => {
  if (messageContent.type !== "tool_use") return null;
  const input = messageContent.input as any;
  const isActiveRequest = permissionRequest && permissionRequest.toolUseId === messageContent.id;

  if (isActiveRequest && onPermissionResult) {
    return (
      <div className="mb-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="rounded-xl border border-accent/20 bg-gradient-to-br from-white to-surface-secondary p-1 shadow-sm">
          <DecisionPanel request={permissionRequest} onSubmit={(result) => onPermissionResult(permissionRequest.toolUseId, result)} />
        </div>
      </div>
    );
  }

  return (
    <div className="mb-4 flex gap-3 rounded-xl bg-surface-tertiary p-4 border border-ink-900/5 animate-in fade-in duration-300">
      <div className="text-sm text-ink-800 italic">
        "{(input?.questions || []).map((q: any) => q.question).join(" ")}"
      </div>
    </div>
  );
};

const ThinkingBlock = ({ text, isRunning }: { text: string, isRunning?: boolean }) => {
  const [isOpen, setIsOpen] = useState(isRunning);
  // const { t } = useTranslation();

  useEffect(() => { if (isRunning) setIsOpen(true); }, [isRunning]);

  return (
    <div className="mb-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="rounded-xl border border-ink-900/5 bg-surface-secondary/30 overflow-hidden transition-all">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex w-full items-center gap-2 px-4 py-2.5 text-xs font-medium text-ink-500 hover:bg-surface-secondary hover:text-ink-700 transition-colors"
        >
          <span className={`transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}>▶</span>
          <span className="uppercase tracking-wider text-[10px]">Thinking Process</span>
          {isRunning && <span className="block h-1.5 w-1.5 rounded-full bg-accent animate-pulse ml-auto" />}
        </button>
        {isOpen && (
          <div className="px-4 pb-4 pt-0 animate-in slide-in-from-top-2 duration-200">
            <div className="prose prose-sm max-w-none text-xs text-ink-600 border-l-2 border-accent/30 pl-3">
              <MDContent text={text} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const AssistantMessageBubble = ({ text }: { text: string }) => {
  if (!text) return null;
  return (
    <div className="relative mb-4 group animate-in fade-in slide-in-from-left-4 duration-300">
      <div className="absolute top-0 -left-12">
        <AssistantAvatar />
      </div>
      <div className="min-w-0 space-y-2 py-1">
        <div className="text-sm text-ink-900 leading-relaxed selection:bg-accent selection:text-white">
          <MDContent text={text} />
        </div>
      </div>
    </div>
  );
};

const UserMessageBubble = ({ text }: { text: string }) => {
  return (
    <div className="relative mb-6 flex flex-col items-end animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="absolute top-0 -right-12">
        <UserAvatar />
      </div>
      <div className="max-w-[85%] min-w-0">
        <div className="inline-block rounded-2xl rounded-tr-none bg-white px-5 py-3 text-sm text-ink-900 shadow-sm ring-1 ring-ink-900/5 selection:bg-accent selection:text-white">
          <MDContent text={text} />
        </div>
      </div>
    </div>
  );
};

const SystemInfoCard = ({ message }: { message: SDKMessage }) => {
  if (message.type !== "system" || !("subtype" in message) || message.subtype !== "init") return null;
  const sys = message as any;
  return (
    <div className="mx-auto my-8 flex max-w-fit items-center gap-3 rounded-full border border-ink-900/5 bg-surface-secondary/50 px-4 py-1.5 text-[10px] text-ink-400 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-500">
      <div className="h-1.5 w-1.5 rounded-full bg-success shadow-[0_0_8px_rgba(22,163,74,0.5)] animate-pulse"></div>
      <span className="font-semibold uppercase tracking-wider">Session Active</span>
      <span className="text-ink-200">|</span>
      <span className="font-mono text-ink-500">{sys.model}</span>
    </div>
  );
};

// --- Main Export ---

export function MessageCard({
  message,
  isLast = false,
  isRunning = false,
  permissionRequest,
  onPermissionResult
}: {
  message: StreamMessage;
  isLast?: boolean;
  isRunning?: boolean;
  permissionRequest?: PermissionRequest;
  onPermissionResult?: (toolUseId: string, result: PermissionResult) => void;
}) {
  const { t } = useTranslation();

  if (message.type === "user_prompt") {
    return <UserMessageBubble text={message.prompt} />;
  }

  const sdkMessage = message as SDKMessage;

  if (sdkMessage.type === "system") {
    return <SystemInfoCard message={sdkMessage} />;
  }

  if (sdkMessage.type === "result") {
    if (sdkMessage.subtype === "success") {
      return <SessionResult message={sdkMessage} />;
    }
    return (
      <div className="mx-auto my-4 max-w-xl rounded-lg border border-error/50 bg-error-light p-4 text-center animate-in fade-in duration-300">
        <div className="text-sm font-bold text-error">{t('event.session_error')}</div>
        <div className="mt-1 text-xs text-error/80 font-mono">{JSON.stringify(sdkMessage, null, 2)}</div>
      </div>
    );
  }

  if (sdkMessage.type === "assistant") {
    const contents = sdkMessage.message.content;
    return (
      <div className="flex flex-col gap-1 relative group-assistant">
        {contents.map((content: MessageContent, idx: number) => {
          if (content.type === "thinking") {
            return <ThinkingBlock key={idx} text={content.thinking} isRunning={isLast && isRunning} />;
          }
          if (content.type === "text") {
            return <AssistantMessageBubble key={idx} text={content.text} />;
          }
          if (content.type === "tool_use") {
            if (content.name === "AskUserQuestion") {
              return <AskUserQuestionCard key={idx} messageContent={content} permissionRequest={permissionRequest} onPermissionResult={onPermissionResult} />;
            }
            return <UnifiedToolCard key={idx} messageContent={content} />;
          }
          return null;
        })}
      </div>
    );
  }

  if (sdkMessage.type === "user") {
    const contents = sdkMessage.message.content;
    return (
      <div className="flex flex-col gap-1 relative group-tool-result">
        {contents.map((content: ToolResultContent, idx: number) => {
          if (content.type === "tool_result") {
            return <ToolResult key={idx} messageContent={content} />;
          }
          return null;
        })}
      </div>
    );
  }

  return null;
}

export { MessageCard as EventCard };
