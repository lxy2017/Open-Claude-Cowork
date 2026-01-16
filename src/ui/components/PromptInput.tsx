import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { ClientEvent } from "../types";
import { useAppStore } from "../store/useAppStore";
import { getCaretCoordinates, cleanupCaretMirror } from "../utils/caret-coords";

const DEFAULT_ALLOWED_TOOLS = "Read,Edit,Bash";
const MAX_ROWS = 12;
const LINE_HEIGHT = 21;
const MAX_HEIGHT = MAX_ROWS * LINE_HEIGHT;

interface PromptInputProps {
  sendEvent: (event: ClientEvent) => void;
}

export function usePromptActions(sendEvent: (event: ClientEvent) => void) {
  const { t } = useTranslation();
  const prompt = useAppStore((state) => state.prompt);
  const cwd = useAppStore((state) => state.cwd);
  const activeSessionId = useAppStore((state) => state.activeSessionId);
  const sessions = useAppStore((state) => state.sessions);
  const selectedProviderId = useAppStore((state) => state.selectedProviderId);
  const setPrompt = useAppStore((state) => state.setPrompt);
  const setPendingStart = useAppStore((state) => state.setPendingStart);
  const setGlobalError = useAppStore((state) => state.setGlobalError);

  const activeSession = activeSessionId ? sessions[activeSessionId] : undefined;
  const isRunning = activeSession?.status === "running";

  const handleSend = useCallback(async () => {
    if (!prompt.trim()) return;

    if (!activeSessionId) {
      let title = "";
      try {
        setPendingStart(true);
        title = await window.electron.generateSessionTitle(prompt);
      } catch (error) {
        console.error("Failed to generate session title:", error);
        setPendingStart(false);
        const errorMessage = error instanceof Error ? error.message : String(error);
        setGlobalError(`${t('common.title_error')}: ${errorMessage}`);
        return;
      }
      sendEvent({
        type: "session.start",
        payload: {
          title,
          prompt,
          cwd: cwd.trim() || undefined,
          allowedTools: DEFAULT_ALLOWED_TOOLS,
          providerId: selectedProviderId || undefined
        }
      });
    } else {
      if (activeSession?.status === "running") {
        setGlobalError(t('common.running_error'));
        return;
      }
      sendEvent({
        type: "session.continue",
        payload: { sessionId: activeSessionId, prompt, providerId: selectedProviderId || undefined }
      });
    }
    setPrompt("");
  }, [activeSession, activeSessionId, cwd, prompt, selectedProviderId, sendEvent, setGlobalError, setPendingStart, setPrompt, t]);

  const handleStop = useCallback(() => {
    if (!activeSessionId) return;
    sendEvent({ type: "session.stop", payload: { sessionId: activeSessionId } });
  }, [activeSessionId, sendEvent]);

  const handleStartFromModal = useCallback(() => {
    if (!cwd.trim()) {
      setGlobalError(t('common.cwd_required'));
      return;
    }
    handleSend();
  }, [cwd, handleSend, setGlobalError, t]);

  return { prompt, setPrompt, isRunning, handleSend, handleStop, handleStartFromModal };
}

// Custom hook for smooth caret position tracking with RAF throttling
function useCaretPosition(textareaRef: React.RefObject<HTMLTextAreaElement | null>) {
  const [caretPos, setCaretPos] = useState({ top: 0, left: 0, height: 20 });
  const [isTypingFast, setIsTypingFast] = useState(false);
  const rafRef = useRef<number | null>(null);
  const lastUpdateTime = useRef(0);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateCaretPosition = useCallback(() => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    const { selectionEnd } = textarea;
    const coords = getCaretCoordinates(textarea, selectionEnd);

    const scrollTop = textarea.scrollTop;
    const scrollLeft = textarea.scrollLeft;

    setCaretPos({
      top: textarea.offsetTop + coords.top - scrollTop,
      left: textarea.offsetLeft + coords.left - scrollLeft,
      height: coords.height
    });
  }, [textareaRef]);

  // RAF-throttled update for smooth animation
  const scheduleUpdate = useCallback(() => {
    const now = performance.now();
    const timeSinceLastUpdate = now - lastUpdateTime.current;

    // Detect fast typing (updates within 35ms = ~28+ keystrokes/sec)
    if (timeSinceLastUpdate < 35) {
      setIsTypingFast(true);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = setTimeout(() => {
        setIsTypingFast(false);
      }, 100); // Shorter recovery for snappier feel
    }

    // Cancel any pending RAF and schedule new one immediately
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
    }

    rafRef.current = requestAnimationFrame(() => {
      updateCaretPosition();
      lastUpdateTime.current = performance.now();
      rafRef.current = null;
    });
  }, [updateCaretPosition]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      cleanupCaretMirror();
    };
  }, []);

  return { caretPos, scheduleUpdate, isTypingFast, updateCaretPosition };
}

export function PromptInput({ sendEvent }: PromptInputProps) {
  const { t } = useTranslation();
  const { prompt, setPrompt, isRunning, handleSend, handleStop } = usePromptActions(sendEvent);
  const promptRef = useRef<HTMLTextAreaElement | null>(null);
  const [isFocused, setIsFocused] = useState(false);

  const { caretPos, scheduleUpdate, isTypingFast, updateCaretPosition } = useCaretPosition(promptRef);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Schedule caret update on key press
    scheduleUpdate();

    if (e.key !== "Enter" || e.shiftKey) return;
    e.preventDefault();
    if (isRunning) { handleStop(); return; }
    handleSend();
  };

  const handleSelect = () => {
    // Update on selection change (covers arrow keys, mouse selection)
    scheduleUpdate();
  };

  const handleInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    // Schedule caret update on input
    scheduleUpdate();

    const target = e.currentTarget;
    target.style.height = "auto";
    const scrollHeight = target.scrollHeight;
    if (scrollHeight > MAX_HEIGHT) {
      target.style.height = `${MAX_HEIGHT}px`;
      target.style.overflowY = "auto";
    } else {
      target.style.height = `${scrollHeight}px`;
      target.style.overflowY = "hidden";
    }
  };

  const handleScroll = () => {
    // Update caret position when textarea scrolls
    scheduleUpdate();
  };

  useEffect(() => {
    if (!promptRef.current) return;
    promptRef.current.style.height = "auto";
    const scrollHeight = promptRef.current.scrollHeight;
    if (scrollHeight > MAX_HEIGHT) {
      promptRef.current.style.height = `${MAX_HEIGHT}px`;
      promptRef.current.style.overflowY = "auto";
    } else {
      promptRef.current.style.height = `${scrollHeight}px`;
      promptRef.current.style.overflowY = "hidden";
    }
    // Update caret when prompt changes (e.g. cleared)
    // Run content update in next tick to allow reflow
    requestAnimationFrame(() => updateCaretPosition());
  }, [prompt, updateCaretPosition]);

  useEffect(() => {
    const handleResize = () => scheduleUpdate();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [scheduleUpdate]);

  return (
    <section
      className="fixed bottom-0 left-0 right-5 bg-gradient-to-t from-surface via-surface to-transparent pb-6 px-4 lg:pb-8 pt-8 lg:ml-[280px] z-40"
    >
      <div className="relative mx-auto flex w-full max-w-full items-end gap-3 rounded-2xl border border-ink-900/10 bg-surface px-4 py-3 shadow-card lg:max-w-3xl">
        {isFocused && (
          <div
            className={`custom-caret ${isTypingFast ? 'typing-fast' : ''}`}
            style={{
              transform: `translate3d(${caretPos.left}px, ${caretPos.top}px, 0)`,
              height: caretPos.height,
            }}
          />
        )}
        <textarea
          rows={1}
          className="no-caret flex-1 resize-none bg-transparent py-1.5 text-sm text-ink-800 placeholder:text-muted focus:outline-none"
          placeholder={t('input.placeholder')}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          onSelect={handleSelect}
          onFocus={() => { setIsFocused(true); scheduleUpdate(); }}
          onBlur={() => setIsFocused(false)}
          onInput={handleInput}
          onScroll={handleScroll}
          ref={promptRef}
        />
        <button
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors ${isRunning ? "bg-error text-white hover:bg-error/90" : "bg-accent text-white hover:bg-accent-hover"}`}
          onClick={isRunning ? handleStop : handleSend}
          aria-label={isRunning ? t('input.stop') : t('input.send')}
        >
          {isRunning ? (
            <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" /></svg>
          ) : (
            <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true"><path d="M3.4 20.6 21 12 3.4 3.4l2.8 7.2L16 12l-9.8 1.4-2.8 7.2Z" fill="currentColor" /></svg>
          )}
        </button>
      </div>
    </section>
  );
}
