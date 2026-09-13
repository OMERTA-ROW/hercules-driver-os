import { createFileRoute } from "@tanstack/react-router";
import { ShieldAlert, Check } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/hercules/AppShell";
import {
  Panel,
  PanelTitle,
  Pill,
  Label,
  EmptyState,
  DriverApprovedNote,
} from "@/components/hercules/primitives";
import { Button } from "@/components/ui/button";
import { useAlertRows, useRefreshLive } from "@/lib/live";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/alerts")({
  head: () => ({
    meta: [
      { title: "Road Alerts — HERCULES" },
      {
        name: "description",
        content:
          "Checkpoints, scales, and road hazards raised on your account, with nothing invented and nothing acted on without your say.",
      },
      { property: "og:title", content: "Road Alerts — HERCULES" },
      {
        property: "og:description",
        content: "Your own alerts, read aloud and acknowledged only by you.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Alerts,
});

function tone(severity: string) {
  if (severity === "high" || severity === "critical") return "alert" as const;
  if (severity === "medium" || severity === "warn") return "warn" as const;
  return "info" as const;
}

function Alerts() {
  const { account } = useAuth();
  const { data, isLoading } = useAlertRows();
  const refresh = useRefreshLive();
  const rows = data ?? [];
  const open = rows.filter((a) => !a.acknowledged_at);

  async function acknowledge(id: string) {
    const { error } = await supabase
      .from("alerts")
      .update({ acknowledged_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      toast.error("Could not mark that read", { description: error.message });
      return;
    }
    toast.success("Marked read");
    refresh();
  }

  return (
    <AppShell
      title="Road Alerts"
      subtitle={
        open.length > 0 ? `${open.length} open on your account` : "Nothing open on your account"
      }
    >
      <div className="grid gap-4">
        <Panel>
          <PanelTitle right={<Pill tone="primary">Your account</Pill>}>Active alerts</PanelTitle>

          {!account ? (
            <EmptyState title="Sign in to see your alerts">
              Alerts are tied to your account. Nothing is shown until you are signed in.
            </EmptyState>
          ) : isLoading ? (
            <p className="text-sm text-muted-foreground">Reading your alerts…</p>
          ) : rows.length === 0 ? (
            <EmptyState title="No alerts">
              Nothing has been raised on your account. Checkpoints, scales, and hazards will show
              here the moment they are reported against your lane.
            </EmptyState>
          ) : (
            <ul className="space-y-2">
              {rows.map((a) => (
                <li
                  key={a.id}
                  className="rounded-lg border border-border bg-card/50 p-3 sm:flex sm:items-start sm:justify-between sm:gap-4"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Pill tone={tone(a.severity)}>
                        <ShieldAlert className="h-3.5 w-3.5" /> {a.kind}
                      </Pill>
                      {a.acknowledged_at ? <Pill tone="neutral">Read</Pill> : null}
                    </div>
                    <div className="mt-1.5 font-display text-base uppercase tracking-[0.08em]">
                      {a.title}
                    </div>
                    {a.body ? <p className="mt-1 text-sm text-muted-foreground">{a.body}</p> : null}
                    <Label className="mt-1">{new Date(a.created_at).toLocaleString()}</Label>
                  </div>
                  {!a.acknowledged_at ? (
                    <Button
                      variant="outline"
                      size="lg"
                      className="mt-3 gap-2 sm:mt-0"
                      onClick={() => void acknowledge(a.id)}
                    >
                      <Check className="h-4 w-4" /> Mark read
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3">
            <DriverApprovedNote>
              HERCULES reads alerts aloud and nothing more. Rerouting, reporting, and clearing are
              yours to approve.
            </DriverApprovedNote>
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}
