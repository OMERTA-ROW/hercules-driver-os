import { z } from "zod";
export const intakeCategories = ["load_offer", "bol_packet", "exception", "other"] as const;
export const intakeSchema = z.object({ companyId: z.uuid(), reference: z.string().trim().min(1).max(120), origin: z.string().trim().max(300), destination: z.string().trim().max(300), subject: z.string().max(300), category: z.enum(intakeCategories), urgent: z.boolean(), notes: z.string().max(4000) });
export const approvalSchema = z.object({ draftId: z.uuid(), carrierId: z.uuid(), documentId: z.uuid(), confirmed: z.literal(true) });
export function loginDestination(roles: readonly string[], kind: string) {
  return roles.includes("broker") ? "/broker" as const : kind === "solo" ? "/" as const : "/company" as const;
}
export function deliveryLabel(status: string) {
  if (status === "delivered") return "Delivered — provider receipt";
  if (status === "sent") return "Sent — delivery not confirmed";
  if (status === "needs_connection") return "Needs Connection · Not sent";
  if (status === "failed") return "Failed · Review required";
  return "Pending · Not confirmed delivered";
}