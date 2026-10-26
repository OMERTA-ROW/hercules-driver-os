# Hercules Conversation Workspace Blueprint

## Final owner directive — October 26, 2026
The linked Notion page requires sign-in; private blueprint contents could not be read. Implement the owner's written directive using a true-black home conversation screen, original royal-purple orb with pearly-white internal vapor and a subtle gold rim, and the existing shared text/voice session. No cavern background or floating navigation substitute. Listening pulses subtly, thinking flows, and luminous speaking flare/faster vapor activate only from actual playback state. Reduced motion is static. One root-mounted conversation persists drafts and UI across route navigation; no second chat or new provider. Existing auth, credits, approvals, BOL, personas and integrations remain unchanged.

## Goal
Replace the crude chat presentation with a polished, familiar conversational workspace (not a copy of proprietary ChatGPT internals). True black `#000` chat background, dark charcoal surfaces, readable warm-white text, restrained gold accents. User messages right-aligned in rounded dark-gray bubbles with sensible max width; Hercules replies left-aligned as open readable blocks on the background. Generous spacing, centered transcript, selectable text, accessible contrast/focus, reduced motion.

## Composer
Anchored rounded input bar, multiline typing, send/stop, labeled microphone; attachment control only where actually supported. Honest dictation/listening/thinking/speaking/error states; no dead buttons. Mobile safe-area/keyboard handling; 44px minimum targets; never covers voice controls, orb or navigation. Autoscroll only when near bottom; new-message indicator when reading history.

## Rich assistant messages
Typed blocks: formatted text/lists, safe code blocks with copy, images with expand view, audio player, downloadable file cards, structured action/result cards with status and explicit confirmation for consequential actions. Only render real attachments/results; unsupported features shown as unavailable; never fake files or successful actions. Sanitize content/URLs, respect auth-scoped file access, no unsafe raw HTML. Do not invent general AI connectivity if the command backend is rule-based.

## Conversation behavior
Preserve voice/text continuity where the data model supports it; stop old audio on interruption, no overlapping playback, preserve drafts on errors, accessible status announcements. No persona/provider changes. History persistence or new backend abilities reported separately if prerequisites are missing.

## Delivery phases and status
| Phase | Scope | Status |
|---|---|---|
| 1 | Black chat layout, composer, text/code messages | Implemented in the single VoiceDock panel. Markdown/code rendering with copy via existing sanitized renderer (Streamdown, no raw HTML). Stick-to-bottom autoscroll + jump-to-latest button (existing). 44px targets, gold focus rings, safe-area padding, live status region. |
| 2 | Image/audio/file cards | Blocked: the conversation turn model (`text`, optional `proposal`) carries no attachments, images, audio or files. No attachment button shown, because uploads aren't supported in chat. |
| 3 | Tool/action cards, extended behavior | Partial: existing approval proposals restyled as action cards with explicit Approve/Decline and status label. BOL controls unchanged. History persistence is not implemented (turns are in-memory); needs a backend table. |

## Testing notes
Voice cancellation and credit tests run unchanged; persona, provider, auth and billing code untouched.
