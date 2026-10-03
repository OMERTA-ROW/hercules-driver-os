import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, ClipboardCheck, FileLock2, Gauge, ShieldCheck, Truck } from "lucide-react";
import { Logo } from "@/components/freight/ui";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Hercules Freight OS — Move freight with strength, clarity, and control" },
      { name: "description", content: "Dispatch command center, driver workspace, documents, approvals and settlements for carriers, brokers, fleets and shippers." },
      { property: "og:title", content: "Hercules Freight OS" },
      { property: "og:description", content: "Move freight with strength, clarity, and control." },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  { icon: Gauge, t: "Dispatch command center", b: "A live board from unassigned to completed. Assignments check driver, truck, trailer and schedule overlaps on the server." },
  { icon: Truck, t: "Driver workspace", b: "Big, clear controls for the next step. Accept or decline with a reason, then upload BOL, POD and receipts from the cab." },
  { icon: FileLock2, t: "Private documents", b: "Company and load access rules, signed downloads, versions. A load can't be closed without a stored POD." },
  { icon: ClipboardCheck, t: "Human approvals", b: "Rate changes, reassignments, bookings, invoices and payments wait for a second person. An approval can't be used twice." },
];

function Landing() {
  return (
    <div className="hfo">
      <header className="bg-ink">
        <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-5">
          <Logo light />
          <nav className="flex items-center gap-2">
            <Link to="/login" className="rounded-lg px-4 py-2.5 text-sm font-semibold text-ink-foreground hover:bg-ink-line">Sign in</Link>
            <Link to="/signup" className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90">Get started</Link>
          </nav>
        </div>
        <section className="relative mx-auto max-w-6xl px-5 pb-24 pt-16">
          <div className="absolute inset-0 opacity-[0.06] [background-image:linear-gradient(var(--gold)_1px,transparent_1px),linear-gradient(90deg,var(--gold)_1px,transparent_1px)] [background-size:48px_48px]" aria-hidden />
          <p className="relative text-xs font-semibold uppercase tracking-[0.3em] text-gold">Freight operating system</p>
          <h1 className="relative mt-5 max-w-3xl font-serif text-5xl leading-[1.05] text-ink-foreground md:text-6xl">
            Move freight with strength, clarity, and control.
          </h1>
          <p className="relative mt-6 max-w-xl text-lg text-ink-muted">
            One workspace for carriers, dispatchers, drivers, brokers, fleet owners and shippers. Each person sees only what their role allows.
          </p>
          <div className="relative mt-8 flex flex-wrap gap-3">
            <Link to="/signup" className="rounded-lg bg-primary px-6 py-3.5 font-semibold text-primary-foreground hover:bg-primary/90">Create your company</Link>
            <Link to="/login" className="rounded-lg border border-gold/60 px-6 py-3.5 font-semibold text-ink-foreground hover:bg-ink-line">I have an invitation</Link>
          </div>
        </section>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-16">
        <div className="grid gap-5 md:grid-cols-2">
          {FEATURES.map((f) => (
            <article key={f.t} className="hfo-card p-6">
              <f.icon className="h-6 w-6 text-primary" aria-hidden />
              <h2 className="mt-4 text-xl font-semibold">{f.t}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{f.b}</p>
            </article>
          ))}
        </div>
        <section className="hfo-card mt-10 p-8">
          <div className="flex items-center gap-3"><ShieldCheck className="h-5 w-5 text-ok" /><h2 className="text-xl font-semibold">Honest by design</h2></div>
          <ul className="mt-4 grid gap-3 text-sm md:grid-cols-2">
            {["Roles are granted by your company admin, never picked by yourself.", "Live tracking, load boards, ELD and accounting show as not connected until they're set up and verified.", "Every status, rate, assignment and document change is kept in an audit trail.", "Drivers never see rates, settlements of others, or other drivers' loads."].map((x) => (
              <li key={x} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-ok" />{x}</li>
            ))}
          </ul>
        </section>
      </main>
      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">© Hercules Freight OS</footer>
    </div>
  );
}
