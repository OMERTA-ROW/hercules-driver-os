import { useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import type { LucideIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useFreight } from "@/lib/freight";
import { useInvalidate, useRows } from "@/lib/freight-data";
import { Card, Empty, Field, FButton, FInput, FSelect, Loading, PageHeader, Table, Td } from "./ui";

export type Col = { key: string; label: string; type?: "text" | "email" | "tel" | "date" | "select"; options?: string[]; required?: boolean; hideInList?: boolean };

/** Simple company directory: RLS limits who can read and write. */
export function Directory({ table, title, sub, cols, canWrite, icon, extra }: { table: string; title: string; sub?: string; cols: Col[]; canWrite: boolean; icon: LucideIcon; extra?: (row: Record<string, unknown>) => ReactNode }) {
  const { company } = useFreight();
  const rows = useRows<Record<string, unknown>>(table, company?.id, { order: "created_at" });
  const inv = useInvalidate();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const save = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const payload: Record<string, unknown> = { company_id: company!.id };
    for (const c of cols) payload[c.key] = f[c.key]?.trim() || null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from as any)(table).insert(payload);
    setBusy(false);
    if (error) { toast.error(error.code === "42501" ? "Your role can't add these." : "Check the fields and try again."); return; }
    toast.success("Added.");
    setF({});
    setOpen(false);
    void inv();
  };
  const list = cols.filter((c) => !c.hideInList);
  return (
    <>
      <PageHeader title={title} sub={sub} actions={canWrite && <FButton onClick={() => setOpen(!open)}>{open ? "Close" : "Add"}</FButton>} />
      {open && (
        <Card className="mb-5">
          <form onSubmit={save} className="grid gap-3 md:grid-cols-3">
            {cols.map((c) => (
              <Field key={c.key} label={c.label} required={c.required}>
                {c.type === "select" ? (
                  <FSelect value={f[c.key] ?? c.options![0]} onChange={(e) => setF({ ...f, [c.key]: e.target.value })}>{c.options!.map((o) => <option key={o} value={o}>{o.replace(/_/g, " ")}</option>)}</FSelect>
                ) : (
                  <FInput type={c.type ?? "text"} required={c.required} value={f[c.key] ?? ""} onChange={(e) => setF({ ...f, [c.key]: e.target.value })} />
                )}
              </Field>
            ))}
            <div className="flex items-end"><FButton type="submit" busy={busy}>Save</FButton></div>
          </form>
        </Card>
      )}
      {rows.isLoading ? <Loading /> : !rows.data?.length ? <Empty icon={icon} title={`No ${title.toLowerCase()} yet`} body={canWrite ? "Add your first one." : "Nothing has been added yet."} /> : (
        <Table head={[...list.map((c) => c.label), ...(extra ? [""] : [])]}>
          {rows.data.map((r) => (
            <tr key={String(r["id"])} className="border-t border-border">
              {list.map((c) => <Td key={c.key}>{r[c.key] == null ? "—" : String(r[c.key]).replace(/_/g, " ")}</Td>)}
              {extra && <Td>{extra(r)}</Td>}
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
