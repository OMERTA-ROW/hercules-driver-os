import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { rpc, useFreight, useLoads, useTeam, when } from "@/lib/freight";
import { useInvalidate, useRows } from "@/lib/freight-data";
import { Badge, Card, Empty, Field, FButton, FInput, FSelect, FTextarea, Loading, PageHeader } from "@/components/freight/ui";

export const Route = createFileRoute("/_authenticated/messages")({
  head: () => ({ meta: [{ title: "Messages — Hercules Freight OS" }, { name: "description", content: "Load and driver conversations." }] }),
  component: Messages,
});

type Conv = { id: string; subject: string; load_id: string | null; driver_user_id: string | null; shipper_visible: boolean; created_at: string };
type Msg = { id: string; author: string; body: string; created_at: string; conversation_id: string };

function Messages() {
  const { company, has, userId } = useFreight();
  const convs = useRows<Conv>("freight_conversations", company?.id);
  const [sel, setSel] = useState<string | null>(null);
  const mgr = has("admin", "dispatcher", "broker");
  if (convs.isLoading) return <Loading />;
  const list = convs.data ?? [];
  const cur = list.find((c) => c.id === sel) ?? list[0];
  return (
    <>
      <PageHeader title="Messages" />
      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        <div className="space-y-3">
          {mgr && <NewConv onMade={setSel} />}
          {list.length === 0 ? <Empty icon={MessageSquare} title="No conversations" body={mgr ? "Start one with a driver or about a load." : "Dispatch will message you here."} /> : (
            <ul className="hfo-card divide-y divide-border p-0">
              {list.map((c) => (
                <li key={c.id}><button onClick={() => setSel(c.id)} aria-current={cur?.id === c.id} className={`w-full p-3 text-left text-sm ${cur?.id === c.id ? "bg-surface" : ""}`}><p className="font-semibold">{c.subject}</p><p className="text-xs text-muted-foreground">{when(c.created_at)}{c.shipper_visible ? " · Customer visible" : ""}</p></button></li>
              ))}
            </ul>
          )}
        </div>
        {cur && <Thread c={cur} me={userId} />}
      </div>
    </>
  );
}

function NewConv({ onMade }: { onMade: (id: string) => void }) {
  const { company, userId } = useFreight();
  const team = useTeam(company?.id);
  const loads = useLoads(company?.id);
  const inv = useInvalidate();
  const [subject, setSubject] = useState("");
  const [driver, setDriver] = useState("");
  const [load, setLoad] = useState("");
  const [open, setOpen] = useState(false);
  const make = async (e: FormEvent) => {
    e.preventDefault();
    const { data, error } = await supabase.from("freight_conversations").insert({ company_id: company!.id, created_by: userId!, subject, driver_user_id: driver || null, load_id: load || null }).select("id").single();
    if (error) return toast.error("Couldn't start that conversation.");
    setOpen(false);
    setSubject("");
    void inv();
    onMade(data.id);
  };
  if (!open) return <FButton className="w-full" onClick={() => setOpen(true)}>New conversation</FButton>;
  return (
    <Card>
      <form onSubmit={make} className="space-y-3">
        <Field label="Subject" required><FInput required minLength={2} value={subject} onChange={(e) => setSubject(e.target.value)} /></Field>
        <Field label="Driver"><FSelect value={driver} onChange={(e) => setDriver(e.target.value)}><option value="">Internal only</option>{(team.data ?? []).filter((m) => m.roles.includes("driver")).map((m) => <option key={m.user_id} value={m.user_id}>{m.name ?? m.email}</option>)}</FSelect></Field>
        <Field label="Load"><FSelect value={load} onChange={(e) => setLoad(e.target.value)}><option value="">None</option>{(loads.data ?? []).map((l) => <option key={l.id} value={l.id}>{l.reference}</option>)}</FSelect></Field>
        <div className="flex gap-2"><FButton type="submit">Start</FButton><FButton type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</FButton></div>
      </form>
    </Card>
  );
}

function Thread({ c, me }: { c: Conv; me: string | null }) {
  const { company, has } = useFreight();
  const msgs = useRows<Msg>("freight_messages", company?.id, { eq: { conversation_id: c.id }, ascending: true });
  const inv = useInvalidate();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const needsApproval = c.shipper_visible && !has("shipper");
  const send = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    if (needsApproval) {
      const r = await rpc("freight_approval_request", { _company: company!.id, _action: "customer_message", _load: c.load_id, _payload: { conversation_id: c.id, body }, _reason: "Customer message", _why: "Messages customers can see are approved first" });
      r.ok ? toast.success("Sent for approval before the customer sees it.") : toast.error(r.message);
    } else {
      const { error } = await supabase.from("freight_messages").insert({ company_id: company!.id, conversation_id: c.id, author: me!, body });
      if (error) toast.error("Message didn't send.");
    }
    setBusy(false);
    setBody("");
    void inv();
  };
  return (
    <Card className="flex min-h-[420px] flex-col">
      <div className="flex items-center gap-2"><h2 className="text-lg font-semibold">{c.subject}</h2>{c.shipper_visible && <Badge tone="warn">Customer visible</Badge>}</div>
      <ol className="mt-4 flex-1 space-y-3">
        {(msgs.data ?? []).length === 0 && <li className="text-sm text-muted-foreground">No messages yet.</li>}
        {(msgs.data ?? []).map((m) => (
          <li key={m.id} className={`max-w-[80%] rounded-xl p-3 text-sm ${m.author === me ? "ml-auto bg-primary text-primary-foreground" : "bg-surface"}`}>
            <p className="whitespace-pre-wrap">{m.body}</p><p className="mt-1 text-[11px] opacity-70">{when(m.created_at)}</p>
          </li>
        ))}
      </ol>
      <form onSubmit={send} className="mt-4 flex gap-2">
        <FTextarea rows={2} required maxLength={4000} aria-label="Message" value={body} onChange={(e) => setBody(e.target.value)} className="flex-1" />
        <FButton type="submit" busy={busy} disabled={!body.trim()}>Send</FButton>
      </form>
    </Card>
  );
}
