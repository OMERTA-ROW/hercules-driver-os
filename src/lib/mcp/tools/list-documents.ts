import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_documents",
  title: "List my documents",
  description: "List the signed-in user's documents (including BOL drafts) with status and expiry. File contents are not returned.",
  inputSchema: {
    kind: z.string().trim().min(1).max(40).optional().describe("Filter by document kind, e.g. bol."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ kind }, ctx) => {
    let q = supabaseForUser(ctx)
      .from("documents")
      .select("id,kind,title,status,load_reference,expires_at,created_at,updated_at")
      .order("updated_at", { ascending: false })
      .limit(50);
    if (kind) q = q.eq("kind", kind);
    const { data, error } = await q;
    if (error) throw new ToolError(error.message);
    const documents = (data ?? []).map((d) => ({ ...d }));
    return {
      content: [{ type: "text", text: JSON.stringify(documents) }],
      structuredContent: { documents },
    };
  },
});
