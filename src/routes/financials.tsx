import { createFileRoute } from "@tanstack/react-router";
import { Fuel, Receipt, Timer, Map } from "lucide-react";
import { AppShell } from "@/components/hercules/AppShell";
import { PlanGate } from "@/components/hercules/PlanGate";
import {
  Panel,
  PanelTitle,
  Label,
  Metric,
  Pill,
  money,
  money2,
} from "@/components/hercules/primitives";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  settlements,
  loadPnL,
  fuelStops,
  iftaByState,
  detention,
  weeklySeries,
} from "@/data/mock";

export const Route = createFileRoute("/financials")({
  head: () => ({
    meta: [
      { title: "Financials — HERCULES" },
      {
        name: "description",
        content:
          "Profit and loss per load and per mile, settlements, fuel and IFTA tracking, detention time, and running weekly and monthly totals.",
      },
      { property: "og:title", content: "Financials — HERCULES" },
      {
        property: "og:description",
        content: "The back office an owner-operator never had: P&L, settlements, IFTA, detention.",
      },
    ],
  }),
  component: Financials,
});

function Financials() {
  const weekRevenue = weeklySeries.reduce((a, d) => a + d.revenue, 0);
  const weekCost = weeklySeries.reduce((a, d) => a + d.cost, 0);
  const weekMiles = loadPnL.reduce((a, l) => a + l.miles, 0);
  const weekProfit = weekRevenue - weekCost;
  const maxBar = Math.max(...weeklySeries.map((d) => d.revenue)) || 1;

  return (
    <AppShell title="Financials" subtitle="Week of Sep 1 · running totals update as you roll">
      <PlanGate feature="financials">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Panel>
          <Label>Revenue this week</Label>
          <Metric value={money(weekRevenue)} tone="primary" />
          <p className="mt-1 text-xs text-muted-foreground">Month to date {money(24680)}</p>
        </Panel>
        <Panel>
          <Label>Net profit this week</Label>
          <Metric value={money(weekProfit)} tone="go" />
          <p className="mt-1 text-xs text-muted-foreground">Month to date {money(16240)}</p>
        </Panel>
        <Panel>
          <Label>Profit per mile</Label>
          <Metric value={money2(weekProfit / weekMiles)} unit="/mi" tone="go" />
          <p className="mt-1 text-xs text-muted-foreground">{weekMiles.toLocaleString()} paid miles</p>
        </Panel>
        <Panel>
          <Label>Cost per mile</Label>
          <Metric value={money2(weekCost / weekMiles)} unit="/mi" tone="warn" />
          <p className="mt-1 text-xs text-muted-foreground">Fuel, tolls, lumpers, fixed</p>
        </Panel>
      </div>

      <div className="mt-3 grid gap-3 xl:grid-cols-[1.4fr_1fr]">
        <Panel>
          <PanelTitle right={<Pill tone="primary">Per load</Pill>}>Profit & Loss</PanelTitle>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Load</TableHead>
                  <TableHead>Lane</TableHead>
                  <TableHead className="text-right">Miles</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Fuel</TableHead>
                  <TableHead className="text-right">Tolls</TableHead>
                  <TableHead className="text-right">Other</TableHead>
                  <TableHead className="text-right">Profit</TableHead>
                  <TableHead className="text-right">$ / mi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadPnL.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="metric">{l.id}</TableCell>
                    <TableCell>{l.lane}</TableCell>
                    <TableCell className="metric text-right">{l.miles}</TableCell>
                    <TableCell className="metric text-right">{money(l.revenue)}</TableCell>
                    <TableCell className="metric text-right">{money(l.fuel)}</TableCell>
                    <TableCell className="metric text-right">{money(l.tolls)}</TableCell>
                    <TableCell className="metric text-right">{money(l.other)}</TableCell>
                    <TableCell className="metric text-right font-bold text-go">
                      {money(l.profit)}
                    </TableCell>
                    <TableCell className="metric text-right text-primary">
                      {money2(l.profit / l.miles)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Panel>

        <Panel>
          <PanelTitle right={<Pill tone="info">7 days</Pill>}>Weekly Revenue</PanelTitle>
          <div className="flex h-52 items-end gap-2">
            {weeklySeries.map((d) => (
              <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
                <div className="flex h-full w-full items-end gap-0.5">
                  <div
                    className="w-full rounded-t bg-primary"
                    style={{ height: `${(d.revenue / maxBar) * 100}%` }}
                  />
                  <div
                    className="w-2/5 rounded-t bg-warn/70"
                    style={{ height: `${(d.cost / maxBar) * 100}%` }}
                  />
                </div>
                <span className="label-cap">{d.day}</span>
              </div>
            ))}
          </div>
          <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-3 rounded bg-primary" /> Revenue
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-3 rounded bg-warn/70" /> Cost
            </span>
          </div>
        </Panel>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-3">
        <Panel>
          <PanelTitle
            right={
              <Pill tone="neutral">
                <Receipt className="h-3.5 w-3.5" /> 3 recent
              </Pill>
            }
          >
            Settlements
          </PanelTitle>
          <div className="space-y-2">
            {settlements.map((s) => (
              <div key={s.id} className="rounded-lg border border-border bg-card/60 p-3">
                <div className="flex items-center justify-between">
                  <span className="font-display">{s.period}</span>
                  <Pill tone={s.status === "Paid" ? "go" : "watch"}>{s.status}</Pill>
                </div>
                <div className="mt-1 grid grid-cols-3 text-sm">
                  <div>
                    <Label>Gross</Label>
                    <span className="metric">{money(s.gross)}</span>
                  </div>
                  <div>
                    <Label>Deductions</Label>
                    <span className="metric text-warn">-{money(s.deductions)}</span>
                  </div>
                  <div>
                    <Label>Net</Label>
                    <span className="metric font-bold text-go">{money(s.net)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <PanelTitle
            right={
              <Pill tone="primary">
                <Fuel className="h-3.5 w-3.5" /> {money2(3.58)} avg
              </Pill>
            }
          >
            Fuel & IFTA
          </PanelTitle>
          <div className="space-y-1.5">
            {fuelStops.map((f) => (
              <div
                key={f.station}
                className="flex items-center justify-between gap-2 rounded-md border border-border bg-card/60 px-3 py-2 text-sm"
              >
                <span className="min-w-0 truncate">{f.station}</span>
                <span className="metric shrink-0">
                  {f.gallons} gal · {money2(f.total)}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-3">
            <Label className="mb-1">IFTA by state (quarter)</Label>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>State</TableHead>
                  <TableHead className="text-right">Miles</TableHead>
                  <TableHead className="text-right">Gallons</TableHead>
                  <TableHead className="text-right">Net</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {iftaByState.map((s) => (
                  <TableRow key={s.state}>
                    <TableCell className="metric flex items-center gap-1.5">
                      <Map className="h-3.5 w-3.5 text-muted-foreground" />
                      {s.state}
                    </TableCell>
                    <TableCell className="metric text-right">{s.miles}</TableCell>
                    <TableCell className="metric text-right">{s.gallons}</TableCell>
                    <TableCell
                      className={
                        "metric text-right " + (s.net < 0 ? "text-go" : "text-warn")
                      }
                    >
                      {money2(s.net)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Panel>

        <Panel>
          <PanelTitle
            right={
              <Pill tone="watch">
                <Timer className="h-3.5 w-3.5" /> {money(124)} billed
              </Pill>
            }
          >
            Detention Tracking
          </PanelTitle>
          <div className="space-y-2">
            {detention.map((d) => (
              <div key={d.load} className="rounded-lg border border-border bg-card/60 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-display">{d.facility}</span>
                  <Pill tone={d.status === "Paid" ? "go" : d.status === "Invoiced" ? "info" : "neutral"}>
                    {d.status}
                  </Pill>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {d.load} · waited {d.waited} · billable {d.billable}
                </p>
                <div className="metric mt-1 text-lg font-bold text-primary">{money(d.amount)}</div>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            HERCULES starts a timer when you arrive and asks before it bills anything.
          </p>
        </Panel>
      </div>
      </PlanGate>
    </AppShell>
  );
}
