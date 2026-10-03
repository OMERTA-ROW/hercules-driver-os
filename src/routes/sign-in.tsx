import { createFileRoute, redirect } from "@tanstack/react-router";

// Legacy address kept working: the account pages moved to /login.
export const Route = createFileRoute("/sign-in")({
  beforeLoad: () => {
    throw redirect({ to: "/login", replace: true });
  },
});
