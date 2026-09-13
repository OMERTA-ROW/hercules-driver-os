import { useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Camera,
  FolderOpen,
  RotateCw,
  Crop,
  Trash2,
  Check,
  Send,
  FileText,
  Lock,
  Sparkles,
  Layers,
  Mail,
  Building2,
  Banknote,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/hercules/AppShell";
import {
  Panel,
  PanelTitle,
  Label,
  Pill,
  DriverApprovedNote,
} from "@/components/hercules/primitives";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usePurchases } from "@/lib/purchases";
import {
  DOC_UPLOAD_PRICE,
  docLoads,
  docSets as seedSets,
  docTypeLabel,
  docTypes,
  sendTargets,
  type DocSet,
  type DocStatus,
  type DocTypeId,
} from "@/data/documents";
import { cn } from "@/lib/utils";

type Search = { load: string | undefined; type: DocTypeId | undefined; capture: boolean };

export const Route = createFileRoute("/documents")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    load: typeof search["load"] === "string" ? search["load"] : undefined,
    type: docTypes.some((t) => t.id === search["type"]) ? (search["type"] as DocTypeId) : undefined,
    capture: search["capture"] === true || search["capture"] === "true",
  }),
  head: () => ({
    meta: [
      { title: "Documents — HERCULES Driver OS" },
      {
        name: "description",
        content:
          "Snap and file your BOL, rate confirmation, POD, fuel and scale receipts from the cab. Multi-page capture, auto-crop, tagged to the load, and sent only when you approve it.",
      },
      { property: "og:title", content: "Documents — HERCULES Driver OS" },
      {
        property: "og:description",
        content:
          "Photograph paperwork in the cab, group it by load, and send it to your broker or factoring company on your approval.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DocumentsPage,
});

const statusTone: Record<DocStatus, "warn" | "info" | "go"> = {
  Pending: "warn",
  Uploaded: "info",
  Sent: "go",
};

/* ------------------------------------------------------------------ locked */

function SamplePreview() {
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {[
        { load: "LD-88214", type: "Bill of Lading (BOL)", pages: 2, status: "Uploaded" },
        { load: "LD-88190", type: "Proof of delivery", pages: 3, status: "Sent" },
        { load: "LD-88171", type: "Fuel receipts", pages: 4, status: "Pending" },
      ].map((s) => (
        <div key={s.load} className="rounded-lg border border-border bg-card/70 p-3">
          <div className="flex aspect-[4/3] items-center justify-center rounded-md border border-border/70 bg-secondary/70">
            <FileText className="h-10 w-10 text-muted-foreground" />
          </div>
          <div className="mt-2 font-display text-sm uppercase tracking-[0.1em]">{s.load}</div>
          <div className="text-sm text-muted-foreground">
            {s.type} · {s.pages} pages
          </div>
          <div className="mt-1 text-xs uppercase tracking-[0.14em] text-muted-foreground">
            {s.status}
          </div>
        </div>
      ))}
    </div>
  );
}

function UnlockScreen() {
  const { purchase } = usePurchases();
  const [confirming, setConfirming] = useState(false);
  const [working, setWorking] = useState(false);

  return (
    <div className="grid gap-3 xl:grid-cols-[1.1fr_1fr]">
      <Panel>
        <Label>One-time purchase</Label>
        <div className="mt-1 flex items-center gap-2">
          <Lock className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold uppercase sm:text-3xl">Document Upload</h2>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Photograph your paperwork in the cab and be done with it. Not part of your subscription —
          buy it once if you need it, skip it forever if you don't.
        </p>

        <ul className="mt-4 space-y-2 text-sm">
          {[
            "Take Photo or Choose File — images and PDF",
            "Multi-page capture: snap several pages into one document",
            "Auto-crop with edge detection, plus a rotate control before saving",
            "Tag every upload to a load number, type, date, and a note",
            "Documents list grouped by load with Pending / Uploaded / Sent status",
            "Send to email, your broker, or your factoring company — on your approval",
            "Voice: “upload my BOL for load 4471” opens the camera pre-filled",
          ].map((f) => (
            <li key={f} className="flex items-start gap-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-go" />
              <span>{f}</span>
            </li>
          ))}
        </ul>

        <div className="mt-5 flex flex-wrap items-end gap-4 rounded-lg border border-primary/40 bg-primary/10 p-4">
          <div>
            <Label>Price</Label>
            <div className="metric text-4xl font-bold text-primary">${DOC_UPLOAD_PRICE}.00</div>
            <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
              One-time charge · not a subscription · never recurring
            </div>
          </div>
          <p className="min-w-[14rem] flex-1 text-sm text-muted-foreground">
            A single $5.00 purchase unlocks Document Upload permanently on your account. No monthly
            fee, no add-on to your plan, and no further prompts after you buy it.
          </p>
        </div>

        <Button
          size="lg"
          className="mt-4 h-16 w-full gap-2 font-display text-base uppercase tracking-[0.14em]"
          onClick={() => setConfirming(true)}
        >
          <Sparkles className="h-5 w-5" />
          Unlock Document Upload — $5 one time
        </Button>
        <div className="mt-3">
          <DriverApprovedNote>
            Nothing is charged until you confirm it yourself. This pass is a mock purchase — no card
            is processed.
          </DriverApprovedNote>
        </div>
      </Panel>

      <Panel>
        <PanelTitle right={<Pill tone="warn">Locked preview</Pill>}>What you get</PanelTitle>
        <div className="relative overflow-hidden rounded-lg">
          <div className="pointer-events-none select-none opacity-40 blur-[3px]">
            <SamplePreview />
          </div>
          <div className="absolute inset-0 flex items-end justify-center bg-background/40 p-4">
            <div className="flex items-center gap-2 rounded-lg border border-border bg-card/90 px-3 py-2 text-sm">
              <Lock className="h-4 w-4 text-primary" />
              Sample documents — unlock to use your own
            </div>
          </div>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Your documents stay tagged to the load they belong to, so a settlement dispute or a
          factoring request is one tap away instead of a shoebox in the sleeper.
        </p>
      </Panel>

      <Dialog open={confirming} onOpenChange={(o) => !o && setConfirming(false)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl uppercase">Confirm your purchase</DialogTitle>
            <DialogDescription>
              One-time charge. HERCULES does not buy anything on its own.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between rounded-lg border border-border bg-card/70 p-3">
              <span className="font-display uppercase tracking-[0.12em]">Document Upload</span>
              <span className="metric text-2xl font-bold text-primary">${DOC_UPLOAD_PRICE}</span>
            </div>
            <p className="text-muted-foreground">
              Unlocks permanently on this account. Your monthly plan does not change and will not be
              charged more.
            </p>
            <DriverApprovedNote />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" size="lg" onClick={() => setConfirming(false)}>
              Not now
            </Button>
            <Button
              size="lg"
              className="gap-2"
              disabled={working}
              onClick={() => {
                const outcome = purchase("documents");
                setConfirming(false);
                if (!outcome.ok) {
                  toast.error("Nothing was charged", { description: outcome.message });
                }
              }}
            >
              <Check className="h-5 w-5" />
              {working ? "Processing…" : `Yes, buy for $5.00 one time`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ---------------------------------------------------------------- unlocked */

type Page = { id: number; rotation: number; cropped: boolean; source: "camera" | "file" };

function PageThumb({
  page,
  index,
  onRotate,
  onRemove,
}: {
  page: Page;
  index: number;
  onRotate: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-lg border border-border bg-card/70 p-2">
      <div className="flex aspect-[3/4] items-center justify-center overflow-hidden rounded-md border border-border/70 bg-secondary/60">
        <FileText
          className="h-10 w-10 text-muted-foreground transition-transform"
          style={{ transform: `rotate(${page.rotation}deg)` }}
        />
      </div>
      <div className="mt-2 flex items-center justify-between gap-1">
        <span className="label-cap">Page {index + 1}</span>
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="icon"
            aria-label={`Rotate page ${index + 1}`}
            onClick={onRotate}
          >
            <RotateCw className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label={`Remove page ${index + 1}`}
            onClick={onRemove}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="mt-1 text-[0.68rem] uppercase tracking-[0.12em] text-muted-foreground">
        {page.cropped ? "Auto-cropped" : "Full frame"} · {page.source}
      </div>
    </div>
  );
}

function Documents() {
  const search = Route.useSearch();
  const [sets, setSets] = useState<DocSet[]>(seedSets);
  const [type, setType] = useState<DocTypeId>(search.type ?? "bol");
  const loadOptions =
    search.load && !docLoads.includes(search.load) ? [search.load, ...docLoads] : docLoads;
  const [load, setLoad] = useState<string>(search.load ?? docLoads[0]!);
  const [note, setNote] = useState("");
  const [autoCrop, setAutoCrop] = useState(true);
  const [pages, setPages] = useState<Page[]>([]);
  const [sending, setSending] = useState<DocSet | null>(null);
  const [target, setTarget] = useState<string>("factoring");
  const [email, setEmail] = useState("billing@apexfactoring.com");
  const fileInput = useRef<HTMLInputElement>(null);

  const addPage = (source: Page["source"]) =>
    setPages((p) => [...p, { id: Date.now() + p.length, rotation: 0, cropped: autoCrop, source }]);

  const grouped = docLoads
    .map((l) => ({ load: l, items: sets.filter((s) => s.load === l) }))
    .filter((g) => g.items.length > 0);

  const save = () => {
    const id = `DOC-${3400 + sets.length}`;
    setSets((prev) => [
      {
        id,
        load,
        type,
        date: new Date().toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
        pages: pages.length,
        status: "Pending",
        ...(note ? { note } : {}),
      },
      ...prev,
    ]);
    setPages([]);
    setNote("");
    toast.success(`${docTypeLabel(type)} saved to ${load}`, {
      description: `${pages.length} page${pages.length === 1 ? "" : "s"} filed. Nothing is sent until you say so.`,
    });
  };

  return (
    <div className="grid gap-3 xl:grid-cols-[1fr_1.15fr]">
      {/* Capture */}
      <Panel>
        <PanelTitle right={<Pill tone="primary">Unlocked</Pill>}>Capture</PanelTitle>

        <div className="grid gap-2 sm:grid-cols-2">
          <Button
            size="lg"
            className="h-24 flex-col gap-1 font-display text-base uppercase tracking-[0.12em]"
            onClick={() => addPage("camera")}
          >
            <Camera className="h-8 w-8" />
            Take Photo
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="h-24 flex-col gap-1 font-display text-base uppercase tracking-[0.12em]"
            onClick={() => fileInput.current?.click()}
          >
            <FolderOpen className="h-8 w-8" />
            Choose File
          </Button>
          <input
            ref={fileInput}
            type="file"
            accept="image/*,application/pdf"
            multiple
            className="hidden"
            onChange={(e) => {
              const n = e.target.files?.length ?? 0;
              for (let i = 0; i < Math.max(1, n); i += 1) addPage("file");
              e.target.value = "";
            }}
          />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button
            variant={autoCrop ? "default" : "outline"}
            size="lg"
            className="gap-2"
            onClick={() => setAutoCrop((v) => !v)}
          >
            <Crop className="h-5 w-5" />
            Auto-crop {autoCrop ? "on" : "off"}
          </Button>
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Layers className="h-4 w-4" />
            {pages.length} page{pages.length === 1 ? "" : "s"} in this document
          </span>
        </div>

        {pages.length > 0 ? (
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {pages.map((p, i) => (
              <PageThumb
                key={p.id}
                page={p}
                index={i}
                onRotate={() =>
                  setPages((prev) =>
                    prev.map((x) => (x.id === p.id ? { ...x, rotation: x.rotation + 90 } : x)),
                  )
                }
                onRemove={() => setPages((prev) => prev.filter((x) => x.id !== p.id))}
              />
            ))}
          </div>
        ) : (
          <p className="mt-3 rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
            Snap the pages one after another — they group into a single document. Edges are detected
            and straightened automatically; rotate any page before you save.
          </p>
        )}

        {/* Tagging */}
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Document type</Label>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {docTypes.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setType(t.id)}
                  className={cn(
                    "min-h-[44px] rounded-lg border px-3 py-2 font-display text-xs uppercase tracking-[0.1em] transition-colors",
                    t.id === type
                      ? "border-primary/60 bg-primary/15 text-primary"
                      : "border-border text-muted-foreground hover:bg-accent",
                  )}
                >
                  {t.short}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label>Load number</Label>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {loadOptions.map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLoad(l)}
                  className={cn(
                    "min-h-[44px] rounded-lg border px-3 py-2 font-display text-xs uppercase tracking-[0.1em] transition-colors",
                    l === load
                      ? "border-primary/60 bg-primary/15 text-primary"
                      : "border-border text-muted-foreground hover:bg-accent",
                  )}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-3">
          <Label>Note (optional)</Label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="Detained 90 minutes at the dock, lumper paid in cash"
            className="mt-1.5 w-full rounded-lg border border-border bg-card/70 p-3 text-sm outline-none focus:border-primary/60"
          />
        </div>

        <Button
          size="lg"
          className="mt-3 h-16 w-full gap-2 font-display text-base uppercase tracking-[0.14em]"
          disabled={pages.length === 0}
          onClick={save}
        >
          <Check className="h-5 w-5" />
          Save {docTypes.find((t) => t.id === type)?.short} to {load}
        </Button>
        <div className="mt-3">
          <DriverApprovedNote>
            Saving files it on your device only. Sending is a separate action you approve.
          </DriverApprovedNote>
        </div>
      </Panel>

      {/* List */}
      <Panel>
        <PanelTitle right={<Pill tone="info">{sets.length} documents</Pill>}>
          Documents by load
        </PanelTitle>
        <div className="space-y-3">
          {grouped.map((g) => (
            <div key={g.load}>
              <div className="flex items-center justify-between gap-2">
                <span className="font-display text-base uppercase tracking-[0.12em]">{g.load}</span>
                <span className="text-xs text-muted-foreground">
                  {g.items.length} document{g.items.length === 1 ? "" : "s"}
                </span>
              </div>
              <div className="mt-1.5 space-y-2">
                {g.items.map((d) => (
                  <div
                    key={d.id}
                    className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card/60 p-3"
                  >
                    <div className="flex h-16 w-14 shrink-0 items-center justify-center rounded-md border border-border/70 bg-secondary/60">
                      <FileText className="h-7 w-7 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-display text-sm uppercase tracking-[0.1em]">
                        {docTypeLabel(d.type)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {d.id} · {d.date} · {d.pages} page{d.pages === 1 ? "" : "s"}
                      </div>
                      {d.note ? (
                        <div className="truncate text-xs text-muted-foreground">{d.note}</div>
                      ) : null}
                      {d.sentTo ? <div className="text-xs text-go">Sent to {d.sentTo}</div> : null}
                    </div>
                    <Pill tone={statusTone[d.status]}>{d.status}</Pill>
                    <Button
                      variant="outline"
                      size="lg"
                      className="gap-2"
                      onClick={() => setSending(d)}
                    >
                      <Send className="h-4 w-4" />
                      Send to…
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Dialog open={!!sending} onOpenChange={(o) => !o && setSending(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl uppercase">Send this document set</DialogTitle>
            <DialogDescription>
              HERCULES never sends paperwork on its own. Pick where it goes and approve it.
            </DialogDescription>
          </DialogHeader>
          {sending ? (
            <div className="space-y-2 text-sm">
              <div className="rounded-lg border border-border bg-card/70 p-3">
                <div className="font-display text-lg">{docTypeLabel(sending.type)}</div>
                <p className="text-muted-foreground">
                  {sending.load} · {sending.id} · {sending.pages} page
                  {sending.pages === 1 ? "" : "s"}
                </p>
              </div>
              <div className="space-y-1.5">
                {sendTargets.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTarget(t.id)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors",
                      t.id === target
                        ? "border-primary/60 bg-primary/12"
                        : "border-border hover:bg-accent",
                    )}
                  >
                    {t.id === "email" ? (
                      <Mail className="h-5 w-5 text-primary" />
                    ) : t.id === "broker" ? (
                      <Building2 className="h-5 w-5 text-primary" />
                    ) : (
                      <Banknote className="h-5 w-5 text-primary" />
                    )}
                    <span className="min-w-0">
                      <span className="block font-display text-sm uppercase tracking-[0.1em]">
                        {t.label}
                      </span>
                      <span className="block text-xs text-muted-foreground">{t.detail}</span>
                    </span>
                  </button>
                ))}
              </div>
              {target === "email" ? (
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  inputMode="email"
                  aria-label="Email address"
                  className="w-full rounded-lg border border-border bg-card/70 p-3 text-sm outline-none focus:border-primary/60"
                />
              ) : null}
              <DriverApprovedNote />
            </div>
          ) : null}
          <DialogFooter className="gap-2">
            <Button variant="ghost" size="lg" onClick={() => setSending(null)}>
              Cancel
            </Button>
            <Button
              size="lg"
              className="gap-2"
              onClick={() => {
                if (sending) {
                  const dest =
                    target === "email"
                      ? email
                      : (sendTargets.find((t) => t.id === target)?.detail ?? "recipient");
                  setSets((prev) =>
                    prev.map((s) =>
                      s.id === sending.id ? { ...s, status: "Sent" as DocStatus, sentTo: dest } : s,
                    ),
                  );
                  toast.success(`${sending.id} sent to ${dest}`, {
                    description: "Sent on your approval. A copy stays filed under the load.",
                  });
                }
                setSending(null);
              }}
            >
              <Check className="h-5 w-5" /> Yes, send it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DocumentsPage() {
  const { ready, owns } = usePurchases();
  const unlocked = owns("documents");

  return (
    <AppShell
      title="Documents"
      subtitle={
        unlocked
          ? "Snap it, tag it to the load, send it only when you approve"
          : "Paperwork capture — one-time unlock, never a subscription add-on"
      }
    >
      {!ready ? null : unlocked ? <Documents /> : <UnlockScreen />}
    </AppShell>
  );
}
