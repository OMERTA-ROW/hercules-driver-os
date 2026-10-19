<!-- LOVABLE:BEGIN -->

> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

<!-- LOVABLE:END -->

<!-- HERCULES:BEGIN -->

- Keep the original Hercules template and enhance its single conversation dock in place; do not add competing setup or freight interfaces.
- Freight roles and approval authority must come from authenticated server/database checks, never client-selected or browser storage.
- Freight tenant data must remain company-scoped through database constraints and row-level policies.
- BOL drafts stay in the owner-scoped documents model; print and email actions require explicit local confirmation because no external provider is assumed.

<!-- HERCULES:END -->
- Keep the shared app theme fixed; artwork, energy accents and state animations are scoped to the voice Orb and the home orb screen cave scene (decorative, behind a readability scrim); this preserves workspace contrast and avoids a competing interface.
- Orb presentation reads a separate playback-derived state and the existing voice-level meter without changing command modes; this separates pending responses from audible speech while preserving voice behavior.

- Account roles live in hercules_user_roles (server-granted only via onboarding trigger or hercules_role_set); page access map is src/lib/access.tsx — keeps role grants out of client control.

- Agent integrations (MCP) live in src/lib/mcp/ with read-only, OAuth-protected tools that query as the caller via RLS — outside assistants must never book, send or change data without in-app confirmation.
