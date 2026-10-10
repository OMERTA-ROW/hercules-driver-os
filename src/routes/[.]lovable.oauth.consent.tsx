import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

type OAuthResult = { data: { redirect_url?: string; redirect_to?: string; client?: { name?: string } } | null; error: { message: string } | null };
type OAuthApi = {
  getAuthorizationDetails: (id: string) => Promise<OAuthResult>;
  approveAuthorization: (id: string) => Promise<OAuthResult>;
  denyAuthorization: (id: string) => Promise<OAuthResult>;
};
const oauth = () => (supabase.auth as unknown as { oauth: OAuthApi }).oauth;

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Connect an assistant — HERCULES" },
      { name: "description", content: "Approve or deny an assistant's access to your Hercules account." },
      { property: "og:title", content: "Connect an assistant — HERCULES" },
      { property: "og:description", content: "Approve or deny an assistant's access to your Hercules account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s.authorization_id === "string" ? s.authorization_id : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Missing authorization request.");
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/sign-in", search: { next: location.pathname + location.searchStr } });
  },
  loader: async ({ location }) => {
    const id = new URLSearchParams(location.search).get("authorization_id")!;
    const { data, error } = await oauth().getAuthorizationDetails(id);
    if (error) throw new Error(error.message);
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    return data;
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <section role="alert" className="panel max-w-md p-6 text-center">
        <h1 className="font-display text-xl uppercase tracking-[0.14em]">Request unavailable</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This connection request couldn't be loaded. It may have expired — start again from your assistant.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">{String((error as Error)?.message ?? error)}</p>
      </section>
    </main>
  ),
});

function Consent() {
  const details = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const name = details?.client?.name ?? "An assistant";

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    try {
      const { data, error } = approve
        ? await oauth().approveAuthorization(authorization_id)
        : await oauth().denyAuthorization(authorization_id);
      if (error) throw new Error(error.message);
      const target = data?.redirect_url ?? data?.redirect_to;
      if (!target) throw new Error("No redirect returned.");
      window.location.href = target;
    } catch (e) {
      setBusy(false);
      setError(e instanceof Error ? e.message : "Something went wrong. Try again.");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <section className="panel w-full max-w-md p-6">
        <h1 className="font-display text-xl uppercase tracking-[0.14em]">Connect {name}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {name} wants to read your Hercules roles, vehicles, loads and document list as you. It cannot book, send, sign or change anything.
        </p>
        {error ? <p role="alert" className="mt-3 text-sm">{error}</p> : null}
        <div className="mt-5 flex gap-3">
          <Button disabled={busy} onClick={() => void decide(true)}>Approve</Button>
          <Button variant="outline" disabled={busy} onClick={() => void decide(false)}>Deny</Button>
        </div>
      </section>
    </main>
  );
}
