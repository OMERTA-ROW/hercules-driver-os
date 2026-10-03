export type BolIntent = "create" | "open" | "print" | "email" | "none";

/** Exact, deterministic paperwork commands. Broad words such as "send" never trigger actions. */
export function bolIntent(text: string): BolIntent {
  const value = text.trim().toLowerCase().replace(/[.!?]+$/g, "");
  if (/^(create|start|make|draft) (a |my )?(bol|bill of lading)$/.test(value)) return "create";
  if (/^(open|show|review) (my |the |this )?(bol|bill of lading)$/.test(value)) return "open";
  if (/^(print) (my |the |this )?(bol|bill of lading)$/.test(value)) return "print";
  if (/^(email) (my |the |this )?(bol|bill of lading)$/.test(value)) return "email";
  return "none";
}