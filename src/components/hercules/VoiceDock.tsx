import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowUp,
  Check,
  ChevronDown,
  FileText,
  Loader2,
  MessageCircle,
  Maximize2,
  Mic,
  RotateCcw,
  Square,
  Trash2,
  Volume2,
  X,
} from "lucide-react";
import type { ChatStatus } from "ai";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Orb } from "./Orb";
import { useVoice } from "@/lib/voice";
import { useBol } from "@/lib/bol";
import { toast } from "sonner";

/**
 * VOICE DOCK — the original traveling orb, now opening the same real
 * conversation in a compact text-and-voice panel.
 */
export function VoiceDock({ presentation = "dock" }: { presentation?: "dock" | "screen" }) {
  const bol = useBol();
  const {
    mode,
    orbState,
    turns,
    colorway,
    listen,
    stop,
    say,
    approve,
    decline,
    clear,
    voice,
    lastLine,
    speechSource,
    speechNote,
    canRetrySpeech,
    retrySpeech,
  } = useVoice();
  const [open, setOpen] = useState(false);
  const [minimizedScreen, setMinimizedScreen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState("");
  const isScreen = presentation === "screen" && !minimizedScreen;
  const visible = isScreen || open;
  const minimize = () => { setOpen(false); setMinimizedScreen(true); };
  const reopen = () => { setOpen(true); setMinimizedScreen(false); };
  const panelRef = useRef<HTMLDivElement>(null);
  const status: ChatStatus = mode === "speaking" ? "streaming" : "ready";
  const chatState =
    speechSource === "unavailable" && speechNote
      ? "error"
      : mode === "listening"
        ? "listening"
        : orbState === "thinking"
          ? "thinking"
          : orbState === "speaking"
            ? "speaking"
            : "ready";
  const stateLabel = {
    error: "Voice unavailable — replies shown as text",
    listening: "Listening…",
    thinking: "Thinking…",
    speaking: `${voice.name} speaking…`,
    ready: "Ready by voice or text",
  }[chatState];
  const StateIcon = {
    error: AlertTriangle,
    listening: Mic,
    thinking: Loader2,
    speaking: Volume2,
    ready: MessageCircle,
  }[chatState];

  useEffect(() => {
    if (!visible) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setOpen(false); setMinimizedScreen(true); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [visible]);

  const submit = ({ text }: { text: string }) => {
    const clean = text.trim();
    if (!clean) return;
    say(clean);
    setDraft("");
  };

  return (
    <div className={cn("conversation-host pointer-events-none fixed inset-x-0 bottom-0 z-40", isScreen && "conversation-host-screen", expanded && !isScreen && "conversation-host-expanded")}>
      <div className={cn("conversation-frame pointer-events-auto ml-auto w-full max-w-xl px-3 pb-3 sm:px-4 sm:pb-4", isScreen && "conversation-frame-screen")}>

          <section
            ref={panelRef}
            aria-label="Hercules conversation"
            hidden={!visible}
            className={cn("chat-workspace mb-2 flex h-[min(72dvh,720px)] min-h-[360px] flex-col overflow-hidden rounded-[1.75rem] border", isScreen && "chat-screen", !visible && "!hidden")}
          >
            <header className="chat-line flex min-h-16 items-center gap-3 border-b px-3 py-2">
              <Orb
                className="w-12 shrink-0"
                mode={mode}
                visualState={orbState}
                colorway={colorway}
                onActivate={mode === "idle" ? listen : stop}
              />
              <div className="min-w-0 flex-1">
                <h2 className="chat-gold font-display text-base font-medium uppercase tracking-[0.12em]">
                  Hercules
                </h2>
                <p className="chat-muted flex items-center gap-1.5 truncate text-xs" data-chat-state={chatState}>
                  <StateIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  {stateLabel}
                </p>
              </div>
              {orbState === "speaking" || orbState === "thinking" ? (
                <Button
                  type="button"
                  variant="outline"
                  className="chat-target rounded-full"
                  onClick={stop}
                  aria-label={orbState === "speaking" ? "Stop speaking" : "Cancel reply"}
                >
                  <Square className="h-3.5 w-3.5" />
                  {orbState === "speaking" ? "Stop" : "Cancel"}
                </Button>
              ) : null}
              {turns.length ? (
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={clear}
                  aria-label="Clear conversation"
                  title="Clear conversation"
                >
                  <Trash2 />
                </Button>
              ) : null}
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={minimize}
                aria-label="Minimize conversation"
                title="Minimize"
              >
                <ChevronDown />
              </Button>
            </header>

            {!isScreen ? <Button className="chat-expand" type="button" size="icon" variant="ghost" onClick={() => setExpanded((current) => !current)} aria-label={expanded ? "Restore conversation size" : "Expand conversation"} title={expanded ? "Restore size" : "Expand"}><Maximize2 /></Button> : null}
            <p className="sr-only" role="status" aria-live="polite">
              {stateLabel}
            </p>
            <p className="chat-muted chat-line border-b px-4 py-1.5 text-[0.7rem]">
              Typed and spoken messages share this session only. Nothing is saved after you clear or reload.
            </p>
            <Conversation className="min-h-0">
              <ConversationContent className={cn("mx-auto w-full max-w-2xl gap-6 px-4 py-5", turns.length === 0 && "conversation-empty-content")}>
                {turns.length === 0 ? (
                  <ConversationEmptyState
                    className="conversation-empty min-h-0 p-5 [&_p]:text-[color:var(--chat-muted)]"
                    icon={<Orb className={isScreen ? "conversation-main-orb" : "w-32"} mode={mode} visualState={orbState} colorway={colorway} onActivate={mode === "idle" ? listen : stop} />}
                    title="Hercules"
                    description="What’s on the road ahead?"
                  />
                ) : (
                  <>
                  {isScreen ? (
                    <div className="conversation-pinned-orb" data-main-orb>
                      <Orb className="conversation-main-orb conversation-main-orb-compact" mode={mode} visualState={orbState} colorway={colorway} onActivate={mode === "idle" ? listen : stop} />
                    </div>
                  ) : null}
                  {turns.map((turn) => (
                    <Message key={turn.id} from={turn.from === "driver" ? "user" : "assistant"}>
                      <MessageContent
                        className={cn(
                          "leading-relaxed text-[0.95rem]",
                          turn.from === "driver"
                            ? "chat-user-bubble whitespace-pre-wrap break-words"
                            : "chat-assistant w-full",
                        )}
                      >
                        {turn.from === "hercules" ? (
                          <MessageResponse>{turn.text}</MessageResponse>
                        ) : (
                          turn.text
                        )}
                      </MessageContent>
                      {turn.proposal ? (
                        <div className="chat-card max-w-sm rounded-2xl p-4 text-sm" role="group" aria-label="Action needing your approval">
                          <p className="chat-gold text-xs uppercase tracking-[0.14em]">Needs your approval</p>
                          <p className="mt-1 font-medium">{turn.proposal.summary}</p>
                          {turn.proposal.total ? (
                            <p className="chat-gold mt-1">{turn.proposal.total}</p>
                          ) : null}
                          {turn.status ? (
                            <p className="chat-muted mt-2 flex items-center gap-1.5 text-xs">
                              {turn.status === "approved" ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                              {turn.status === "approved" ? "Approved by you" : "Declined"}
                            </p>
                          ) : (
                            <div className="mt-3 flex gap-2">
                              <Button type="button" className="chat-target" onClick={() => approve(turn.id)}>
                                Approve
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                className="chat-target"
                                onClick={() => decline(turn.id)}
                              >
                                Decline
                              </Button>
                            </div>
                          )}
                        </div>
                      ) : null}
                    </Message>
                  ))
                )}

              </ConversationContent>
              <ConversationScrollButton aria-label="Jump to latest message" title="Latest message" />
            </Conversation>

            {speechSource === "unavailable" && speechNote ? (
              <div
                role="status"
                className="flex items-center justify-between gap-2 border-t border-border/70 px-4 py-2 text-xs text-warn"
              >
                <span>{speechNote}</span>
                {canRetrySpeech ? (
                  <Button type="button" size="sm" variant="ghost" onClick={retrySpeech}>
                    <RotateCcw />
                    Retry
                  </Button>
                ) : null}
              </div>
            ) : null}

            <div className="chat-line chat-safe border-t px-3 pt-3">
              <PromptInput onSubmit={submit} className="chat-composer">
                <PromptInputTextarea
                  aria-label="Message Hercules"
                  placeholder="Message Hercules…"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  className="min-h-12 resize-none"
                />
                <PromptInputFooter className="justify-between px-2 pb-2">
                  <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="chat-target"
                  aria-label={bol.draft ? "Open BOL" : "Create BOL"}
                  title={bol.draft ? "Open BOL" : "Create BOL"}
                  disabled={bol.busy}
                  onClick={() => void bol.handleCommand(bol.draft ? "open" : "create").then((result) => {
                    if (!result.ok) toast.error(result.message);
                  })}
                >
                  <FileText />
                </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant={mode === "listening" ? "default" : "ghost"}
                    className="chat-target rounded-full"
                    onClick={mode === "idle" ? listen : stop}
                    aria-label={mode === "idle" ? "Talk to Hercules" : "Stop voice"}
                    title={mode === "idle" ? "Talk" : "Stop"}
                  >
                    {mode === "idle" ? <Mic /> : <X />}
                  </Button>
                  </div>
                  <PromptInputSubmit
                    status={status}
                    onStop={stop}
                    className="h-11 w-11 rounded-full"
                    aria-label={status === "streaming" ? "Stop reply" : "Send message"}
                  >{status === "streaming" ? <Square /> : <ArrowUp />}</PromptInputSubmit>
                </PromptInputFooter>
              </PromptInput>
            </div>
          </section>

        {!isScreen ? <div className="conversation-launcher flex items-center gap-3 p-2.5">
          <Orb
            className="w-14 shrink-0 sm:w-16"
            mode={mode}
            visualState={orbState}
            colorway={colorway}
            onActivate={mode === "idle" ? listen : stop}
          />

          <Button
            variant="ghost"
            type="button"
            className="h-auto min-w-0 flex-1 flex-col items-start gap-0 text-left whitespace-normal"
            onClick={reopen}
            aria-expanded={visible}
            aria-label="Open Hercules chat from latest reply"
          >
            <span className="tech-label text-voice-accent">
              {stateLabel}
            </span>
            <p
              className={cn(
                "mt-1 truncate text-[0.95rem] font-light",
                mode === "listening" ? "text-voice-accent/70" : "text-voice-text-dim",
              )}
            >
              {mode === "listening"
                ? "Go ahead, I'm on it."
                : lastLine || "Ask about loads, hours, the map or money."}
            </p>
          </Button>

          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={visible ? minimize : reopen}
            aria-label={open ? "Minimize Hercules conversation" : "Open Hercules conversation"}
            aria-expanded={visible}
            title={open ? "Minimize conversation" : "Open conversation"}
          >
            {open ? <ChevronDown /> : <MessageCircle />}
          </Button>
        </div> : null}
      </div>
    </div>
  );
}
