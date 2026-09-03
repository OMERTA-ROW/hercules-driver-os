import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { LogIn } from "lucide-react";
import { toast } from "sonner";
import { Panel, Label, DriverApprovedNote } from "@/components/hercules/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { ThemeToggle } from "@/components/hercules/ThemeToggle";

export const Route = createFileRoute("/sign-in")({
  head: () => ({
    meta: [
      { title: "Sign In — HERCULES" },
      {
        name: "description",
        content: "Sign in to HERCULES, the voice-first AI dispatch and driver operating system.",
      },
      { property: "og:title", content: "Sign In — HERCULES" },
      { property: "og:description", content: "Back in the seat. Sign in to HERCULES." },
    ],
  }),
  component: SignIn,
});

function SignIn() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
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
          <Label>Sign in</Label>
          <h1 className="mt-1 text-2xl font-bold uppercase">Welcome back</h1>
          <form
            className="mt-4 space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (!email || !password) {
                toast.error("Enter your email and password");
                return;
              }
              signIn(email);
              toast.success("Signed in");
              void navigate({ to: "/" });
            }}
          >
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                autoComplete="email"
                aria-label="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@carrier.com"
                className="mt-1 h-12 text-base"
              />
            </div>
            <div>
              <Label>Password</Label>
              <Input
                type="password"
                autoComplete="current-password"
                aria-label="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-1 h-12 text-base"
              />
            </div>
            <Button type="submit" size="lg" className="w-full gap-2">
              <LogIn className="h-4 w-4" /> Sign in
            </Button>
          </form>
          <p className="mt-4 text-sm text-muted-foreground">
            No account yet?{" "}
            <Link to="/sign-up" className="text-primary underline">
              Start a 7-day free trial
            </Link>{" "}
            or{" "}
            <Link to="/pricing" className="text-primary underline">
              compare plans
            </Link>
            .
          </p>
          <div className="mt-3">
            <DriverApprovedNote>
              Demo sign-in. Nothing is charged and nothing is committed without your approval.
            </DriverApprovedNote>
          </div>
        </Panel>
      </div>
    </main>
  );
}
