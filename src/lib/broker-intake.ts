import { z } from "zod";
import { Temporal } from "@js-temporal/polyfill";
export const intakeCategories = ["load_offer", "bol_packet", "exception", "other"] as const;
export const intakeSchema = z.object({ companyId: z.uuid(), reference: z.string().trim().min(1).max(120), origin: z.string().trim().max(300), destination: z.string().trim().max(300), subject: z.string().max(300), category: z.enum(intakeCategories), urgent: z.boolean(), notes: z.string().max(4000) });
export const approvalSchema = z.object({ draftId: z.uuid(), carrierId: z.uuid(), documentId: z.uuid(), confirmed: z.literal(true) });
export function loginDestination(roles: readonly string[], kind: string) {
  return roles.includes("broker") ? "/broker" as const : roles.includes("dispatcher") ? "/dispatch" as const : kind === "solo" ? "/" as const : "/company" as const;
}
export function deliveryLabel(status: string) {
  if (status === "delivered") return "Delivered — provider receipt";
  if (status === "sent") return "Sent — delivery not confirmed";
  if (status === "needs_connection") return "Needs Connection · Not sent";
  if (status === "failed") return "Failed · Review required";
  return "Pending · Not confirmed delivered";
}
export function zonedInstant(local: string, zone: string) {
  return Temporal.PlainDateTime.from(local).toZonedDateTime(zone, { disambiguation: "reject" }).toInstant().toString();
}
export const reviewItemSchema = z.object({ draftId:z.uuid(), carrierId:z.uuid(), driverId:z.uuid(), documentId:z.uuid(), releaseAt:z.iso.datetime().nullable(), pickupAt:z.iso.datetime(), deliveryAt:z.iso.datetime(), timeZone:z.string().min(1).max(100).refine(zone=>{try{Temporal.Now.zonedDateTimeISO(zone);return true;}catch{return false;}}, "Choose a valid time zone"), priority:z.number().int().min(0).max(100) }).superRefine((v,ctx)=>{if(Date.parse(v.deliveryAt)<=Date.parse(v.pickupAt))ctx.addIssue({code:"custom",message:"Delivery must follow pickup"});if(v.releaseAt && Date.parse(v.releaseAt)>Date.parse(v.pickupAt))ctx.addIssue({code:"custom",message:"Release must not follow pickup"});});
export const reviewBatchSchema = z.object({companyId:z.uuid(),confirmed:z.literal(true),items:z.array(reviewItemSchema).min(1).max(50)}).refine(v=>new Set(v.items.map(i=>i.draftId)).size===v.items.length,"Duplicate load in batch");
export const releaseChangeSchema = z.object({id:z.uuid(),version:z.number().int().positive(),cancel:z.boolean(),releaseAt:z.iso.datetime().nullable(),timeZone:z.string().min(1).max(100),confirmed:z.literal(true)});
export const stackItemSchema = z.object({id:z.uuid(),reference:z.string(),origin:z.string(),destination:z.string(),priority:z.number(),pickupAt:z.string(),deliveryAt:z.string(),releaseAt:z.string(),timeZone:z.string(),deliveryStatus:z.string()});
