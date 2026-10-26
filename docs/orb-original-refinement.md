# Original Hercules orb refinement

This implements the owner’s original spec, not exact proprietary ChatGPT assets, dimensions or behavior.

Main diameter is clamp(180px, 42vw, 320px); centered with safe-area horizontal padding. Compact dock/header orbs keep their existing sizes. Short screens use compact header/empty-state spacing and scrollable conversation content, not a floating orb over messages or composer. A stable circular mask and gold rim surround independently advected, domain-warped pearl-white noise layers in deep violet. No rotating container or texture. Idle/listening/thinking/speaking dynamics and actual playback-derived state remain unchanged; speaking becomes brighter and flows faster with measured amplitude, with baseline fallback when unavailable. Reduced motion hides canvas in favor of a static token-defined gradient.

Main canvas targets approximately 30fps, capped at 96×96 desktop or 80×80 phone; compact orbs remain 56×56 with lower refresh. Canvas work pauses offscreen/background and reduced motion. No heavy GPU renderer.

Verified desktop 1280×1800, phone 390×844, short phone 390×560: 320/180/180px diameters, 30–31 canvas draws/sec in sandbox, fixed-position pixel changes, stationary sphere (no rotation), no horizontal overflow or page errors, complete short-screen circle above an unobstructed composer. Reduced motion: zero frame/pixel changes, visible static gradient. 54 focused orb, voice cancellation, chat and reviewer tests pass; automatic build/typecheck passes. Speaking speed/light is tested with real-state helpers; live metered audio not invoked and physical phone sustained performance is not claimed. Broker/dispatcher/driver work remains intact; no backend changes or publication in this refinement.
