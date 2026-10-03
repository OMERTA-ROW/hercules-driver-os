# Hercules Freight OS — build plan

## Decisions to confirm
- The spec replaces the current look (matte colorways, mercury orb, gold, futuristic). The new look is a light, professional logistics workspace: white/light gray, navy navigation, blue/green actions, shield/road/cargo logo. The colorway picker and the futuristic orb visuals are retired. Voice features stay, with a plain microphone button.
- Existing records are kept. All database changes only add things: no tables, columns or rows are deleted.
- No publishing, purchases, paid API calls, real messages, bookings or payments.

## Delivery in phases (each phase is built, tested and checked in preview before the next)
1. **Foundation**: new design system and logo, app shell (desktop sidebar plus mobile driver layout), all 32 routes wired with real empty states. Auth pages: login, signup, forgot/reset password, callback, logout. Protected routes.
2. **Tenancy and security**: companies, memberships with multiple roles, permissions, hashed single-use email-bound invites, company/role switcher that clears cached data, audit log, RLS on every company table, constraints that block links between companies.
3. **Loads core**: loads, stops, trips, assignments, status history, exceptions, version history. Required-field rules enforced on the server. Assignment overlap and availability checks run in one database transaction. A load can only be marked delivered with a stored POD, or by an authorized override with a mandatory reason.
4. **Documents**: private storage, company and load access rules, type and size checks, signed downloads, versions, cleanup when an upload fails.
5. **Role workspaces**: driver mobile flow (accept/decline, status steps, uploads), dispatcher board, fleet owner (equipment, maintenance, expiry), broker tender flow, shipper portal, customer and carrier directories, messages.
6. **Finance**: invoices, settlements, payment records, with finance columns hidden from roles that don't need them. No real payments.
7. **Approvals and automation**: rules, runs, approval requests tied to a fixed payload and version, protection against replay, self-approval and duplicate execution. Every suggestion explains "Why this was suggested", with review and undo.
8. **Integrations**: provider cards with honest states. Each one shows Not Connected until it is actually configured and verified. Exact prerequisites listed.
9. **Verification**: database cross-company denial tests, concurrency, finance isolation, POD gate, approval replay. Typecheck, tests, build, browser checks for each role on desktop and mobile. Write docs/hercules-freight-os-build-report.md.

## Technical notes
- Existing `companies`, `company_members`, `company_invites`, `loads`, `vehicles`, `documents`, `trips` are extended rather than duplicated. Invite codes move to a hashed column, and the old plain codes are marked deprecated.
- Privileged writes go through security-definer database functions and authenticated server functions. The browser never decides permissions.
- Expect several turns. Each turn reports what is truly done and what remains.
