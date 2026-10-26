import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Layers, Truck, Navigation2, Radio, WifiOff, Timer, Mic, Wrench, FileText, Users, Receipt } from "lucide-react";
import { featureStatuses } from "@/data/feature-status";
import { useAuth } from "@/lib/auth";
import { allowedFor, useAccess } from "@/lib/access";

const icons = { 1: Navigation2, 2: Truck, 3: Radio, 4: WifiOff, 5: Timer, 6: Mic, 7: Wrench, 8: FileText, 9: Users, 10: Receipt };

export function CapabilityDirectory() {
  const { account } = useAuth();
  const access = useAccess();
  return (
    <section id="add-ons" aria-labelledby="capability-heading" className="capability-directory scroll-mt-32">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs uppercase text-primary"><Layers className="size-4" /> HERCULES / Capability status</div>
          <h2 id="capability-heading" className="font-display text-3xl font-medium uppercase sm:text-4xl">Your next mile.</h2>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">10 requested add-ons. No full add-on verified complete. Available groundwork and previews are listed below.</p>
        </div>
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground" aria-label="Add-on summary">
          <span><strong className="text-primary">3</strong> Partial</span>
          <span><strong className="text-violet">4</strong> Demo</span>
          <span><strong className="text-foreground">3</strong> Planned</span>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {featureStatuses.map((item) => {
          const Icon = icons[item.id as keyof typeof icons];
          const canOpen = item.destination && (!account || allowedFor(item.destination, access.active));
          return (
            <article key={item.id} className="capability-item flex min-w-0 flex-col p-5" data-capability-status={item.status}>
              <div className="mb-5 flex items-center justify-between gap-3">
                <Icon className="size-5 text-primary" aria-hidden />
                <span className={`capability-status text-xs ${item.status === "Demo" ? "text-violet" : item.status === "Partial" ? "text-primary" : "text-muted-foreground"}`}>{item.status}</span>
              </div>
              <h3 className="text-base font-semibold">{item.name}</h3>
              <p className="mt-2 text-sm leading-relaxed text-foreground">{item.detail}</p>
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{item.limitation}</p>
              <div className="mt-auto pt-5">
                {canOpen && item.destination ? (
                  <Link to={item.destination} className="capability-link inline-flex min-h-11 items-center gap-2 text-sm text-primary">
                    {item.destinationLabel}<ArrowUpRight className="size-4" aria-hidden />
                  </Link>
                ) : (
                  <span className="inline-flex min-h-11 items-center text-xs text-muted-foreground">{item.status === "Planned" ? "Not available yet" : "Existing screen · role access required"}</span>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}