import { createFileRoute } from "@tanstack/react-router";
import { DollarSign, Fuel, Receipt } from "lucide-react";
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
import { useAuth } from "@/lib/auth";
import { money, useMileage, useMoneyEntries, useMoneySummary } from "@/lib/live";

export const Route = createFileRoute("/financials")({
  head: () => ({
    meta: [
      { title: "Financials — HERCULES" },
      {
        name: "description",
        content:
          "Revenue, fuel, and net from your own logged entries. No estimates, no sample settlements — only what you have recorded.",
      },
      { property: "og:title", content: "Financials — HERCULES" },
      {
        property: "og:description",
        content: "Your money, computed from your own rows.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Financials,
});

function Financials() {
  const { account } = useAuth();
  const entries = useMoneyEntries();
  const summary = useMoneySummary();
  const miles = useMileage();
  const rows = entries.data ?? [];

  const monthMiles = miles.month;
  const perMile =
    monthMiles > 0 && summary.month.revenue > 0 ? summary.month.revenue / 100 / monthMiles : null;

  return (
    <AppShell title="Financials" subtitle="Computed from your own entries only">
      <div className="grid gap-4">
        {!account ? (
          <Panel>
            <EmptyState title="Sign in to see your money">
              Settlements, fuel, and net are read from your own records.
            </EmptyState>
          </Panel>
        ) : !summary.hasData ? (
          <Panel>
            <PanelTitle right={<Pill tone="primary">Nothing logged</Pill>}>Last 30 days</PanelTitle>
            <EmptyState title="No financial entries yet">
              Log a settlement, a fuel purchase, or a lumper and HERCULES will keep the running
              revenue, cost, and profit per mile from there. It will not estimate on your behalf.
            </EmptyState>
          </Panel>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <Panel>
                <Label>Revenue · 30 days</Label>
                <Metric value={money(summary.month.revenue)} tone="go" />
              </Panel>
              <Panel>
                <Label>Cost · 30 days</Label>
                <Metric value={money(summary.month.cost)} tone="warn" />
              </Panel>
              <Panel>
                <Label>Net · 30 days</Label>
                <Metric value={money(summary.month.net)} tone="primary" />
              </Panel>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Panel>
                <Label>Miles this month</Label>
                <Metric
                  value={monthMiles > 0 ? monthMiles.toLocaleString() : "—"}
                  unit="mi"
                />
                <p className="mt-1 text-sm text-muted-foreground">
                  {miles.hasData
                    ? "From your logged trips."
                    : "No trips logged yet — miles stay blank rather than guessed."}
                </p>
              </Panel>
              <Panel>
                <Label>Revenue per mile</Label>
                <Metric
                  value={perMile ? `$${perMile.toFixed(2)}` : "—"}
                  tone="primary"
                />
                <p className="mt-1 text-sm text-muted-foreground">
                  {perMile
                    ? "Revenue divided by your own logged miles."
                    : "Needs both revenue and logged miles."}
                </p>
              </Panel>
            </div>

            <Panel>
              <PanelTitle right={<Pill tone="neutral">{rows.length} entries</Pill>}>
                Entries
              </PanelTitle>
              <ul className="space-y-2">
                {rows.map((r) => (
                  <li
                    key={r.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card/50 p-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 font-display text-sm uppercase tracking-[0.1em]">
                        {r.category === "fuel" ? (
                          <Fuel className="h-4 w-4 text-primary" />
                        ) : r.amount_cents > 0 ? (
                          <DollarSign className="h-4 w-4 text-go" />
                        ) : (
                          <Receipt className="h-4 w-4 text-warn" />
                        )}
                        {r.category}
                      </div>
                      <Label>
                        {new Date(r.entry_date).toLocaleDateString()}
                        {r.description ? ` · ${r.description}` : ""}
                        {r.gallons ? ` · ${r.gallons} gal` : ""}
                      </Label>
                    </div>
                    <span
                      className={
                        r.amount_cents >= 0
                          ? "metric font-bold text-go"
                          : "metric font-bold text-warn"
                      }
                    >
                      {money(Math.abs(r.amount_cents))}
                    </span>
                  </li>
                ))}
              </ul>
            </Panel>
          </>
        )}

        <Panel>
          <DriverApprovedNote>
            HERCULES only reports what you have recorded. It never invoices, factors, or pays
            anything without your explicit approval.
          </DriverApprovedNote>
        </Panel>
      </div>
    </AppShell>
  );
}
