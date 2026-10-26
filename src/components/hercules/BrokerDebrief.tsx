import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { Inbox, AlertTriangle, FileText, CheckCheck, RefreshCw, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { useMemberships } from "@/lib/company";
import { useAccess } from "@/lib/access";
import { brokerDebrief, createBrokerIntake, approveBrokerPacket } from "@/lib/broker-intake.functions";
import { deliveryLabel, intakeCategories } from "@/lib/broker-intake";

export function BrokerDebrief() {
  const { userId } = useAuth();
  const access = useAccess();
  const memberships = useMemberships();
  const [company, setCompany] = useState("");
  const companyId = memberships.active.some(m => m.companyId === company) ? company : memberships.active[0]?.companyId;
  const identity = `${userId ?? ""}:${companyId ?? ""}`;
  const identityRef = useRef(identity);
  identityRef.current = identity;
  const read = useServerFn(brokerDebrief), create = useServerFn(createBrokerIntake), approve = useServerFn(approveBrokerPacket);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["broker-debrief", userId, companyId], enabled: !!userId && !!companyId && access.roles.includes("broker"), queryFn: () => { if (!companyId) throw new Error("Company required"); return read({ data: { companyId } }); } });
  const [reference, setReference] = useState("");
  const [origin, setOrigin] = useState(""); const [destination, setDestination] = useState("");
  const [subject, setSubject] = useState(""); const [notes, setNotes] = useState("");
  const [category, setCategory] = useState<(typeof intakeCategories)[number]>("load_offer"); const [urgent, setUrgent] = useState(false);
  const [busy, setBusy] = useState(false); const [review, setReview] = useState<string | null>(null);
  const [carrier, setCarrier] = useState(""); const [document, setDocument] = useState("");
  useEffect(() => { setReview(null); setCarrier(""); setDocument(""); setReference(""); setOrigin(""); setDestination(""); setSubject(""); setNotes(""); setBusy(false); setCategory("load_offer"); setUrgent(false); }, [userId, companyId]);
  const data = q.data;
  const counts = [data?.drafts.filter(d => d.status === "needs_review").length ?? 0, data?.drafts.filter(d => d.urgent && d.status === "needs_review").length ?? 0, data?.drafts.filter(d => d.category === "bol_packet" && d.status === "needs_review").length ?? 0, data?.drafts.filter(d => d.status === "needs_review" && d.origin && d.destination).length ?? 0];
  const selected = data?.drafts.find(d => d.id === review);
  const selectedCarrier = data?.carriers.find(c => c.id === carrier);
  const selectedDoc = data?.documents.find(d => d.id === document);
  return <section aria-label="Broker login debrief" className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 className="text-2xl font-semibold">Your broker debrief</h2><p className="mt-1 text-sm text-muted-foreground">Review incoming freight and approve carrier paperwork.</p></div>
      <span className="border-l-2 border-violet pl-3 text-sm text-violet">Needs Connection · Inbox & delivery</span>
    </div>
    <p className="border-y border-border py-3 text-sm text-muted-foreground">24/7 email ingestion and automatic document delivery are not connected. Saved drafts below are manually entered; nothing is sent.</p>
    {!userId ? <p className="text-sm"><Link to="/sign-in" search={{ next: "/broker" }} className="text-primary underline">Sign in</Link> to review your company’s records. No sample inbox is shown.</p> : null}
    {userId && !access.roles.includes("broker") ? <p role="status">A server-granted broker role is required for intake and approvals.</p> : null}
    {userId && memberships.error ? <p role="alert">{memberships.error}</p> : null}
    {userId && !memberships.isLoading && !companyId ? <p role="status">An active company membership is required.</p> : null}
    {memberships.active.length > 1 ? <select aria-label="Broker company" className="min-h-11 rounded-lg border border-input bg-background px-3" value={companyId} onChange={e => setCompany(e.target.value)}>{memberships.active.map(m => <option key={m.companyId} value={m.companyId}>{m.company.name}</option>)}</select> : null}
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{[ [Inbox,"Incoming drafts"], [AlertTriangle,"Urgent exceptions"], [FileText,"Carrier-pending BOL"], [CheckCheck,"Approval queue"] ].map(([Icon,title],i) => { const Symbol = Icon as typeof Inbox; return <div key={String(title)} className="border-b border-border pb-4"><Symbol className="mb-3 size-5 text-primary"/><p className="text-3xl font-semibold">{userId ? counts[i] : "—"}</p><p className="mt-1 text-sm text-muted-foreground">{String(title)}</p></div>; })}</div>
    {q.isFetching ? <p role="status">Loading saved review records…</p> : null}
    {q.error ? <div role="alert"><p>{q.error.message}</p><Button variant="outline" onClick={() => void q.refetch()}><RefreshCw/>Try again</Button></div> : null}
    {data ? <>
      <form className="space-y-3 border-t border-border pt-5" onSubmit={e => { e.preventDefault(); if (!companyId || busy) return; const operation = identityRef.current; setBusy(true); void create({ data: { companyId, reference, origin, destination, subject, category, urgent, notes } }).then(() => { if (identityRef.current !== operation) return; toast.success("Draft saved for review — not sent"); setReference(""); void qc.invalidateQueries({ queryKey: ["broker-debrief", userId, companyId] }); }).catch(e => {if(identityRef.current === operation) toast.error(e.message);}).finally(() => {if(identityRef.current === operation) setBusy(false);}); }}>
        <h3 className="font-medium">Manual intake draft</h3><div className="grid gap-3 sm:grid-cols-2">
        {[["Load reference",reference,setReference],["Origin",origin,setOrigin],["Destination",destination,setDestination],["Email subject",subject,setSubject]].map(([name,value,set]) => <label key={String(name)} className="text-sm">{String(name)}<Input aria-label={String(name)} value={String(value)} onChange={e => (set as (v:string)=>void)(e.target.value)} maxLength={name === "Load reference" ? 120 : 300} className="mt-1"/></label>)}
        <label className="text-sm">Email category<select aria-label="Email category" value={category} onChange={e => setCategory(e.target.value as typeof category)} className="mt-1 block min-h-11 w-full rounded-lg border border-input bg-background px-3">{intakeCategories.map(c => <option key={c} value={c}>{c.replaceAll("_"," ")}</option>)}</select></label>
        <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={urgent} onChange={e => setUrgent(e.target.checked)}/>Urgent exception</label></div>
        <label className="block text-sm">Notes<Input aria-label="Intake notes" value={notes} onChange={e=>setNotes(e.target.value)} maxLength={4000} className="mt-1"/></label>
        <Button type="submit" disabled={busy || !reference.trim()}><Plus/>Save draft</Button>
      </form>
      <div className="space-y-3"><h3 className="font-medium">Incoming load review</h3>{!data.drafts.length ? <p className="text-sm text-muted-foreground">No saved intake drafts.</p> : data.drafts.map(d => <article key={d.id} className="rounded-lg border border-border bg-card p-4"><div className="flex flex-wrap justify-between gap-2"><h4 className="font-medium">{d.reference}</h4><span className="text-sm text-primary">{d.status.replaceAll("_"," ")}</span></div><p className="mt-1 text-sm">{d.origin || "Origin missing"} → {d.destination || "Destination missing"}</p><p className="mt-2 text-xs text-muted-foreground">Manual intake · {d.category.replaceAll("_"," ")}{d.urgent ? " · Urgent" : ""}</p>{d.email_subject ? <p className="mt-2 text-sm">{d.email_subject}</p> : null}{d.notes ? <p className="mt-2 whitespace-pre-wrap text-sm">{d.notes}</p> : null}<p className="mt-2 text-xs text-muted-foreground">{deliveryLabel(data.deliveries.find(o => o.draft_id === d.id)?.status ?? "needs_connection")}</p>{d.status === "needs_review" ? <Button variant="outline" className="mt-3" onClick={() => {setReview(d.id);setCarrier("");setDocument("");}}>Review carrier & packet</Button> : null}</article>)}</div>
      {selected ? <section aria-label="Carrier packet approval" className="space-y-3 border-y border-border py-4"><h3 className="font-medium">Approve packet · {selected.reference}</h3><p className="text-sm">{selected.origin || "Origin missing"} → {selected.destination || "Destination missing"}</p>
        <label className="block text-sm">Carrier<select aria-label="Approved carrier" className="mt-1 block min-h-11 w-full rounded-lg border border-input bg-background px-3" value={carrier} onChange={e => setCarrier(e.target.value)}><option value="">Select carrier</option>{data.carriers.map(c => <option key={c.id} value={c.id}>{c.name} · {c.verification_status} · {c.recipient_verified_at ? "recipient checked" : "recipient unverified"}</option>)}</select></label>
        <label className="block text-sm">Owned BOL file<select aria-label="Approved BOL document" className="mt-1 block min-h-11 w-full rounded-lg border border-input bg-background px-3" value={document} onChange={e => setDocument(e.target.value)}><option value="">Select matching finalized file</option>{data.documents.filter(d => d.load_reference === selected.reference).map(d => <option key={d.id} value={d.id}>{d.title ?? d.load_reference} · {d.status}{!d.storage_path ? " · no file" : ""}</option>)}</select></label>
        <p className="text-sm">Recipient: {selectedCarrier?.contact_email ?? "Not selected"}</p><p className="text-sm text-muted-foreground">Only a verified carrier and verified recipient with current insurance and an owned finalized BOL file can be approved. No email channel is connected; approval saves a blocked delivery intent, not a send or booking.</p>
        <div className="flex flex-wrap gap-2"><Button disabled={busy || !carrier || !document || !selectedDoc || !selectedCarrier} onClick={() => { if (busy) return; const operation = identityRef.current; setBusy(true); void approve({ data:{draftId:selected.id,carrierId:carrier,documentId:document,confirmed:true} }).then(()=>{if(identityRef.current !== operation) return; toast.success("Packet approved — Needs Connection, not sent");setReview(null);void qc.invalidateQueries({queryKey:["broker-debrief",userId,companyId]});}).catch(e=>{if(identityRef.current === operation) toast.error(e.message);}).finally(()=>{if(identityRef.current === operation) setBusy(false);}); }}>Confirm carrier & packet approval</Button><Button variant="outline" onClick={()=>setReview(null)}>Cancel</Button></div>
      </section> : null}
      <section className="space-y-2 border-t border-border pt-4"><h3 className="font-medium">Review history</h3>{data.history.map(h=><p key={h.id} className="text-xs text-muted-foreground">{h.action.replaceAll("_"," ")} · {new Date(h.created_at).toLocaleString()}</p>)}</section>
    </> : null}
  </section>;
}