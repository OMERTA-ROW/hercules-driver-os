import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Zap, Check, ShieldCheck, FileText, Cable, Mic } from "lucide-react";
import { toast } from "sonner";
import { toast as notify } from "sonner";
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
import { usePurchases, type PurchaseId } from "@/lib/purchases";
import { useAddons } from "@/lib/addons";
import { addonById } from "@/data/addons";
import { adapters, adapterForSpec, type AdapterProduct } from "@/data/bolt";
import { useVehicle } from "@/lib/vehicles";
import { DOC_UPLOAD_PRICE } from "@/data/documents";

export const Route = createFileRoute("/store")({
  head: () => ({
    meta: [
      { title: "Store — THE BOLT adapters and HERCULES add-ons" },
      {
        name: "description",
        content:
          "Two HERCULES ECU adapters: the J1939 nine-pin for heavy trucks and the OBD-II sixteen-pin for cars, vans, Sprinters and hotshot pickups. One-time purchases, separate from your subscription.",
      },
      { property: "og:title", content: "Store — THE BOLT adapters and HERCULES add-ons" },
      {
        property: "og:description",
        content:
          "HERCULES-built hardware and unlocks. Pick your vehicle profile and HERCULES tells you which adapter you need; nothing is charged without your approval.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StorePage,
});

function AdapterCard({
  adapter,
  recommended,
  owned,
  onBuy,
}: {
  adapter: AdapterProduct;
  recommended: boolean;
  owned: boolean;
  onBuy: () => void;
}) {
  return (
    <Panel className={recommended ? "border-primary/45" : undefined}>
      <PanelTitle
        right={
          owned ? (
            <Pill tone="go">
              <Check className="h-3.5 w-3.5" /> Owned
            </Pill>
          ) : (
            <Pill tone="primary">One-time purchase</Pill>
          )
        }
      >
        {adapter.name}
      </PanelTitle>

      {recommended ? (
        <p className="mb-3 rounded-lg border border-primary/40 bg-primary/8 p-3 text-sm">
          <span className="font-display uppercase tracking-[0.12em] text-primary">
            This is the one you need.
          </span>{" "}
          Your saved equipment profile plugs into the {adapter.portName}.
        </p>
      ) : null}

      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="flex aspect-square w-full max-w-[180px] shrink-0 items-center justify-center rounded-xl border border-primary/35 bg-background shadow-[0_0_40px_-14px_var(--primary)]">
          <Zap className="h-20 w-20 text-primary drop-shadow-[0_0_18px_var(--primary)]" />
        </div>

        <div className="min-w-0 flex-1">
          <Label>{adapter.tagline}</Label>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="metric text-4xl font-bold text-primary">{adapter.priceLabel}</span>
            <span className="text-sm text-muted-foreground">one time · no monthly fee</span>
          </div>
          <p className="mt-1 text-xs uppercase tracking-[0.12em] text-muted-foreground">
            {adapter.fits}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{adapter.summary}</p>

          <ul className="mt-3 space-y-1.5">
            {adapter.unlocks.map((u) => (
              <li key={u} className="flex items-start gap-2 text-sm">
                <Zap className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>{u}</span>
              </li>
            ))}
          </ul>

          <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
            <Cable className="mt-0.5 h-4 w-4 shrink-0 text-primary/80" />
            {adapter.compatibility}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            In the box: {adapter.inBox.join(" · ")} · SKU {adapter.sku}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {owned ? (
              <Button asChild size="lg">
                <Link to="/health">Pair it on Vehicle Health</Link>
              </Button>
            ) : (
              <Button size="lg" onClick={onBuy}>
                Buy {adapter.name} — {adapter.priceLabel} one time
              </Button>
            )}
            <Button asChild size="lg" variant="outline">
              <Link to="/health">See what it streams</Link>
            </Button>
          </div>
        </div>
      </div>
    </Panel>
  );
}

function StorePage() {
  const { owns, purchase } = usePurchases();
  const { has, toggle, monthlyTotal } = useAddons();
  const { active } = useVehicle();
  const handoff = addonById("voiceHandoff");
  const hasHandoff = has("voiceHandoff");
  const [confirming, setConfirming] = useState<null | PurchaseId>(null);
  const hasDocs = owns("documents");

  const recommended = adapterForSpec(active);
  const order: AdapterProduct[] = [adapters[recommended], adapters[recommended === "j1939" ? "obd2" : "j1939"]];

  const confirmProduct =
    confirming === "bolt" ? adapters.j1939 : confirming === "boltObd" ? adapters.obd2 : null;
  const confirmLabel = confirmProduct
    ? `${confirmProduct.name} — ${confirmProduct.priceLabel} one time`
    : `Document Upload — $${DOC_UPLOAD_PRICE}.00 one time`;

  return (
    <AppShell title="Store" subtitle="HERCULES-built products only · no third-party items">
      <Panel className="mb-3">
        <PanelTitle right={<Pill tone="primary">{adapters[recommended].priceLabel}</Pill>}>
          Which adapter your truck needs
        </PanelTitle>
        <p className="text-sm text-muted-foreground">
          You're set up as <span className="text-foreground">{active.label}</span>, so you want{" "}
          <span className="text-foreground">{adapters[recommended].name}</span> — the{" "}
          {adapters[recommended].portName}. Change your equipment profile and this changes with it.
        </p>
        <Button asChild size="lg" variant="outline" className="mt-3">
          <Link to="/equipment">Change my equipment profile</Link>
        </Button>
      </Panel>

      <div className="grid gap-3 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          {order.map((a) => (
            <AdapterCard
              key={a.kind}
              adapter={a}
              recommended={a.kind === recommended}
              owned={owns(a.purchaseId)}
              onBuy={() => setConfirming(a.purchaseId)}
            />
          ))}
        </div>

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
            <PanelTitle
              right={
                hasHandoff ? (
                  <Pill tone="go">
                    <Check className="h-3.5 w-3.5" /> On
                  </Pill>
                ) : (
                  <Pill tone="primary">$5 / month</Pill>
                )
              }
            >
              Voice Hand-Off Ordering
            </PanelTitle>
            <Mic className="h-10 w-10 text-primary" />
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{handoff.blurb}</p>
            <p className="mt-2 text-xs text-go">
              No per-order fee. The delivery app takes the payment — HERCULES only fills the order in
              for you.
            </p>
            <div className="mt-3 space-y-2">
              <Button
                size="lg"
                variant={hasHandoff ? "outline" : "default"}
                className="w-full"
                onClick={() => {
                  toggle("voiceHandoff");
                  notify.success(
                    hasHandoff ? "Voice Hand-Off Ordering switched off" : "Voice Hand-Off Ordering added",
                    {
                      description: hasHandoff
                        ? "Removed from your monthly total on your word."
                        : "$5.00 a month on top of your plan, on your word.",
                    },
                  );
                }}
              >
                {hasHandoff ? "Switch it off" : "Add it — $5.00 / month"}
              </Button>
              <Button asChild size="lg" variant="outline" className="w-full">
                <Link to="/settings">My monthly total — ${monthlyTotal.toFixed(2)}</Link>
              </Button>
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
                Nothing is charged until you confirm the exact amount on the screen. Hardware is
                optional and separate from your subscription.
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
                  confirmProduct
                    ? `${confirmProduct.name} purchased — pair it on Vehicle Health`
                    : "Document Upload unlocked permanently",
                );
                setConfirming(null);
              }}
            >
              Confirm {confirmProduct ? confirmProduct.priceLabel : `$${DOC_UPLOAD_PRICE}.00`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
