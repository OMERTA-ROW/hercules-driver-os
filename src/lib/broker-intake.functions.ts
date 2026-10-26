import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { approvalSchema, intakeSchema } from "./broker-intake";
import { z } from "zod";

export const brokerDebrief = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator(z.object({ companyId: z.uuid() }))
  .handler(async ({ data, context }) => {
    const permitted = await context.supabase.rpc("broker_can_review", { _company: data.companyId });
    if (permitted.error || !permitted.data) throw new Error("Broker company access required");
    const [drafts, deliveries, carriers, documents, history] = await Promise.all([
      context.supabase.from("broker_intake_drafts").select("*").eq("company_id", data.companyId).order("created_at", { ascending: false }).limit(100),
      context.supabase.from("broker_delivery_outbox").select("id,draft_id,carrier_id,recipient_email,status,attempts,last_error,approved_at").eq("company_id", data.companyId).limit(100),
      context.supabase.from("freight_carriers").select("id,name,contact_email,verification_status,insurance_expires,recipient_verified_at,recipient_verified_email").eq("company_id", data.companyId),
      context.supabase.from("documents").select("id,title,load_reference,status,storage_path,updated_at").eq("owner_id", context.userId).eq("kind", "bol").limit(100),
      context.supabase.from("broker_review_history").select("id,draft_id,action,created_at").eq("company_id", data.companyId).order("created_at", { ascending: false }).limit(50),
    ]);
    for (const response of [drafts, deliveries, carriers, documents, history]) if (response.error) throw new Error("Could not load broker review records. Try again.");
    return { drafts: drafts.data ?? [], deliveries: deliveries.data ?? [], carriers: carriers.data ?? [], documents: documents.data ?? [], history: history.data ?? [], connection: "needs_connection" as const };
  });
export const createBrokerIntake = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator(intakeSchema)
  .handler(async ({ data, context }) => {
    const { data: id, error } = await context.supabase.rpc("broker_intake_create", { _company: data.companyId, _reference: data.reference, _origin: data.origin, _destination: data.destination, _subject: data.subject, _category: data.category, _urgent: data.urgent, _notes: data.notes });
    if (error) throw new Error(error.message);
    return { id };
  });
export const approveBrokerPacket = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator(approvalSchema)
  .handler(async ({ data, context }) => {
    const { data: id, error } = await context.supabase.rpc("broker_intake_approve", { _draft: data.draftId, _carrier: data.carrierId, _document: data.documentId, _confirmed: data.confirmed });
    if (error) throw new Error(error.message);
    return { id, status: "needs_connection" as const };
  });
export const brokerLoginRoles = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data, error } = await context.supabase.from("hercules_user_roles").select("role").eq("user_id", context.userId);
  if (error) throw new Error("Could not check your login destination");
  return (data ?? []).map(row => row.role);
});