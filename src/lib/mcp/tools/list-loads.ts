import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_loads",
  title: "List loads",
  description: "List loads visible to the signed-in user, newest first. Read-only; nothing is booked.",
  inputSchema: {
    status: z.string().trim().min(1).max(40).optional().describe("Filter by load status."),
    limit: z.number().int().min(1).max(50).optional().describe("Max rows (default 20)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, limit }, ctx) => {
    let q = supabaseForUser(ctx)
      .from("loads")
      .select("id,reference,status,origin_city,origin_state,dest_city,dest_state,pickup_at,deliver_at,miles,weight_lb,equipment_type,commodity,broker_name,rate_cents")
      .order("created_at", { ascending: false })
      .limit(limit ?? 20);
    if (status) q = q.eq("status", status);
    const { data, error } = await q;
    if (error) throw new ToolError(error.message);
    const loads = (data ?? []).map((l) => ({ ...l }));
    return {
      content: [{ type: "text", text: JSON.stringify(loads) }],
      structuredContent: { loads },
    };
  },
});
