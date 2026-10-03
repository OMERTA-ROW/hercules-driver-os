import { createFileRoute, redirect } from "@tanstack/react-router";

// Legacy address kept working: the account pages moved to /signup.
export const Route = createFileRoute("/sign-up")({
  beforeLoad: () => {
    throw redirect({ to: "/signup", replace: true });
  },
});
