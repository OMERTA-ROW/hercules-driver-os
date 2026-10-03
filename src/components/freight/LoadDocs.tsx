import { useRef, useState } from "react";
import { Download, Upload } from "lucide-react";
import { toast } from "sonner";
import { signedUrl, uploadDocument, when } from "@/lib/freight";
import { useInvalidate, useRows } from "@/lib/freight-data";
import { Badge, FButton, FSelect, statusTone } from "./ui";

export type DocRow = { id: string; kind: string; file_name: string; status: string; storage_path: string; created_at: string; version: number; load_id: string | null };
const KINDS = [
  ["pod", "Proof of delivery (POD)"],
  ["bol", "Bill of lading (BOL)"],
  ["rate_confirmation", "Rate confirmation"],
  ["receipt", "Receipt"],
  ["image", "Photo"],
  ["signature", "Signature"],
  ["issue", "Issue report"],
  ["other", "Other"],
] as const;

export function LoadDocs({ companyId, loadId, kinds, canUpload = true }: { companyId: string; loadId: string; kinds?: string[]; canUpload?: boolean }) {
  const docs = useRows<DocRow>("freight_documents", companyId, { eq: { load_id: loadId } });
  const inv = useInvalidate();
  const [kind, setKind] = useState("pod");
  const [busy, setBusy] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const options = KINDS.filter(([k]) => !kinds || kinds.includes(k));

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    setBusy(true);
    const r = await uploadDocument({ companyId, loadId, kind, file: f });
    setBusy(false);
    if (file.current) file.current.value = "";
    if (r.ok) toast.success(r.message);
    else toast.error(r.message);
    void inv();
  };
  const open = async (d: DocRow) => {
    const u = await signedUrl(d.storage_path);
    if (u) window.open(u, "_blank", "noopener");
    else toast.error("You don't have access to that file, or it's missing.");
  };

  const list = (docs.data ?? []).filter((d) => d.status !== "pending");
  return (
    <div className="space-y-3">
      {canUpload && (
        <div className="flex flex-wrap items-end gap-2">
          <label className="grid gap-1 text-sm font-medium">
            Document type
            <FSelect value={kind} onChange={(e) => setKind(e.target.value)} className="min-w-[220px]">
              {options.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </FSelect>
          </label>
          <input ref={file} type="file" hidden accept="application/pdf,image/jpeg,image/png,image/webp,image/heic" capture="environment" onChange={(e) => onFile(e.target.files?.[0])} />
          <FButton busy={busy} onClick={() => file.current?.click()}><Upload />Upload</FButton>
          <p className="w-full text-xs text-muted-foreground">PDF or photo, up to 15 MB.</p>
        </div>
      )}
      {list.length === 0 ? (
        <p className="text-sm text-muted-foreground">No documents yet.</p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {list.map((d) => (
            <li key={d.id} className="flex items-center gap-3 p-3 text-sm">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{d.file_name}</p>
                <p className="text-xs text-muted-foreground">{KINDS.find(([k]) => k === d.kind)?.[1] ?? d.kind} · v{d.version} · {when(d.created_at)}</p>
              </div>
              <Badge tone={statusTone(d.status)}>{d.status}</Badge>
              <FButton size="sm" variant="outline" onClick={() => open(d)} aria-label={`Download ${d.file_name}`}><Download /></FButton>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
