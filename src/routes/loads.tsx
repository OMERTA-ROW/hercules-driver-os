import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Package, Check, X, MapPin } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/hercules/AppShell";
import {
  Panel,
  PanelTitle,
  Pill,
  Label,
  Metric,
  EmptyState,
  DriverApprovedNote,
} from "@/components/hercules/primitives";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import {
  money,
  place,
  useAvailableLoads,
  useMyLoads,
  useRefreshLive,
  type LoadRow,
} from "@/lib/live";

export const Route = createFileRoute("/loads")({
  head: () => ({
    meta: [
      { title: "Load Board — HERCULES" },
      {
        name: "description",
        content:
          "Real freight posted into the HERCULES network, with rate, miles, and windows. Nothing is booked until you approve it.",
      },
      { property: "og:title", content: "Load Board — HERCULES" },
      {
        property: "og:description",
        content: "Rate, miles, and rate per mile on live postings — booked only on your word.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Loads,
});

function rpm(l: LoadRow) {
  if (!l.rate_cents || !l.miles) return null;
  return l.rate_cents / 100 / l.miles;
}

function when(iso: string | null) {
  return iso ? new Date(iso).toLocaleString() : "Window not posted";
}

function Loads() {
  const { account, userId } = useAuth();
  const available = useAvailableLoads();
  const mine = useMyLoads();
  const refresh = useRefreshLive();
  const [pending, setPending] = useState<LoadRow | null>(null);

  async function book(load: LoadRow) {
    if (!userId) return;
    const { error } = await supabase
      .from("loads")
      .update({ status: "booked", assigned_driver_id: userId })
      .eq("id", load.id)
      .eq("status", "available");
    setPending(null);
    if (error) {
      toast.error("Could not book that load", { description: error.message });
      return;
    }
    toast.success("Booked on your approval", {
      description: `${place(load.origin_city, load.origin_state)} → ${place(load.dest_city, load.dest_state)}`,
    });
    refresh();
  }

  const rows = available.data ?? [];

  return (
    <AppShell
      title="Load Board"
      subtitle={rows.length > 0 ? `${rows.length} posted on your lanes` : "No freight posted yet"}
    >
      <div className="grid gap-4">
        <Panel>
          <PanelTitle right={<Pill tone="primary">Live postings</Pill>}>Available freight</PanelTitle>

          {!account ? (
            <EmptyState title="Sign in to see the board">
              Freight is posted into your account by brokers and fleets on the network.
            </EmptyState>
          ) : available.isLoading ? (
            <p className="text-sm text-muted-foreground">Reading the board…</p>
          ) : rows.length === 0 ? (
            <EmptyState title="No loads available">
              Nothing is posted on the network right now. When a broker or your fleet posts freight,
              it lands here and HERCULES reads the best ones aloud.
            </EmptyState>
          ) : (
            <ul className="space-y-3">
              {rows.map((l) => {
                const perMile = rpm(l);
                return (
                  <li key={l.id} className="rounded-lg border border-border bg-card/50 p-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Pill tone="primary">
                            <Package className="h-3.5 w-3.5" /> {l.reference ?? l.id.slice(0, 8)}
                          </Pill>
                          {l.broker_name ? <Pill tone="neutral">{l.broker_name}</Pill> : null}
                          {l.equipment_type ? <Pill tone="info">{l.equipment_type}</Pill> : null}
                        </div>
                        <div className="mt-2 flex items-center gap-2 font-display text-base uppercase tracking-[0.08em]">
                          <MapPin className="h-4 w-4 text-primary" />
                          {place(l.origin_city, l.origin_state)} →{" "}
                          {place(l.dest_city, l.dest_state)}
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {l.commodity ?? "Commodity not posted"}
                          {l.weight_lb ? ` · ${l.weight_lb.toLocaleString()} lbs` : ""}
                        </p>
                        <Label className="mt-1">
                          Pickup {when(l.pickup_at)} · Deliver {when(l.deliver_at)}
                        </Label>
                      </div>
                      <div className="text-right">
                        <Metric value={money(l.rate_cents)} tone="primary" />
                        <Label>
                          {l.miles ? `${l.miles.toLocaleString()} mi` : "Miles not posted"}
                          {perMile ? ` · $${perMile.toFixed(2)}/mi` : ""}
                        </Label>
                        <Button
                          size="lg"
                          className="mt-2 w-full gap-2"
                          onClick={() => setPending(l)}
                        >
                          <Check className="h-4 w-4" /> Review and book
                        </Button>
                      </div>
                    </div>

                    {pending?.id === l.id ? (
                      <div className="mt-3 rounded-lg border border-primary/40 bg-primary/10 p-3">
                        <div className="font-display text-sm uppercase tracking-[0.12em] text-primary">
                          Book this load?
                        </div>
                        <p className="mt-1 text-sm">
                          {place(l.origin_city, l.origin_state)} →{" "}
                          {place(l.dest_city, l.dest_state)} for {money(l.rate_cents)}. Nothing is
                          committed until you say yes.
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button size="lg" className="gap-2" onClick={() => void book(l)}>
                            <Check className="h-4 w-4" /> Yes — book it
                          </Button>
                          <Button
                            size="lg"
                            variant="outline"
                            className="gap-2"
                            onClick={() => setPending(null)}
                          >
                            <X className="h-4 w-4" /> No
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
          <div className="mt-3">
            <DriverApprovedNote />
          </div>
        </Panel>

        <Panel>
          <PanelTitle>Your loads</PanelTitle>
          {!account ? (
            <EmptyState title="Sign in to see your runs" />
          ) : (mine.data ?? []).length === 0 ? (
            <EmptyState title="Nothing booked">
              Loads you book show here with their status through pickup, transit, and delivery.
            </EmptyState>
          ) : (
            <ul className="space-y-2">
              {(mine.data ?? []).map((l) => (
                <li
                  key={l.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card/50 p-3"
                >
                  <div>
                    <div className="font-display text-sm uppercase tracking-[0.1em]">
                      {place(l.origin_city, l.origin_state)} →{" "}
                      {place(l.dest_city, l.dest_state)}
                    </div>
                    <Label>
                      {l.reference ?? l.id.slice(0, 8)} · {money(l.rate_cents)}
                    </Label>
                  </div>
                  <Pill tone={l.status === "delivered" ? "go" : "primary"}>
                    {l.status.replace(/_/g, " ")}
                  </Pill>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </AppShell>
  );
}
