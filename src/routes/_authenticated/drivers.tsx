import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { rpc, useFreight, useLoads, useTeam, type TeamMember } from "@/lib/freight";
import { useInvalidate } from "@/lib/freight-data";
import { Badge, Empty, ErrorNote, FButton, FInput, Loading, PageHeader, Table, Td } from "@/components/freight/ui";

export const Route = createFileRoute("/_authenticated/drivers")({
  head: () => ({ meta: [{ title: "Drivers — Hercules Freight OS" }, { name: "description", content: "Driver availability, licenses and history." }] }),
  component: Drivers,
});

const soon = (d: string | null) => !!d && new Date(d).getTime() - Date.now() < 30 * 864e5;

function Drivers() {
  const { company, has } = useFreight();
  const team = useTeam(company?.id);
  const loads = useLoads(company?.id);
  if (team.isLoading) return <Loading />;
  if (team.error) return <ErrorNote>Your role can't view the driver roster.</ErrorNote>;
  const drivers = (team.data ?? []).filter((m) => m.roles.includes("driver"));
  return (
    <>
      <PageHeader title="Drivers" actions={has("admin") && <Link to="/admin"><FButton variant="outline">Invite a driver</FButton></Link>} />
      {drivers.length === 0 ? <Empty icon={Users} title="No drivers yet" body="Invite drivers from Admin. They'll appear here once they accept." /> : (
        <Table head={["Driver", "Available", "CDL expires", "Medical expires", "Delivered loads", ""]}>
          {drivers.map((d) => <Row key={d.user_id} d={d} delivered={(loads.data ?? []).filter((l) => l.driver_id === d.user_id && l.status === "delivered").length} edit={has("admin", "fleet_owner")} />)}
        </Table>
      )}
    </>
  );
}

function Row({ d, delivered, edit }: { d: TeamMember; delivered: number; edit: boolean }) {
  const { company } = useFreight();
  const inv = useInvalidate();
  const [open, setOpen] = useState(false);
  const [cdl, setCdl] = useState(d.cdl_expires ?? "");
  const [med, setMed] = useState(d.medical_expires ?? "");
  const save = async (patch: { available?: boolean; cdl_expires?: string | null; medical_expires?: string | null }) => {
    await rpc("freight_driver_profile_upsert", { _company: company!.id, _user: d.user_id });
    const { error } = await supabase.from("freight_driver_profiles").update(patch).eq("company_id", company!.id).eq("user_id", d.user_id);
    error ? toast.error("Couldn't save. The driver profile may not exist yet.") : toast.success("Saved.");
    setOpen(false);
    void inv();
  };
  return (
    <tr className="border-t border-border">
      <Td><p className="font-medium">{d.name ?? "—"}</p><p className="text-xs text-muted-foreground">{d.email}</p></Td>
      <Td>{d.available === false ? <Badge tone="warn">Unavailable</Badge> : <Badge tone="ok">Available</Badge>}</Td>
      <Td>{open ? <FInput type="date" aria-label="CDL expiry" value={cdl} onChange={(e) => setCdl(e.target.value)} /> : <span className={soon(d.cdl_expires) ? "font-semibold text-destructive" : ""}>{d.cdl_expires ?? "Not on file"}</span>}</Td>
      <Td>{open ? <FInput type="date" aria-label="Medical expiry" value={med} onChange={(e) => setMed(e.target.value)} /> : <span className={soon(d.medical_expires) ? "font-semibold text-destructive" : ""}>{d.medical_expires ?? "Not on file"}</span>}</Td>
      <Td>{delivered}</Td>
      <Td className="whitespace-nowrap">{edit && (open ? <><FButton size="sm" onClick={() => save({ cdl_expires: cdl || null, medical_expires: med || null })}>Save</FButton><FButton size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</FButton></> : <><FButton size="sm" variant="outline" onClick={() => setOpen(true)}>Edit</FButton><FButton size="sm" variant="ghost" onClick={() => save({ available: d.available === false })}>{d.available === false ? "Mark available" : "Mark unavailable"}</FButton></>)}</Td>
    </tr>
  );
}
