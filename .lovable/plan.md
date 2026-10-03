# Focused BOL extension for the Hercules bubble

## Scope
- Keep the original Hercules pages, navigation, voice models, billing safeguards, and single conversation bubble.
- Add BOL draft creation, review, print preview, and email-draft access inside that bubble only.
- Reuse only the signed-in driver's existing profile, current assigned load, active vehicle, and saved document records. Unknown shipment fields remain visibly marked as missing.

## Implementation
- Add an owner-scoped BOL draft record using the existing documents model, with structured draft fields and row-level ownership protection.
- Extend deterministic voice/text intent handling for exact BOL commands: create, open/review, print preview, email draft, confirm, and cancel. Ambiguous wording will not print or send.
- Add a compact BOL editor/review card in the existing chat panel with shipper/consignee, pickup/delivery, carrier/load reference, items, handling units, weight/unit, freight instructions, and unsigned signature areas.
- Print only after an explicit confirmation button, using a clean print-only document and the browser/device print dialog.
- Show an editable email draft and BOL preview. Since no mail provider is configured, expose an honest “Open email app” fallback without claiming an attachment or send; Gmail/Outlook connection remains pending user choice.

## Safety and verification
- Enforce sign-in and record ownership at data access and action execution.
- Never invent shipment facts, signatures, compliance claims, sending, or printer connectivity.
- Add intent and draft validation tests, then verify create/review/cancel, printable desktop/mobile layout, unconfigured email state, and no unintended external calls.
- Do not publish, send email, start printer jobs during tests, or invoke paid AI/voice services.
