import { useMemo } from "react";
import { FileText, Mail, Printer, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { hasUnsavedBolWork, missingBolFields, useBol, type BolDraft } from "@/lib/bol";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

function field(value: string) {
  return value.trim() || "Unknown — confirm before use";
}

export function isSafeEmailRecipient(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()) && !/[\r\n]/.test(value);
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
    if (!isSafeEmailRecipient(bol.emailTo)) {
      toast.error("Enter one valid recipient email address.");
      return;
    }
    const params = new URLSearchParams({ subject: bol.emailSubject, body: `${bol.emailBody}\n\nThe BOL file cannot be attached automatically. Download or print the reviewed BOL, then attach it in your email app.` });
    window.location.href = `mailto:${bol.emailTo.trim()}?${params.toString()}`;
  };
  return <Dialog open onOpenChange={(open) => { if (!open) bol.close(); }}><DialogContent className="max-h-[94vh] max-w-3xl overflow-y-auto print:static print:max-h-none print:w-full print:max-w-none print:translate-x-0 print:translate-y-0 print:border-0 print:p-0">
    <DialogHeader className="print:hidden"><DialogTitle className="flex items-center gap-2"><FileText /> {editing ? "Edit BOL draft" : emailing ? "Email BOL draft" : printing ? "Print BOL preview" : "Review BOL draft"}</DialogTitle><DialogDescription>{missing.length ? `${missing.length} required field${missing.length === 1 ? " is" : "s are"} incomplete: ${missing.slice(0, 3).join(", ")}${missing.length > 3 ? ", and more" : ""}.` : "All core shipment fields are filled. Review every value before use."}</DialogDescription></DialogHeader>
    {editing ? <EditFields draft={bol.draft} update={bol.setDraft} /> : emailing ? <div className="space-y-3 print:hidden"><label className="space-y-1 text-sm"><span>Recipient</span><Input type="email" value={bol.emailTo} onChange={(event) => bol.setEmailTo(event.target.value)} placeholder="recipient@example.com" aria-invalid={bol.emailTo.length > 0 && !isSafeEmailRecipient(bol.emailTo)} /></label><label className="space-y-1 text-sm"><span>Subject</span><Input value={bol.emailSubject} onChange={(event) => bol.setEmailSubject(event.target.value)} /></label><label className="space-y-1 text-sm"><span>Message</span><Textarea value={bol.emailBody} onChange={(event) => bol.setEmailBody(event.target.value)} /></label><BolPaper draft={bol.draft} /><p className="text-xs text-muted-foreground">Email is not connected. “Open email app” creates a compose window only; it does not attach this BOL, send it, or confirm delivery.</p></div> : <BolPaper draft={bol.draft} />}
    {bol.error ? <p role="alert" className="text-sm text-destructive print:hidden">{bol.error}</p> : null}
    {printing ? <p className="text-xs text-muted-foreground print:hidden">To save a PDF, choose “Save as PDF” in your device’s print dialog. Hercules will not select a printer or start a job automatically.</p> : null}
    <DialogFooter className="gap-2 print:hidden"><Button variant="ghost" onClick={bol.close}>Cancel</Button>{editing ? <><AlertDialog><AlertDialogTrigger asChild><Button variant="outline" disabled={!bol.dirty && !hasUnsavedBolWork(bol.draft)}>Start new BOL</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Discard this unsaved draft?</AlertDialogTitle><AlertDialogDescription>Your unsaved BOL fields will be replaced with a fresh draft for the current load.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Keep editing</AlertDialogCancel><AlertDialogAction onClick={bol.startNew}>Discard and start new</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog><Button disabled={bol.busy} onClick={async () => { const result = await bol.save(); result.ok ? toast.success(result.message) : toast.error(result.message); if (result.ok) bol.setView("review"); }}><Save />Save draft</Button></> : printing ? <Button onClick={() => window.print()}><Printer />Open system print dialog</Button> : emailing ? <Button disabled={!isSafeEmailRecipient(bol.emailTo)} onClick={openEmailApp}><Mail />Open email app</Button> : <><Button variant="outline" onClick={() => bol.setView("email")}><Mail />Email draft</Button><Button variant="outline" onClick={() => bol.setView("print")}><Printer />Print preview</Button><Button onClick={() => bol.setView("edit")}>Edit draft</Button></>}</DialogFooter>
  </DialogContent></Dialog>;
}