import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Company-scoped table read. RLS decides which rows come back. */
export function useRows<T = Record<string, unknown>>(
  table: string,
  companyId: string | null | undefined,
  opts: { select?: string; order?: string; ascending?: boolean; eq?: Record<string, string | null>; enabled?: boolean; limit?: number } = {},
) {
  return useQuery({
    queryKey: ["f", table, companyId, opts.select, opts.order, JSON.stringify(opts.eq ?? {})],
    enabled: !!companyId && opts.enabled !== false,
    queryFn: async (): Promise<T[]> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let q = (supabase.from as any)(table).select(opts.select ?? "*").eq("company_id", companyId);
      for (const [k, v] of Object.entries(opts.eq ?? {})) q = v === null ? q.is(k, null) : q.eq(k, v);
      q = q.order(opts.order ?? "created_at", { ascending: opts.ascending ?? false }).limit(opts.limit ?? 500);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return (data ?? []) as T[];
    },
  });
}

export function useInvalidate() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ predicate: (q) => q.queryKey[0] === "f" });
}
