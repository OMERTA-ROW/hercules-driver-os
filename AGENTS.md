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
- Keep one shared workspace theme with restrained accent edges; artwork and state animations remain scoped to the voice Orb/home scene, preserving contrast without a competing interface.
- Orb presentation reads a separate playback-derived state and the existing voice-level meter without changing command modes; this separates pending responses from audible speech while preserving voice behavior.
- Render internal orb clouds with a bounded-resolution domain-warped canvas field, pausing offscreen and under reduced motion; this evolves formations without rotating a static sphere or changing voice logic.
- Mount the single VoiceDock inside the shared root providers, using a full conversation presentation on home and a collapsible dock elsewhere; this preserves session UI across navigation without competing chats.

- Account roles live in hercules_user_roles (server-granted only via onboarding trigger or hercules_role_set); page access map is src/lib/access.tsx — keeps role grants out of client control.

- Agent integrations (MCP) live in src/lib/mcp/ with read-only, OAuth-protected tools that query as the caller via RLS — outside assistants must never book, send or change data without in-app confirmation.

- Vehicle row conversion and routing-input validation live in src/lib/vehicle-profile.ts; legacy equipment remains unconfirmed until explicit measurements, trailer and hazmat are saved, so catalog defaults cannot masquerade as measured routing data.
- The dashboard capability directory uses src/data/feature-status.ts independently of paid add-on entitlements; planned/demo discovery must never activate subscriptions or bypass existing screen access.
- Broker intake/review uses company-scoped broker_* records and authenticated RPCs, separate from legacy device-only network demos; approved outbox intents stay blocked until a verified sender and durable worker are configured.
