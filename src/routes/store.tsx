import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Zap, Check, ShieldCheck, FileText, Cable } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/hercules/AppShell";
import { Panel, PanelTitle, Label, Pill, DriverApprovedNote } from "@/components/hercules/primitives";
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
import { BOLT } from "@/data/bolt";
import { DOC_UPLOAD_PRICE } from "@/data/documents";

export const Route = createFileRoute("/store")({
  head: () => ({
    meta: [
      { title: "Store — THE BOLT and HERCULES add-ons" },
      {
        name: "description",
        content:
          "THE BOLT is the HERCULES J1939 nine-pin ECU reader that streams live engine data to the app. One-time purchase, separate from your subscription. HERCULES products only.",
      },
      { property: "og:title", content: "Store — THE BOLT and HERCULES add-ons" },
      {
        property: "og:description",
        content:
          "HERCULES-built hardware and unlocks. THE BOLT streams live engine diagnostics over Bluetooth; nothing is charged without your approval.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StorePage,
});

function StorePage() {
  const { owns, purchase } = usePurchases();
  const [confirming, setConfirming] = useState<null | "bolt" | "documents">(null);
  const hasBolt = owns("bolt");
  const hasDocs = owns("documents");

  const confirmLabel =
    confirming === "bolt"
      ? `${BOLT.name} — ${BOLT.priceLabel} one time`
      : `Document Upload — $${DOC_UPLOAD_PRICE}.00 one time`;

  return (
    <AppShell title="Store" subtitle="HERCULES-built products only · no third-party items">
      <div className="grid gap-3 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <PanelTitle
            right={
              hasBolt ? (
                <Pill tone="go">
                  <Check className="h-3.5 w-3.5" /> Owned
                </Pill>
              ) : (
                <Pill tone="primary">One-time purchase</Pill>
              )
            }
          >
            THE BOLT
          </PanelTitle>

          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="flex aspect-square w-full max-w-[220px] shrink-0 items-center justify-center rounded-xl border border-primary/35 bg-background shadow-[0_0_40px_-14px_var(--primary)]">
              <Zap className="h-24 w-24 text-primary drop-shadow-[0_0_18px_var(--primary)]" />
            </div>

            <div className="min-w-0 flex-1">
              <Label>{BOLT.tagline}</Label>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="metric text-4xl font-bold text-primary">{BOLT.priceLabel}</span>
                <span className="text-sm text-muted-foreground">one time · no monthly fee</span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{BOLT.summary}</p>

              <ul className="mt-3 space-y-1.5">
                {BOLT.unlocks.map((u) => (
                  <li key={u} className="flex items-start gap-2 text-sm">
                    <Zap className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{u}</span>
                  </li>
                ))}
              </ul>

              <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
                <Cable className="mt-0.5 h-4 w-4 shrink-0 text-primary/80" />
                {BOLT.compatibility}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                In the box: {BOLT.inBox.join(" · ")} · SKU {BOLT.sku}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {hasBolt ? (
                  <Button asChild size="lg">
                    <Link to="/health">Pair it on Truck Health</Link>
                  </Button>
                ) : (
                  <Button size="lg" onClick={() => setConfirming("bolt")}>
                    Buy {BOLT.name} — {BOLT.priceLabel} one time
                  </Button>
                )}
                <Button asChild size="lg" variant="outline">
                  <Link to="/health">See what it streams</Link>
                </Button>
              </div>
            </div>
          </div>
        </Panel>

        <div className="space-y-3">
          <Panel>
            <PanelTitle
              right={
                hasDocs ? (
                  <Pill tone="go">
                    <Check className="h-3.5 w-3.5" /> Owned
                  </Pill>
                ) : (
                  <Pill tone="primary">${DOC_UPLOAD_PRICE} one time</Pill>
                )
              }
            >
              Document Upload
            </PanelTitle>
            <FileText className="h-10 w-10 text-primary" />
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Photograph your BOL, rate con, POD and receipts in the cab, group them by load, and
              send them when you approve it. One-time charge — not a subscription, never recurring.
            </p>
            <div className="mt-3">
              {hasDocs ? (
                <Button asChild size="lg" className="w-full">
                  <Link to="/documents" search={{ load: undefined, type: undefined, capture: false }}>
                    Open Documents
                  </Link>
                </Button>
              ) : (
                <Button size="lg" className="w-full" onClick={() => setConfirming("documents")}>
                  Unlock — ${DOC_UPLOAD_PRICE}.00 one time
                </Button>
              )}
            </div>
          </Panel>

          <Panel>
            <PanelTitle>HERCULES only</PanelTitle>
            <p className="flex items-start gap-2 text-sm text-muted-foreground">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              Everything in this store is built by us. No third-party gear, no resold products, no
              affiliate items anywhere in the app.
            </p>
            <div className="mt-3">
              <DriverApprovedNote>
                Nothing is charged until you confirm the exact amount on the screen.
              </DriverApprovedNote>
            </div>
          </Panel>
        </div>
      </div>

      <Dialog open={confirming !== null} onOpenChange={(o) => !o && setConfirming(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm this one-time purchase</DialogTitle>
            <DialogDescription>
              {confirmLabel}. This is a single charge, not a subscription and not recurring. Nothing
              is charged until you tap Confirm.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" size="lg" onClick={() => setConfirming(null)}>
              Cancel
            </Button>
            <Button
              size="lg"
              onClick={() => {
                if (!confirming) return;
                purchase(confirming);
                toast.success(
                  confirming === "bolt"
                    ? `${BOLT.name} purchased — pair it on Truck Health`
                    : "Document Upload unlocked permanently",
                );
                setConfirming(null);
              }}
            >
              Confirm {confirming === "bolt" ? BOLT.priceLabel : `$${DOC_UPLOAD_PRICE}.00`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
