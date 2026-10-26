import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { intakeSchema, reviewBatchSchema, releaseChangeSchema, stackItemSchema } from "./broker-intake";
import { z } from "zod";

export const brokerDebrief = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator(z.object({ companyId: z.uuid() }))
  .handler(async ({ data, context }) => {
    const permitted = await context.supabase.rpc("broker_can_review", { _company: data.companyId });
    if (permitted.error || !permitted.data) throw new Error("Broker company access required");
    const [drafts, deliveries, carriers, documents, history, drivers, releases] = await Promise.all([
      context.supabase.from("broker_intake_drafts").select("*").eq("company_id", data.companyId).order("created_at", { ascending: false }).limit(100),
      context.supabase.from("broker_delivery_outbox").select("id,draft_id,carrier_id,recipient_email,status,attempts,last_error,approved_at").eq("company_id", data.companyId).limit(100),
      context.supabase.from("freight_carriers").select("id,name,contact_email,verification_status,insurance_expires,recipient_verified_at,recipient_verified_email").eq("company_id", data.companyId),
      context.supabase.from("documents").select("id,title,load_reference,status,storage_path,updated_at").eq("owner_id", context.userId).eq("kind", "bol").limit(100),
      context.supabase.from("broker_review_history").select("id,draft_id,action,created_at").eq("company_id", data.companyId).order("created_at", { ascending: false }).limit(50),
      context.supabase.from("broker_driver_recipients").select("*").eq("company_id",data.companyId),
      context.supabase.from("broker_load_releases").select("*").eq("company_id",data.companyId).limit(100),
    ]);
    for (const response of [drafts, deliveries, carriers, documents, history, drivers, releases]) if (response.error) throw new Error("Could not load broker review records. Try again.");
    return { drafts: drafts.data ?? [], deliveries: deliveries.data ?? [], carriers: carriers.data ?? [], documents: documents.data ?? [], history: history.data ?? [], drivers: drivers.data ?? [], releases: releases.data ?? [], connection: "needs_connection" as const };
  });
export const createBrokerIntake = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator(intakeSchema)
  .handler(async ({ data, context }) => {
    const { data: id, error } = await context.supabase.rpc("broker_intake_create", { _company: data.companyId, _reference: data.reference, _origin: data.origin, _destination: data.destination, _subject: data.subject, _category: data.category, _urgent: data.urgent, _notes: data.notes });
    if (error) throw new Error(error.message);
    return { id };
  });
export const approveReviewBatch = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator(reviewBatchSchema)
  .handler(async ({data,context})=>{
    const {data:ids,error}=await context.supabase.rpc("broker_review_batch",{_company:data.companyId,_items:data.items,_confirmed:data.confirmed});
    if(error)throw new Error(error.message);
    return {ids,status:"needs_connection" as const};
  });
export const changeReviewRelease = createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).inputValidator(releaseChangeSchema)
  .handler(async({data,context})=>{
    const {data:version,error}=await context.supabase.rpc("broker_release_change",{_id:data.id,_version:data.version,_cancel:data.cancel,_release_at:data.releaseAt ?? "1970-01-01T00:00:00Z",_zone:data.timeZone,_confirmed:data.confirmed});
    if(error)throw new Error(error.message);
    return {version};
  });
export const myAssignedStack = createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).handler(async({context})=>{
  const {data,error}=await context.supabase.rpc("broker_my_stack");
  if(error)throw new Error("Could not load assigned loads. Try again.");
  return z.array(stackItemSchema).parse(data);
});
export const brokerLoginRoles = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data, error } = await context.supabase.from("hercules_user_roles").select("role").eq("user_id", context.userId);
  if (error) throw new Error("Could not check your login destination");
  return (data ?? []).map(row => row.role);
});