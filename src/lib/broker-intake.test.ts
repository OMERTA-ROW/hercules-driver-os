import { describe, expect, it } from "vitest";
import { approvalSchema, intakeSchema, deliveryLabel, loginDestination } from "./broker-intake";
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