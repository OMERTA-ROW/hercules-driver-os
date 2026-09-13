import { useState } from "react";
import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { MailCheck } from "lucide-react";
import { toast } from "sonner";
import { Panel, Label, Pill } from "@/components/hercules/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/hercules/ThemeToggle";
import { useAuth } from "@/lib/auth";

/**
 * CHECK YOUR EMAIL
 * ================
 * Email confirmation stays on — it is a normal step, not a shortcut to skip.
 * This screen tells the driver exactly what to do, where the link lands them
 * (straight back into Get Set Up), and lets them ask for the mail again.
 */
export const Route = createFileRoute("/confirm-email")({
  validateSearch: (search: Record<string, unknown>) => ({
    email: typeof search["email"] === "string" ? search["email"] : "",
  }),
  head: () => ({
    meta: [
      { title: "Confirm Your Email — HERCULES" },
      {
        name: "description",
        content:
          "Confirm your email address to finish creating your HERCULES account, then pick up where you left off in Get Set Up.",
      },
      { property: "og:title", content: "Confirm Your Email — HERCULES" },
      {
        property: "og:description",
        content: "One click in your inbox and your 7-day trial account is ready.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ConfirmEmail,
});

function ConfirmEmail() {
  const { email: fromSignup } = useSearch({ from: "/confirm-email" });
  const { resendConfirmation } = useAuth();
  const [email, setEmail] = useState(fromSignup);
  const [busy, setBusy] = useState(false);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-xl">
        <div className="mb-5 flex items-center justify-between">
          <Link
            to="/"
            className="font-display text-3xl font-bold uppercase tracking-[0.14em] text-primary"
          >
            HERC<span className="text-foreground">ULES</span>
          </Link>
          <ThemeToggle size="sm" />
        </div>

        <Panel>
          <div className="flex items-center gap-3">
            <MailCheck className="h-7 w-7 text-primary" />
            <div>
              <Label>Almost there</Label>
              <h1 className="text-2xl font-bold uppercase">Check your email</h1>
            </div>
            <Pill tone="primary" className="ml-auto">
              Step 1 of 3
            </Pill>
          </div>

          <p className="mt-3 text-sm text-muted-foreground">
            {email ? (
              <>
                We sent a confirmation link to{" "}
                <span className="text-foreground">{email}</span>.
              </>
            ) : (
              <>We sent you a confirmation link.</>
            )}{" "}
            Open it on this device and it brings you straight back here, into Get Set Up, already
            signed in. Your {""}
            7-day trial is already on the account — no card, nothing charged.
          </p>

          <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
            <li>· It usually lands within a minute.</li>
            <li>· Not there? Look in spam or promotions.</li>
            <li>· Signing in before you confirm is refused on purpose — confirm first.</li>
          </ul>

          <div className="mt-4 flex flex-wrap items-end gap-2">
            <div className="min-w-[14rem] flex-1">
              <Label>Your email</Label>
              <Input
                type="email"
                autoComplete="email"
                aria-label="Your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@carrier.com"
                className="mt-1 h-12 text-base"
              />
            </div>
            <Button
              size="lg"
              disabled={busy}
              onClick={() => {
                if (busy) return;
                setBusy(true);
                void (async () => {
                  const res = await resendConfirmation(email);
                  setBusy(false);
                  toast[res.ok ? "success" : "error"](
                    res.ok ? "Confirmation sent again" : "Not sent",
                    { description: res.message },
                  );
                })();
              }}
            >
              {busy ? "Sending…" : "Send it again"}
            </Button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild size="lg" variant="outline">
              <Link to="/sign-in">I've confirmed — sign in</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/welcome">See the setup steps</Link>
            </Button>
          </div>

          <p className="mt-3 text-xs text-muted-foreground">
            Wrong address? Create the account again with the right one — nothing was charged.
          </p>
        </Panel>
      </div>
    </main>
  );
}
