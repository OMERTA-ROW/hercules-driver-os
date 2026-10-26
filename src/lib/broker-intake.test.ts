import { describe, expect, it } from "vitest";
import { approvalSchema, intakeSchema, deliveryLabel, loginDestination, zonedInstant, reviewBatchSchema, reviewItemSchema } from "./broker-intake";
describe("broker intake rules", () => {
  it("requires explicit approval confirmation", () => {
    expect(approvalSchema.safeParse({ draftId:crypto.randomUUID(),carrierId:crypto.randomUUID(),documentId:crypto.randomUUID(),confirmed:false }).success).toBe(false);
  });
  it("routes a server-granted broker to the debrief regardless of login door", () => {
    expect(loginDestination(["broker"],"solo")).toBe("/broker");
    expect(loginDestination(["driver"],"solo")).toBe("/");
  });
  it("does not equate unconnected or sent with delivered", () => {
    expect(deliveryLabel("needs_connection")).toBe("Needs Connection · Not sent");
    expect(deliveryLabel("sent")).toBe("Sent — delivery not confirmed");
  });
  it("accepts only supported email categories and a company-scoped draft", () => {
    const value={companyId:crypto.randomUUID(),reference:"ABC",origin:"",destination:"",subject:"",category:"bol_packet",urgent:false,notes:""};
    expect(intakeSchema.safeParse(value).success).toBe(true);
    expect(intakeSchema.safeParse({...value,category:"automatically_booked"}).success).toBe(false);
    expect(intakeSchema.safeParse({...value,companyId:""}).success).toBe(false);
  });
});
const item = {draftId:crypto.randomUUID(),carrierId:crypto.randomUUID(),driverId:crypto.randomUUID(),documentId:crypto.randomUUID(),releaseAt:null,pickupAt:"2026-11-10T12:00:00Z",deliveryAt:"2026-11-10T18:00:00Z",timeZone:"America/New_York",priority:50};
describe("reviewer release rules",()=>{
  it("routes server-granted dispatchers to their login debrief",()=>expect(loginDestination(["dispatcher"],"solo")).toBe("/dispatch"));
  it("requires a specific driver on every load",()=>expect(reviewItemSchema.safeParse({...item,driverId:""}).success).toBe(false));
  it("requires explicit itemized batch approval",()=>expect(reviewBatchSchema.safeParse({companyId:crypto.randomUUID(),confirmed:false,items:[item]}).success).toBe(false));
  it("rejects duplicate loads within an itemized batch",()=>expect(reviewBatchSchema.safeParse({companyId:crypto.randomUUID(),confirmed:true,items:[item,item]}).success).toBe(false));
  it("accepts immediate or a future timestamp per item",()=>{expect(reviewItemSchema.safeParse(item).success).toBe(true);expect(reviewItemSchema.safeParse({...item,releaseAt:"2026-11-10T11:00:00Z"}).success).toBe(true);});
  it("rejects release after pickup",()=>expect(reviewItemSchema.safeParse({...item,releaseAt:"2026-11-10T13:00:00Z"}).success).toBe(false));
  it("rejects reversed driver schedule windows",()=>expect(reviewItemSchema.safeParse({...item,deliveryAt:item.pickupAt}).success).toBe(false));
  it("converts explicit zones rather than using device zone",()=>expect(zonedInstant("2026-11-10T07:00","America/New_York")).toBe("2026-11-10T12:00:00Z"));
  it("rejects ambiguous DST fall-back times",()=>expect(()=>zonedInstant("2026-11-01T01:30","America/New_York")).toThrow());
  it("rejects nonexistent DST spring-forward times",()=>expect(()=>zonedInstant("2026-03-08T02:30","America/New_York")).toThrow());
  it("rejects unknown time zones",()=>expect(reviewItemSchema.safeParse({...item,timeZone:"Mars/Unknown"}).success).toBe(false));
  it("rejects priority outside 0 through 100",()=>{expect(reviewItemSchema.safeParse({...item,priority:101}).success).toBe(false);expect(reviewItemSchema.safeParse({...item,priority:-1}).success).toBe(false);});
});