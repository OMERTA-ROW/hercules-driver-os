import { useEffect, useMemo, useState } from "react";
import { Check, ChevronLeft, MessageCircle, Palette, Truck, Volume2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth";
import { orbColorways, useVoice, voiceOptions } from "@/lib/voice";
import { themeOptions, useTheme } from "@/lib/theme";
import { useVehicle } from "@/lib/vehicles";
import { cn } from "@/lib/utils";

const DONE_KEY = "hercules.setup-bubble.done";
type Step = "hello" | "display" | "voice" | "equipment" | "review" | "done";
const order: Step[] = ["hello", "display", "voice", "equipment", "review", "done"];

export function SetupBubble() {
  const { account } = useAuth();
  const { theme, setTheme } = useTheme();
  const { colorway, setColorway, voice, setVoice } = useVoice();
  const { profiles, ready } = useVehicle();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("hello");
  const [saved, setSaved] = useState(false);

  useEffect(() => setSaved(localStorage.getItem(DONE_KEY) === "1"), []);
  const handleOpenChange = (next: boolean) => {
    if (next) setStep(localStorage.getItem(DONE_KEY) === "1" ? "review" : "hello");
    setOpen(next);
  };

  const i = order.indexOf(step);
  const next = () => setStep(order[Math.min(i + 1, order.length - 1)]!);
  const back = () => setStep(order[Math.max(i - 1, 0)]!);
  const finish = () => {
    localStorage.setItem(DONE_KEY, "1");
    setSaved(true);
    setStep("done");
  };
  const equipment = useMemo(() => profiles.map((p) => p.unit).join(", "), [profiles]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label="Set up Hercules"
          className="matte-control glow-control fixed bottom-[calc(env(safe-area-inset-bottom,0px)+1rem)] left-4 z-[45] flex min-h-12 items-center gap-2 rounded-full border border-primary/45 bg-card/90 px-4 text-sm font-medium text-foreground shadow-lg backdrop-blur-md transition-transform hover:-translate-y-0.5 sm:left-5"
        >
          <MessageCircle className="h-5 w-5 text-primary" />
          <span>Set up Hercules</span>
          {saved ? <Check className="h-4 w-4 text-go" aria-label="Setup reviewed" /> : null}
        </button>
      </DialogTrigger>
      <DialogContent className="bottom-4 left-4 top-auto max-h-[min(82vh,620px)] w-[calc(100%-2rem)] max-w-md translate-x-0 translate-y-0 overflow-y-auto sm:bottom-6 sm:left-6">
        <DialogHeader>
          <p className="tech-label text-primary">Setup · {Math.min(i + 1, 5)} of 5</p>
          <DialogTitle className="font-display text-xl font-light uppercase tracking-[0.14em]">
            {step === "hello" ? "Set up Hercules" : step === "display" ? "How should it look?" : step === "voice" ? "Choose a voice" : step === "equipment" ? "Your equipment" : step === "review" ? "Ready to review" : "You're set"}
          </DialogTitle>
          <DialogDescription>
            {step === "hello" ? "A few quick choices. Nothing is booked, bought, or sent." : step === "display" ? "These choices save immediately on this device. Your colorway also follows your signed-in account." : step === "voice" ? "Pick the voice Hercules uses. Preview clips are free from the full Voice settings page." : step === "equipment" ? "Vehicle dimensions shape road guidance. Add and verify them on the existing Equipment screen." : step === "review" ? "Here’s what Hercules will use. You can change any choice later in Settings." : "Setup is saved. Reopen this bubble whenever you want to review it."}
          </DialogDescription>
        </DialogHeader>

        {step === "hello" && (
          <div className="bubble-card p-4 text-sm leading-relaxed">
            <p>{account ? `Hi ${account.name}. ` : "Hi. "}I’ll help with appearance, voice, and the equipment profile Hercules already supports.</p>
            {!account && <p className="mt-2 text-muted-foreground">You can choose appearance and voice now. Sign in before saving equipment to your account.</p>}
          </div>
        )}

        {step === "display" && (
          <div className="space-y-4">
            <fieldset><legend className="tech-label mb-2">Exposure</legend><div className="grid grid-cols-3 gap-2">{themeOptions.map((o) => <button key={o.id} type="button" aria-pressed={theme === o.id} onClick={() => setTheme(o.id)} className={cn("bubble-card min-h-14 p-2 text-sm", theme === o.id && "bubble-card-on")}>{o.label}</button>)}</div></fieldset>
            <fieldset><legend className="tech-label mb-2">Matte colorway</legend><div className="grid grid-cols-2 gap-2">{orbColorways.map((o) => <button key={o.id} type="button" aria-pressed={colorway === o.id} onClick={() => setColorway(o.id)} className={cn("bubble-card min-h-14 p-2 text-sm", colorway === o.id && "bubble-card-on")}>{o.label}</button>)}</div></fieldset>
          </div>
        )}

        {step === "voice" && (
          <div role="radiogroup" aria-label="Hercules voice" className="grid max-h-64 grid-cols-2 gap-2 overflow-y-auto pr-1">
            {voiceOptions.map((v) => <button key={v.id} type="button" role="radio" aria-checked={voice.id === v.id} onClick={() => setVoice(v.id)} className={cn("bubble-card min-h-16 p-3 text-left", voice.id === v.id && "bubble-card-on")}><span className="flex items-center gap-2 font-display uppercase tracking-[0.12em]"><Volume2 className="h-4 w-4 text-primary" />{v.name}</span><span className="mt-1 block text-xs text-muted-foreground">{v.hint}</span></button>)}
          </div>
        )}

        {step === "equipment" && (
          <div className="bubble-card p-4">
            {!ready ? <p className="text-sm text-muted-foreground">Checking your saved equipment…</p> : profiles.length ? <><p className="flex items-center gap-2 font-medium"><Truck className="h-5 w-5 text-primary" />{profiles.length} saved</p><p className="mt-1 text-sm text-muted-foreground">{equipment}</p></> : <p className="text-sm">No equipment is saved yet. Preset dimensions are starting values; verify your actual height, length, weight, and axles before saving.</p>}
            <Button asChild variant="outline" className="mt-4 w-full" onClick={() => setOpen(false)}><Link to={account ? "/equipment" : "/sign-in"}>{account ? (profiles.length ? "Review equipment" : "Add equipment") : "Sign in to add equipment"}</Link></Button>
          </div>
        )}

        {step === "review" && (
          <dl className="bubble-card grid gap-3 p-4 text-sm">
            <div className="flex justify-between gap-4"><dt className="flex items-center gap-2 text-muted-foreground"><Palette className="h-4 w-4" />Look</dt><dd className="text-right font-medium">{orbColorways.find((o) => o.id === colorway)?.label} · {themeOptions.find((o) => o.id === theme)?.label}</dd></div>
            <div className="flex justify-between gap-4"><dt className="flex items-center gap-2 text-muted-foreground"><Volume2 className="h-4 w-4" />Voice</dt><dd className="font-medium">{voice.name}</dd></div>
            <div className="flex justify-between gap-4"><dt className="flex items-center gap-2 text-muted-foreground"><Truck className="h-4 w-4" />Equipment</dt><dd className="text-right font-medium">{profiles.length ? `${profiles.length} saved` : "Not set"}</dd></div>
          </dl>
        )}

        {step === "done" && <div role="status" className="bubble-card p-5 text-center"><Check className="mx-auto h-8 w-8 text-go" /><p className="mt-2 font-medium">Hercules is ready with these preferences.</p></div>}

        <DialogFooter className="gap-2 sm:space-x-0">
          {i > 0 && step !== "done" ? <Button variant="ghost" onClick={back}><ChevronLeft />Back</Button> : null}
          {step !== "review" && step !== "done" ? <Button variant="ghost" onClick={next}>Skip</Button> : null}
          {step === "review" ? <Button onClick={finish}>Save & finish</Button> : step === "done" ? <Button onClick={() => { setStep("review"); setOpen(false); }}>Close setup</Button> : <Button onClick={next}>Continue</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
