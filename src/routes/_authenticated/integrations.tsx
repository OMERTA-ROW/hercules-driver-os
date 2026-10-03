import { createFileRoute } from "@tanstack/react-router";
import { Plug } from "lucide-react";
import { useFreight, when } from "@/lib/freight";
import { useRows } from "@/lib/freight-data";
import { Badge, Card, ErrorNote, Loading, PageHeader, statusTone } from "@/components/freight/ui";

export const Route = createFileRoute("/_authenticated/integrations")({
  head: () => ({ meta: [{ title: "Integrations — Hercules Freight OS" }, { name: "description", content: "Provider connections and their real status." }] }),
  component: Integrations,
});

const CATS: { cat: string; label: string; need: string }[] = [
  { cat: "maps", label: "Maps & truck routing", need: "A commercial truck-routing provider account and server API key." },
  { cat: "eld", label: "ELD / telematics", need: "OAuth app credentials from your ELD vendor and a verified callback." },
  { cat: "load_board", label: "Load boards", need: "Load board API agreement and credentials (e.g. DAT, Truckstop)." },
  { cat: "accounting", label: "Accounting", need: "OAuth app for your accounting system (e.g. QuickBooks) with a verified callback." },
  { cat: "email", label: "Email", need: "A verified sending domain." },
  { cat: "sms", label: "SMS", need: "SMS provider account, sender number and API key." },
  { cat: "payments", label: "Payments", need: "Payment provider account. No live payments are processed until set up and verified." },
  { cat: "carrier_verification", label: "Carrier verification", need: "FMCSA or carrier-monitoring API credentials." },
];
const LABEL: Record<string, string> = { not_connected: "Not connected", connecting: "Connecting", approval_required: "Approval required", connected: "Connected", failed: "Failed", disconnected: "Disconnected" };

type I = { id: string; category: string; provider: string; status: string; verified_at: string | null; last_error: string | null; updated_at: string };

function Integrations() {
  const { company, has } = useFreight();
  const rows = useRows<I>("freight_integrations", company?.id, { order: "updated_at", enabled: has("admin") });
  if (!has("admin")) return <ErrorNote>Only company admins manage integrations.</ErrorNote>;
  if (rows.isLoading) return <Loading />;
  return (
    <>
      <PageHeader title="Integrations" sub="A provider shows Connected only after its sign-in callback and a verification check both succeed. File storage is built in." />
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between"><p className="font-semibold">Document storage</p><Badge tone="ok">Built in</Badge></div>
          <p className="mt-1 text-sm text-muted-foreground">Private company storage with signed downloads. No setup needed.</p>
        </Card>
        {CATS.map((c) => {
          const r = rows.data?.find((x) => x.category === c.cat);
          const st = r?.status ?? "not_connected";
          return (
            <Card key={c.cat}>
              <div className="flex items-center justify-between"><p className="flex items-center gap-2 font-semibold"><Plug className="h-4 w-4 text-muted-foreground" />{c.label}</p><Badge tone={statusTone(st)}>{LABEL[st]}</Badge></div>
              {r ? <p className="mt-1 text-sm">{r.provider}{r.verified_at ? ` · verified ${when(r.verified_at)}` : ""}{r.last_error ? ` · ${r.last_error}` : ""}</p> : <p className="mt-1 text-sm text-muted-foreground">No provider configured for this company.</p>}
              <p className="mt-2 text-xs text-muted-foreground"><strong>Needed to connect:</strong> {c.need}</p>
            </Card>
          );
        })}
      </div>
    </>
  );
}
