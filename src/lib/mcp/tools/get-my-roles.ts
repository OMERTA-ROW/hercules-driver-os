import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_my_roles",
  title: "Get my roles",
  description: "List the Hercules roles granted to the signed-in user and which one is active.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    const userId = ctx.getUserId();
    if (!userId) throw new ToolError("Not signed in");
    const sb = supabaseForUser(ctx);
    const [r, a] = await Promise.all([
      sb.from("hercules_user_roles").select("role").eq("user_id", userId),
      sb.from("hercules_active_role").select("role").eq("user_id", userId).maybeSingle(),
    ]);
    if (r.error) throw new ToolError(r.error.message);
    if (a.error) throw new ToolError(a.error.message);
    const roles = (r.data ?? []).map((x) => String(x.role));
    const active = a.data?.role ? String(a.data.role) : (roles[0] ?? null);
    return {
      content: [{ type: "text", text: roles.length ? `Roles: ${roles.join(", ")}. Active: ${active}.` : "No role assigned yet." }],
      structuredContent: { roles, active },
    };
  },
});
