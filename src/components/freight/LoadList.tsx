import { Link } from "@tanstack/react-router";
import { ClipboardList } from "lucide-react";
import { OP_LABEL, STATUS_LABEL, when, type LoadRow } from "@/lib/freight";
import { Badge, Empty, statusTone, Table, Td } from "./ui";

export function LoadList({ loads, emptyBody, action }: { loads: LoadRow[]; emptyBody?: string; action?: React.ReactNode }) {
  if (!loads.length) return <Empty icon={ClipboardList} title="No loads here yet" body={emptyBody ?? "Loads appear here once they're created."} action={action} />;
  return (
    <Table head={["Reference", "Lane", "Pickup", "Delivery", "Status"]}>
      {loads.map((l) => (
        <tr key={l.id} className="border-t border-border hover:bg-secondary/30">
          <Td>
            <Link to="/freight-loads/$id" params={{ id: l.id }} className="font-semibold text-primary underline-offset-2 hover:underline">{l.reference}</Link>
          </Td>
          <Td>{l.origin ?? "—"} → {l.destination ?? "—"}</Td>
          <Td>{when(l.pickup_at)}</Td>
          <Td>{when(l.delivery_at)}</Td>
          <Td>
            <div className="flex flex-wrap gap-1">
              <Badge tone={statusTone(l.status)}>{STATUS_LABEL[l.status] ?? l.status}</Badge>
              {l.op_status && <Badge tone={statusTone(l.op_status)}>{OP_LABEL[l.op_status]}</Badge>}
            </div>
          </Td>
        </tr>
      ))}
    </Table>
  );
}
