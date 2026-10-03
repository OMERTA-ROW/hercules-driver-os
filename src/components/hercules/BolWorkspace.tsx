import { useMemo } from "react";
import { FileText, Mail, Printer, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { missingBolFields, useBol, type BolDraft } from "@/lib/bol";

function field(value: string) {
  return value.trim() || "Unknown — confirm before use";
}

function BolPaper({ draft }: { draft: BolDraft }) {
  return (
    <article id="hercules-bol-print" className="bol-paper bg-card p-5 text-foreground sm:p-7">
      <div className="flex items-start justify-between gap-4 border-b-2 border-foreground pb-3">
        <div><p className="text-xs font-semibold uppercase">Hercules document draft</p><h2 className="text-2xl font-bold">Bill of Lading</h2></div>
        <div className="text-right text-sm"><strong>Load reference</strong><br />{field(draft.loadReference)}</div>
      </div>
      <div className="grid grid-cols-2 border-b border-foreground">
        <section className="border-r border-foreground p-3"><strong>Shipper</strong><p>{field(draft.shipperName)}</p><p>{field(draft.shipperAddress)}</p></section>
        <section className="p-3"><strong>Consignee</strong><p>{field(draft.consigneeName)}</p><p>{field(draft.consigneeAddress)}</p></section>
        <section className="border-r border-t border-foreground p-3"><strong>Pickup</strong><p>{field(draft.pickupDetails)}</p></section>
        <section className="border-t border-foreground p-3"><strong>Delivery</strong><p>{field(draft.deliveryDetails)}</p></section>
      </div>
      <div className="grid grid-cols-2 border-b border-foreground"><p className="p-3"><strong>Carrier</strong><br />{field(draft.carrierName)}</p><p className="border-l border-foreground p-3"><strong>Vehicle / unit</strong><br />{field(draft.vehicleUnit)}</p></div>
      <table className="w-full border-collapse text-left text-sm"><thead><tr className="border-b border-foreground"><th className="p-3">Item description</th><th className="p-3">Handling units / count</th><th className="p-3">Weight</th></tr></thead><tbody>{draft.items.map((item, index) => <tr key={index} className="border-b border-foreground"><td className="p-3">{field(item.description)}</td><td className="p-3">{field(item.handlingUnits)}</td><td className="p-3">{item.weight.trim() ? `${item.weight} ${item.weightUnit}` : "Unknown — confirm before use"}</td></tr>)}</tbody></table>
      <section className="border-b border-foreground p-3"><strong>Freight instructions</strong><p>{field(draft.freightInstructions)}</p></section>
      <div className="grid grid-cols-2 gap-8 pt-12 text-sm"><div className="border-t border-foreground pt-2">Shipper signature / date — unsigned</div><div className="border-t border-foreground pt-2">Carrier signature / date — unsigned</div></div>
      <p className="mt-8 text-xs">Draft for review. This document contains no electronic signature or legal acceptance and is not represented as compliant for every shipment.</p>
    </article>
  );
}

function EditFields({ draft, update }: { draft: BolDraft; update: (next: BolDraft) => void }) {
  const set = (key: keyof BolDraft, value: string) => update({ ...draft, [key]: value });
  return <div className="grid max-h-[58vh] gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
    {([['shipperName','Shipper name'],['shipperAddress','Shipper address'],['consigneeName','Consignee name'],['consigneeAddress','Consignee address'],['pickupDetails','Pickup details'],['deliveryDetails','Delivery details'],['carrierName','Carrier name'],['loadReference','Load reference'],['vehicleUnit','Vehicle / unit']] as const).map(([key,label]) => <label key={key} className="space-y-1 text-sm"><span>{label}</span><Input value={draft[key]} onChange={(event) => set(key,event.target.value)} /></label>)}
    <label className="space-y-1 text-sm sm:col-span-2"><span>Item description</span><Input value={draft.items[0]?.description ?? ""} onChange={(event) => update({ ...draft, items: [{ ...(draft.items[0] ?? { handlingUnits: "", weight: "", weightUnit: "lb" }), description: event.target.value }] })} /></label>
    <label className="space-y-1 text-sm"><span>Handling units / count</span><Input value={draft.items[0]?.handlingUnits ?? ""} onChange={(event) => update({ ...draft, items: [{ ...(draft.items[0] ?? { description: "", weight: "", weightUnit: "lb" }), handlingUnits: event.target.value }] })} /></label>
    <label className="space-y-1 text-sm"><span>Weight (lb)</span><Input inputMode="decimal" value={draft.items[0]?.weight ?? ""} onChange={(event) => update({ ...draft, items: [{ ...(draft.items[0] ?? { description: "", handlingUnits: "", weightUnit: "lb" }), weight: event.target.value }] })} /></label>
    <label className="space-y-1 text-sm sm:col-span-2"><span>Freight instructions</span><Textarea value={draft.freightInstructions} onChange={(event) => set('freightInstructions',event.target.value)} /></label>
  </div>;
}

export function BolWorkspace() {
  const bol = useBol();
  const missing = useMemo(() => bol.draft ? missingBolFields(bol.draft) : [], [bol.draft]);
  if (!bol.draft || !bol.view) return null;
  const editing = bol.view === "edit";
  const emailing = bol.view === "email";
  const printing = bol.view === "print";
  const openEmailApp = () => {
    const params = new URLSearchParams({ subject: bol.emailSubject, body: `${bol.emailBody}\n\nThe BOL file cannot be attached automatically. Download or print the reviewed BOL, then attach it in your email app.` });
    window.location.href = `mailto:${encodeURIComponent(bol.emailTo)}?${params.toString()}`;
  };
  return <Dialog open onOpenChange={(open) => { if (!open) bol.close(); }}><DialogContent className="max-h-[94vh] max-w-3xl overflow-y-auto print:static print:max-h-none print:w-full print:max-w-none print:translate-x-0 print:translate-y-0 print:border-0 print:p-0">
    <DialogHeader className="print:hidden"><DialogTitle className="flex items-center gap-2"><FileText /> {editing ? "Edit BOL draft" : emailing ? "Email BOL draft" : printing ? "Print BOL preview" : "Review BOL draft"}</DialogTitle><DialogDescription>{missing.length ? `${missing.length} required field${missing.length === 1 ? " is" : "s are"} still unknown.` : "All core shipment fields are filled. Review every value before use."}</DialogDescription></DialogHeader>
    {editing ? <EditFields draft={bol.draft} update={bol.setDraft} /> : emailing ? <div className="space-y-3 print:hidden"><label className="space-y-1 text-sm"><span>Recipient</span><Input type="email" value={bol.emailTo} onChange={(event) => bol.setEmailTo(event.target.value)} placeholder="recipient@example.com" /></label><label className="space-y-1 text-sm"><span>Subject</span><Input value={bol.emailSubject} onChange={(event) => bol.setEmailSubject(event.target.value)} /></label><label className="space-y-1 text-sm"><span>Message</span><Textarea value={bol.emailBody} onChange={(event) => bol.setEmailBody(event.target.value)} /></label><BolPaper draft={bol.draft} /><p className="text-xs text-muted-foreground">No Gmail or Outlook account is connected. “Open email app” creates a compose window only; it cannot attach this BOL or confirm delivery.</p></div> : <BolPaper draft={bol.draft} />}
    {bol.error ? <p role="alert" className="text-sm text-destructive print:hidden">{bol.error}</p> : null}
    <DialogFooter className="gap-2 print:hidden"><Button variant="ghost" onClick={bol.close}>Cancel</Button>{editing ? <Button disabled={bol.busy} onClick={async () => { const result = await bol.save(); result.ok ? toast.success(result.message) : toast.error(result.message); if (result.ok) bol.setView("review"); }}><Save />Save draft</Button> : printing ? <Button onClick={() => window.print()}><Printer />Open system print dialog</Button> : emailing ? <Button disabled={!bol.emailTo.trim()} onClick={openEmailApp}><Mail />Open email app</Button> : <Button onClick={() => bol.setView("edit")}>Edit draft</Button>}</DialogFooter>
  </DialogContent></Dialog>;
}