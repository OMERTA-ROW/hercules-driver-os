import { describe, expect, it } from "vitest";
const url = process.env["VITE_SUPABASE_URL"] ?? "";
const key = process.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ?? "";
async function post(path:string, body:Record<string,unknown>) {
  return fetch(`${url}/rest/v1/${path}`, { method:"POST", headers:{ apikey:key,"Content-Type":"application/json" },body:JSON.stringify(body) });
}
describe.skipIf(!url || !key)("broker external authorization",()=>{
  it("refuses unauthenticated approval even with explicit confirmation",async()=>{
    const r=await post("rpc/broker_intake_approve",{_draft:crypto.randomUUID(),_carrier:crypto.randomUUID(),_document:crypto.randomUUID(),_confirmed:true});
    expect(r.status).toBeGreaterThanOrEqual(400);
  });
  it("refuses direct outbox creation before approved intent",async()=>{
    const r=await post("broker_delivery_outbox",{company_id:crypto.randomUUID(),draft_id:crypto.randomUUID(),carrier_id:crypto.randomUUID(),approved_by:crypto.randomUUID(),recipient_email:"test@example.com",packet:{},status:"delivered"});
    expect(r.status).toBeGreaterThanOrEqual(400);
  });
  it("refuses cross-company unauthenticated intake creation",async()=>{
    const r=await post("rpc/broker_intake_create",{_company:crypto.randomUUID(),_reference:"TEST",_origin:"A",_destination:"B",_subject:"",_category:"load_offer",_urgent:false,_notes:""});
    expect(r.status).toBeGreaterThanOrEqual(400);
  });
});