import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/hercules/AppShell";
import { Panel, PanelTitle, Label, Pill } from "@/components/hercules/primitives";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useMemberships } from "@/lib/company";
import { roleLabels, useAccess, type HerculesRole } from "@/lib/access";
import { VerificationVault } from "@/components/hercules/VerificationVault";

export const Route = createFileRoute("/verification")({
  head: () => ({
    meta: [
      { title: "Role Verification — HERCULES" },
      { name: "description", content: "Request additional roles and review role requests with document tracking." },
      { property: "og:title", content: "Role Verification — HERCULES" },
      { property: "og:description", content: "Document tracking and review support for role requests." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Verification,
});

const requestable = (Object.keys(roleLabels) as HerculesRole[]).filter((r) => r !== "platform_admin");

const docChecklist: Partial<Record<HerculesRole, string[]>> = {
  driver: ["Government-issued ID", "Driver license / CDL", "Medical examiner certificate", "MVR review record", "Employment application", "Road test certificate"],
  fleet_manager: ["Operating authority", "DOT/MC details", "Certificate of insurance", "W-9", "Equipment registration/inspection", "Carrier agreement"],
  broker: ["Broker authority", "Surety bond / trust", "Certificate of insurance", "W-9"],
  shipper: ["Business registration", "W-9"],
};

const statusLabel: Record<string, string> = {
  not_started: "Not Started", documents_required: "Documents Required", submitted: "Submitted",
  under_review: "Under Review", needs_correction: "Needs Correction", verified: "Verified",
  approved: "Approved", rejected: "Rejected", expired: "Expired", suspended: "Suspended",
};
const needsReason = ["needs_correction", "rejected", "suspended", "expired"];

type Req = {
  id: string; user_id: string; company_id: string; role: HerculesRole; reason: string;
  required_documents: string[]; status: string; review_reason: string | null; submitted_at: string;
};

function Verification() {
  const { userId } = useAuth();
  const { active: companies } = useMemberships();
  const { roles } = useAccess();
  const qc = useQueryClient();

  const reqs = useQuery({
    queryKey: ["role-requests", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("hercules_role_requests").select("*").order("submitted_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Req[];
    },
  });
  const mine = (reqs.data ?? []).filter((r) => r.user_id === userId);
  const queue = (reqs.data ?? []).filter((r) => r.user_id !== userId);

  const [company, setCompany] = useState("");
  const [role, setRole] = useState<HerculesRole>("dispatcher");
  const [reason, setReason] = useState("");
  const docs = docChecklist[role] ?? [];
  const companyId = company || companies[0]?.companyId || "";

  const submit = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("hercules_role_request_submit", { _company: companyId, _role: role, _reason: reason, _docs: docs });
      if (error) throw error;
      const res = data as { ok: boolean; error?: string };
      if (!res.ok) throw new Error(res.error);
    },
    onSuccess: () => { toast.success("Request submitted for admin review"); setReason(""); void qc.invalidateQueries({ queryKey: ["role-requests"] }); },
    onError: (e: Error) => toast.error("Not submitted", { description: e.message }),
  });

  if (!userId) {
    return <AppShell title="Role Verification" subtitle="Sign in to request roles"><Panel><p className="text-sm text-muted-foreground">Sign in to request or review roles.</p></Panel></AppShell>;
  }

  return (
    <AppShell title="Role Verification" subtitle="Document tracking and review support — human review required">
      <div className="grid gap-3 xl:grid-cols-2">
        <Panel>
          <PanelTitle><span className="inline-flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /> Request Additional Role</span></PanelTitle>
          {companies.length === 0 ? (
            <p className="text-sm text-muted-foreground">You need an active company membership before requesting a role.</p>
          ) : (
            <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); submit.mutate(); }}>
              <div><Label>Company</Label>
                <select className="mt-1 w-full rounded-lg border border-border bg-background p-3" value={companyId} onChange={(e) => setCompany(e.target.value)}>
                  {companies.map((m) => <option key={m.companyId} value={m.companyId}>{m.company.name}</option>)}
                </select></div>
              <div><Label>Desired role</Label>
                <select className="mt-1 w-full rounded-lg border border-border bg-background p-3" value={role} onChange={(e) => setRole(e.target.value as HerculesRole)}>
                  {requestable.filter((r) => !roles.includes(r)).map((r) => <option key={r} value={r}>{roleLabels[r]}</option>)}
                </select></div>
              <div><Label>Reason</Label>
                <textarea required minLength={5} className="mt-1 w-full rounded-lg border border-border bg-background p-3" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} /></div>
              <div><Label>Documents an admin will ask to review</Label>
                {docs.length ? <ul className="mt-1 list-disc pl-5 text-sm">{docs.map((d) => <li key={d}>{d}</li>)}</ul> : <p className="text-sm text-muted-foreground">Set by your company admin.</p>}</div>
              <Button size="lg" type="submit" disabled={submit.isPending}>Submit request</Button>
              <p className="text-xs text-muted-foreground">You can't grant yourself a role. A company admin reviews documents and approves.</p>
            </form>
          )}
        </Panel>

        <Panel>
          <PanelTitle>My requests</PanelTitle>
          {mine.length === 0 ? <p className="text-sm text-muted-foreground">No requests yet.</p> : (
            <ul className="space-y-2">{mine.map((r) => (
              <li key={r.id} className="rounded-lg border border-border p-3">
                <div className="flex justify-between gap-2"><span className="font-display uppercase">{roleLabels[r.role]}</span><Pill tone="neutral">{statusLabel[r.status]}</Pill></div>
                <p className="text-xs text-muted-foreground">Submitted {new Date(r.submitted_at).toLocaleDateString()}</p>
                {r.review_reason ? <p className="mt-1 text-sm">Reviewer note: {r.review_reason}</p> : null}
                <VerificationVault request={r} userId={userId} admin={false} />
              </li>))}</ul>
          )}
        </Panel>

        {queue.length > 0 ? (
          <Panel className="xl:col-span-2">
            <PanelTitle>Admin review queue</PanelTitle>
            <ul className="space-y-2">{queue.map((r) => <QueueItem key={r.id} r={r} userId={userId} />)}</ul>
          </Panel>
        ) : null}
      </div>
    </AppShell>
  );
}

function QueueItem({ r, userId }: { r: Req; userId: string }) {
  const qc = useQueryClient();
  const [status, setStatus] = useState("under_review");
  const [note, setNote] = useState("");
  const decide = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("hercules_role_request_decide", { _request: r.id, _status: status, _reason: note });
      if (error) throw error;
      const res = data as { ok: boolean; error?: string };
      if (!res.ok) throw new Error(res.error);
    },
    onSuccess: () => { toast.success(`Marked ${statusLabel[status]}`); setNote(""); void qc.invalidateQueries({ queryKey: ["role-requests"] }); },
    onError: (e: Error) => toast.error("Not saved", { description: e.message }),
  });
  return (
    <li className="rounded-lg border border-border p-3">
      <div className="flex justify-between gap-2"><span className="font-display uppercase">{roleLabels[r.role]}</span><Pill tone="neutral">{statusLabel[r.status]}</Pill></div>
      <p className="mt-1 text-sm">{r.reason}</p>
      <VerificationVault request={r} userId={userId} admin />
      <div className="mt-2 flex flex-wrap gap-2">
        <select aria-label="New status" className="rounded-lg border border-border bg-background p-2" value={status} onChange={(e) => setStatus(e.target.value)}>
          {["documents_required", "under_review", "needs_correction", "verified", "approved", "rejected", "expired", "suspended"].map((s) => <option key={s} value={s}>{statusLabel[s]}</option>)}
        </select>
        <input aria-label="Reason" placeholder={needsReason.includes(status) ? "Reason (required)" : "Note (optional)"} className="min-w-48 flex-1 rounded-lg border border-border bg-background p-2" value={note} onChange={(e) => setNote(e.target.value)} />
        <Button onClick={() => decide.mutate()} disabled={decide.isPending || (needsReason.includes(status) && note.trim().length < 3)}>Save decision</Button>
      </div>
    </li>
  );
}
