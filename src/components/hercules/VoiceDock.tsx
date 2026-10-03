import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, FileText, MessageCircle, Mic, RotateCcw, Trash2, X } from "lucide-react";
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
export function VoiceDock() {
  const bol = useBol();
  const {
    mode,
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
  const panelRef = useRef<HTMLDivElement>(null);
  const status: ChatStatus = mode === "speaking" ? "streaming" : "ready";

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const submit = ({ text }: { text: string }) => {
    const clean = text.trim();
    if (clean) say(clean);
  };

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40">
      <div className="pointer-events-auto ml-auto w-full max-w-xl px-3 pb-3 sm:px-4 sm:pb-4">
        {open ? (
          <section
            ref={panelRef}
            aria-label="Hercules conversation"
            className="panel mb-2 flex h-[min(68vh,560px)] min-h-[360px] flex-col overflow-hidden !rounded-[1.75rem] border-border"
          >
            <header className="flex min-h-16 items-center gap-3 border-b border-border/70 px-3 py-2">
              <Orb
                className="w-12 shrink-0"
                mode={mode}
                colorway={colorway}
                onActivate={mode === "idle" ? listen : stop}
              />
              <div className="min-w-0 flex-1">
                <h2 className="font-display text-base font-medium uppercase tracking-[0.12em]">
                  Hercules
                </h2>
                <p className="truncate text-xs text-muted-foreground">
                  {mode === "listening"
                    ? "Listening…"
                    : mode === "speaking"
                      ? `${voice.name} speaking…`
                      : "Ready by voice or text"}
                </p>
              </div>
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
                onClick={() => setOpen(false)}
                aria-label="Minimize conversation"
                title="Minimize"
              >
                <ChevronDown />
              </Button>
            </header>

            <Conversation className="min-h-0">
              <ConversationContent className="gap-5 p-4">
                {turns.length === 0 ? (
                  <ConversationEmptyState
                    className="min-h-48 p-5"
                    icon={<MessageCircle className="h-7 w-7 text-primary" />}
                    title="Talk to Hercules"
                    description="Ask about loads, hours, the road ahead, or money. Nothing is committed without your approval."
                  />
                ) : (
                  turns.map((turn) => (
                    <Message key={turn.id} from={turn.from === "driver" ? "user" : "assistant"}>
                      <MessageContent
                        className={cn(
                          "leading-relaxed",
                          turn.from === "driver" && "border border-foreground bg-background text-foreground",
                        )}
                      >
                        {turn.from === "hercules" ? (
                          <MessageResponse>{turn.text}</MessageResponse>
                        ) : (
                          turn.text
                        )}
                      </MessageContent>
                      {turn.proposal ? (
                        <div className="ml-0 max-w-sm rounded-2xl border border-foreground bg-background p-3 text-sm">
                          <p className="font-medium">{turn.proposal.summary}</p>
                          {turn.proposal.total ? (
                            <p className="mt-1 text-primary">{turn.proposal.total}</p>
                          ) : null}
                          {turn.status ? (
                            <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Check className="h-3.5 w-3.5" />
                              {turn.status === "approved" ? "Approved by you" : "Declined"}
                            </p>
                          ) : (
                            <div className="mt-3 flex gap-2">
                              <Button type="button" size="sm" onClick={() => approve(turn.id)}>
                                Approve
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
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
              <ConversationScrollButton />
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

            <div className="border-t border-border/70 p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">Paperwork</span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={bol.busy}
                  onClick={() => void bol.handleCommand(bol.draft ? "open" : "create").then((result) => {
                    if (!result.ok) toast.error(result.message);
                  })}
                >
                  <FileText />
                  {bol.draft ? "Open BOL" : "Create BOL"}
                </Button>
              </div>
              <PromptInput onSubmit={submit} className="rounded-2xl border-border bg-background">
                <PromptInputTextarea
                  aria-label="Message Hercules"
                  placeholder="Message Hercules…"
                  className="min-h-12 resize-none"
                />
                <PromptInputFooter className="justify-between px-2 pb-2">
                  <Button
                    type="button"
                    size="icon"
                    variant={mode === "listening" ? "default" : "ghost"}
                    onClick={mode === "idle" ? listen : stop}
                    aria-label={mode === "idle" ? "Talk to Hercules" : "Stop voice"}
                    title={mode === "idle" ? "Talk" : "Stop"}
                  >
                    {mode === "idle" ? <Mic /> : <X />}
                  </Button>
                  <PromptInputSubmit
                    status={status}
                    onStop={stop}
                    className="h-11 w-11 rounded-full"
                  />
                </PromptInputFooter>
              </PromptInput>
            </div>
          </section>
        ) : null}

        <div className="bubble-bar flex items-center gap-3 !rounded-[2rem] p-2.5">
          <Orb
            className="w-14 shrink-0 sm:w-16"
            mode={mode}
            colorway={colorway}
            onActivate={mode === "idle" ? listen : stop}
          />

          <button
            type="button"
            className="min-w-0 flex-1 text-left"
            onClick={() => setOpen(true)}
            aria-expanded={open}
            aria-label="Open Hercules chat from latest reply"
          >
            <span className="tech-label text-voice-accent">
              {mode === "listening"
                ? "Listening"
                : mode === "speaking"
                  ? `${voice.name} speaking`
                  : "Voice ready — tap the orb or say “Hercules”"}
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
          </button>

          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={() => setOpen((current) => !current)}
            aria-label={open ? "Minimize Hercules conversation" : "Open Hercules conversation"}
            aria-expanded={open}
            title={open ? "Minimize conversation" : "Open conversation"}
          >
            {open ? <ChevronDown /> : <MessageCircle />}
          </Button>
        </div>
      </div>
    </div>
  );
}
