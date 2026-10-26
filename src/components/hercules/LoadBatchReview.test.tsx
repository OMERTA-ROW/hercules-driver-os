import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
const handlers=vi.hoisted(()=>({approve:vi.fn().mockResolvedValue({status:"needs_connection"}),change:vi.fn().mockResolvedValue({version:2})}));
vi.mock("@tanstack/react-start",()=>({useServerFn:(fn:unknown)=>fn}));
vi.mock("@/lib/broker-intake.functions",()=>({approveReviewBatch:handlers.approve,changeReviewRelease:handlers.change}));
import { LoadBatchReview } from "./LoadBatchReview";
const draftId="00000000-0000-4000-8000-000000000001",carrierId="00000000-0000-4000-8000-000000000002",driverId="00000000-0000-4000-8000-000000000003",docId="00000000-0000-4000-8000-000000000004",companyId="00000000-0000-4000-8000-000000000005";
const data={drafts:[{id:draftId,reference:"LOAD-1",status:"needs_review",origin:"A",destination:"B",category:"load_offer",urgent:false,email_subject:"",notes:""}],carriers:[{id:carrierId,name:"Carrier A",verification_status:"verified"}],drivers:[{user_id:driverId,carrier_id:carrierId,display_name:"Driver A",recipient_email:"driver@example.com"}],documents:[{id:docId,load_reference:"LOAD-1",title:"BOL 1",storage_path:"private/file",status:"ready"}],deliveries:[],releases:[],history:[],connection:"needs_connection"};
type Props=Parameters<typeof LoadBatchReview>[0];
function fixture(value= data){return value as unknown as Props["data"];}
describe("itemized approval actions",()=>{
 it("only submits a selected per-load driver after explicit itemized confirmation",async()=>{
  handlers.approve.mockClear();const saved=vi.fn();const {container}=render(<LoadBatchReview data={fixture()} companyId={companyId} identity="A" onSaved={saved}/>);
  fireEvent.change(screen.getByLabelText("Carrier for LOAD-1"),{target:{value:carrierId}});
  fireEvent.change(screen.getByLabelText("Driver for LOAD-1"),{target:{value:driverId}});
  fireEvent.change(screen.getByLabelText("BOL for LOAD-1"),{target:{value:docId}});
  const times=container.querySelectorAll('input[type="datetime-local"]');
  const pickup=times[0],delivery=times[1];if(!pickup||!delivery)throw new Error("Missing schedule inputs");
  fireEvent.change(pickup,{target:{value:"2026-11-10T07:00"}});fireEvent.change(delivery,{target:{value:"2026-11-10T13:00"}});
  fireEvent.click(screen.getByRole("button",{name:"Review this approval"}));expect(handlers.approve).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button",{name:"Confirm itemized approvals"}));
  await waitFor(()=>expect(handlers.approve).toHaveBeenCalledWith({data:{companyId,confirmed:true,items:[{draftId,carrierId,driverId,documentId:docId,timeZone:"America/New_York",priority:0,releaseAt:null,pickupAt:"2026-11-10T12:00:00Z",deliveryAt:"2026-11-10T18:00:00Z"}]}}));expect(saved).toHaveBeenCalledOnce();
 });
 it("requires explicit cancellation and sends the saved version",async()=>{
  handlers.change.mockClear();const value={...data,drafts:[{...data.drafts[0],status:"approved"}],releases:[{id:docId,draft_id:draftId,driver_id:driverId,priority:50,release_at:"2026-11-10T11:00:00Z",time_zone:"America/New_York",pickup_at:"2026-11-10T12:00:00Z",delivery_at:"2026-11-10T18:00:00Z",cancelled_at:null,version:3}]};
  render(<LoadBatchReview data={value as unknown as Props["data"]} companyId={companyId} identity="A" onSaved={vi.fn()}/>);
  fireEvent.click(screen.getByRole("button",{name:"Cancel release"}));expect(handlers.change).not.toHaveBeenCalled();fireEvent.click(screen.getByRole("button",{name:"Confirm cancellation"}));
  await waitFor(()=>expect(handlers.change).toHaveBeenCalledWith({data:{id:docId,version:3,cancel:true,releaseAt:null,timeZone:"America/New_York",confirmed:true}}));
 });
 it("does not refresh the next account after a late approval result",async()=>{
  let resolve:()=>void=()=>{};handlers.approve.mockImplementationOnce(()=>new Promise<void>(r=>{resolve=r;}));const saved=vi.fn();const {container,rerender}=render(<LoadBatchReview data={fixture()} companyId={companyId} identity="A" onSaved={saved}/>);
  const times=container.querySelectorAll('input[type="datetime-local"]');const a=times[0],b=times[1];if(!a||!b)throw new Error("No times");fireEvent.change(a,{target:{value:"2026-11-10T07:00"}});fireEvent.change(b,{target:{value:"2026-11-10T13:00"}});fireEvent.click(screen.getByRole("button",{name:"Review this approval"}));fireEvent.click(screen.getByRole("button",{name:"Confirm itemized approvals"}));rerender(<LoadBatchReview data={fixture()} companyId={companyId} identity="B" onSaved={saved}/>);resolve();await new Promise(r=>setTimeout(r,0));expect(saved).not.toHaveBeenCalled();
 });
});
