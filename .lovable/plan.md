# Resume: Hercules chat bubble only

## The actual chat-bubble request
The most recent chat-bubble request is the owner's "Hercules chat redesign blueprint", saved as `docs/chat-experience-blueprint.md`. It asks for: a pure black chat background, charcoal surfaces, warm-white text, small gold accents; your messages on the right in rounded grey bubbles, Hercules replies on the left as open text; a rounded message box with typing, send/stop and microphone; honest listening/thinking/speaking states; jump-to-latest; rich reply cards; 44px touch targets; mobile safe-area handling.

Earlier chat-bubble requests that are already built into the same single bubble (not new work):
- "use the first templet and upgrade that chat bubble" (chat message #183): text chat, voice, minimize/reopen, clear, stop.
- BOL / print / email add-on (#185, #188): handled separately, no change here.

Not included (per your instruction): the floating navigation pill styling, ElevenLabs/Medusa voice work, and the Omni workspace/folders task.

## Status by item (evidence: `src/components/hercules/VoiceDock.tsx`, `src/styles.css`, `docs/chat-experience-blueprint.md`)

| Item | Status |
|---|---|
| Blueprint file saved | Done (file exists) |
| Black panel, charcoal composer, gold heading, user bubbles right / replies left | Built in code, NOT verified on screen |
| Formatted replies and code blocks with copy | Built (existing renderer), NOT verified |
| Jump-to-latest button, stay-at-bottom scrolling | Built (existing), NOT verified |
| 44px buttons, gold focus rings, safe-area padding, spoken status for screen readers | Built in code, NOT verified |
| Approval cards (Approve / Decline with status) | Restyled, NOT verified |
| Images, audio, file cards (phase 2) | Blocked: chat messages can't carry attachments yet |
| Saved chat history | Blocked: needs a new database table (not requested yet) |
| Phone / tablet / keyboard testing | Not done: the chat only shows after sign-in and no test account exists |

Orb, gold halo and black/gold styling stay untouched.

## Next concrete step
1. Sign the preview in with a test account (you create one in the preview, or approve me minting a session for an existing account).
2. Open the chat at phone (390px), tablet (820px) and desktop (1280px); send a long message and a code block; check text wraps, the copy button works, jump-to-latest appears when scrolled up, the message box isn't hidden by the keyboard bar, and Tab moves through every button with a visible ring.
3. Fix only what that check shows is broken in `VoiceDock.tsx` / `src/styles.css`, rerun the voice-cancel and credit tests, and report each item above as verified or still open.

No sending real messages to paid voice, no publishing, no billing changes. Other paused Hercules work stays paused.

## Question for you
Should saved chat history (needs a new database table) be added later, or stay out of scope?
