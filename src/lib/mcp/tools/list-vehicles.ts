import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_vehicles",
  title: "List my vehicles",
  description: "List the vehicles the signed-in user can see, with dimensions and weight on file.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    const { data, error } = await supabaseForUser(ctx)
      .from("vehicles")
      .select("id,label,unit_number,equipment_type,make,model,model_year,active,hazmat,height_inches,length_inches,width_inches,gross_weight_lb,axles")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new ToolError(error.message);
    const vehicles = (data ?? []).map((v) => ({ ...v }));
    return {
      content: [{ type: "text", text: JSON.stringify(vehicles) }],
      structuredContent: { vehicles },
    };
  },
});
