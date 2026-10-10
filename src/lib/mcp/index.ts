import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getMyRoles from "./tools/get-my-roles";
import listVehicles from "./tools/list-vehicles";
import listLoads from "./tools/list-loads";
import listDocuments from "./tools/list-documents";

// Vite inlines the stable ref; the published SUPABASE_URL may be a proxy.
const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";

export default defineMcp({
  name: "hercules-driver-s-command",
  title: "Hercules Driver's Command",
  version: "0.1.0",
  instructions:
    "Read-only tools for Hercules, a driver and dispatch app. Look up the signed-in user's roles, vehicles, loads and documents. Nothing is booked, sent or changed.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
    requireOAuthClientClaim: true,
  }),
  tools: [getMyRoles, listVehicles, listLoads, listDocuments],
});
