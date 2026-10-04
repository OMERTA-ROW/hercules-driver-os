import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FileUp, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Pill } from "@/components/hercules/primitives";
import { supabase } from "@/integrations/supabase/client";

export type VaultDoc = {
  id: string; request_id: string; user_id: string; company_id: string; doc_type: string;
  storage_path: string; file_name: string; mime_type: string; size_bytes: number;
  expires_on: string | null; status: string; review_note: string | null; created_at: string;
};

const ALLOWED = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const MAX = 10 * 1024 * 1024;
const OPEN = ["not_started", "documents_required", "submitted", "under_review", "needs_correction"];

export function expiryState(expires: string | null): { label: string; tone: "neutral" | "warn" | "bad" } {
  if (!expires) return { label: "No expiry", tone: "neutral" };
  const days = Math.floor((new Date(expires + "T23:59:59").getTime() - Date.now()) / 86400000);
  if (days < 0) return { label: `Expired ${expires}`, tone: "bad" };
  if (days <= 30) return { label: `Expires in ${days}d`, tone: "warn" };
  return { label: `Expires ${expires}`, tone: "neutral" };
}

const docStatus: Record<string, string> = { pending: "Awaiting review", accepted: "Accepted", rejected: "Rejected" };

export function useVaultDocs(requestId: string) {
  return useQuery({
    queryKey: ["vault", requestId],
    queryFn: async () => {
      const { data, error } = await supabase.from("hercules_verification_documents").select("*")
        .eq("request_id", requestId).order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as VaultDoc[];
    },
  });
}

async function openDoc(path: string) {
  const { data, error } = await supabase.storage.from("verification-docs").createSignedUrl(path, 60);
  if (error || !data) return toast.error("Could not open file", { description: error?.message });
  window.open(data.signedUrl, "_blank", "noopener,noreferrer");
}

function DocRow({ d, admin }: { d: VaultDoc; admin: boolean }) {
  const qc = useQueryClient();
  const [note, setNote] = useState("");
  const exp = expiryState(d.expires_on);
  const review = useMutation({
    mutationFn: async (accept: boolean) => {
      const { data, error } = await supabase.rpc("hercules_vault_review", { _doc: d.id, _accept: accept, _note: note });
      if (error) throw error;
      const res = data as { ok: boolean; error?: string };
      if (!res.ok) throw new Error(res.error);
    },
    onSuccess: () => { setNote(""); void qc.invalidateQueries({ queryKey: ["vault", d.request_id] }); },
    onError: (e: Error) => toast.error("Review not saved", { description: e.message }),
  });
  return (
    <li className="rounded-lg border border-border p-2 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="truncate">{d.file_name}</span>
        <span className="flex flex-wrap gap-1">
          <Pill tone="neutral">{docStatus[d.status]}</Pill>
          <Pill tone={exp.tone}>{exp.label}</Pill>
        </span>
      </div>
      {d.review_note ? <p className="text-xs text-muted-foreground">Reviewer note: {d.review_note}</p> : null}
      <div className="mt-2 flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => void openDoc(d.storage_path)}><Eye className="h-4 w-4" /> View</Button>
        {admin && d.status === "pending" ? (
          <>
            <input aria-label="Review note" placeholder="Note (required to reject)" className="min-w-40 flex-1 rounded-lg border border-border bg-background p-2" value={note} onChange={(e) => setNote(e.target.value)} />
            <Button size="sm" disabled={review.isPending} onClick={() => review.mutate(true)}>Accept</Button>
            <Button size="sm" variant="outline" disabled={review.isPending || note.trim().length < 3} onClick={() => review.mutate(false)}>Reject</Button>
          </>
        ) : null}
      </div>
    </li>
  );
}

function Uploader({ requestId, companyId, userId, docType }: { requestId: string; companyId: string; userId: string; docType: string }) {
  const qc = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [expires, setExpires] = useState("");
  const upload = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Choose a file");
      if (!ALLOWED.includes(file.type)) throw new Error("Use PDF, JPG, PNG or WebP");
      if (file.size > MAX) throw new Error("File is larger than 10 MB");
      const safe = file.name.replace(/[^\w.-]+/g, "_").slice(-80);
      const path = `${userId}/${requestId}/${crypto.randomUUID()}-${safe}`;
      const up = await supabase.storage.from("verification-docs").upload(path, file, { contentType: file.type, upsert: false });
      if (up.error) throw up.error;
      const { error } = await supabase.from("hercules_verification_documents").insert({
        request_id: requestId, user_id: userId, company_id: companyId, doc_type: docType,
        storage_path: path, file_name: file.name.slice(0, 200), mime_type: file.type, size_bytes: file.size,
        expires_on: expires || null,
      });
      if (error) { await supabase.storage.from("verification-docs").remove([path]); throw error; }
    },
    onSuccess: () => { toast.success(`${docType} uploaded`); setFile(null); setExpires(""); void qc.invalidateQueries({ queryKey: ["vault", requestId] }); },
    onError: (e: Error) => toast.error("Upload failed", { description: e.message }),
  });
  return (
    <form className="mt-2 flex flex-wrap items-end gap-2" onSubmit={(e) => { e.preventDefault(); upload.mutate(); }}>
      <input aria-label={`File for ${docType}`} type="file" accept={ALLOWED.join(",")} className="text-xs" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      <label className="text-xs">Expires
        <input type="date" className="ml-1 rounded-lg border border-border bg-background p-1" value={expires} onChange={(e) => setExpires(e.target.value)} />
      </label>
      <Button size="sm" type="submit" disabled={!file || upload.isPending}><FileUp className="h-4 w-4" /> Upload</Button>
    </form>
  );
}

export function VerificationVault({ request, userId, admin }: {
  request: { id: string; company_id: string; status: string; required_documents: string[] };
  userId: string; admin: boolean;
}) {
  const docs = useVaultDocs(request.id);
  const canUpload = !admin && OPEN.includes(request.status);
  const types = request.required_documents.length ? request.required_documents : ["Supporting document"];
  return (
    <div className="mt-2 space-y-2">
      {types.map((t) => {
        const list = (docs.data ?? []).filter((d) => d.doc_type === t);
        const ok = list.some((d) => d.status === "accepted" && expiryState(d.expires_on).tone !== "bad");
        return (
          <div key={t} className="rounded-lg border border-border p-2">
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="font-medium">{t}</span>
              <Pill tone={ok ? "neutral" : "warn"}>{ok ? "✓ Accepted" : list.length ? "In review" : "Missing"}</Pill>
            </div>
            {list.length ? <ul className="mt-2 space-y-2">{list.map((d) => <DocRow key={d.id} d={d} admin={admin} />)}</ul> : null}
            {canUpload ? <Uploader requestId={request.id} companyId={request.company_id} userId={userId} docType={t} /> : null}
          </div>
        );
      })}
      <p className="text-xs text-muted-foreground">Private files. Only you and your company admin can open them. A request can only be marked Verified once every listed document is accepted and unexpired.</p>
    </div>
  );
}
