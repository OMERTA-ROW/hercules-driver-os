# Hercules Driver's Command

Build the first version of HERCULES — a voice-first AI dispatch and driver operating system for truck drivers, especially lease owner-operators who have no back office.

Brand: HERCULES is the public-facing product. ZEUS is the internal company brand. Keep the visual identity strong, dark, and industrial — heavy-duty, high-contrast, built for a cab-mounted tablet. Large touch targets, high legibility in daylight and at night, dark mode by default.

Core design principle, applies everywhere: DRIVER APPROVED. The driver is the captain of the ship. The AI proposes, the driver decides. Nothing is ever booked, committed, or locked without explicit driver confirmation. Every recommendation is a suggestion the driver can override.

Build these screens (mock/placeholder data is fine — no backend needed in this first pass):

1. DASHBOARD — home screen. Current load, hours of service remaining, miles to destination, ETA, live profit-per-mile on the current run, and truck health at a glance. Big readable tiles.

2. LOAD BOARD — available loads with rate, miles, rate-per-mile, pickup and delivery, and profit estimate. Each load must show FACILITY INTELLIGENCE before the driver commits: shipper/receiver open and close times, whether it's a 24-hour facility, weekend closures, and PARKING info (on-site parking, overnight allowed, nearest safe parking with distance). Each load has an "Approve & Book" action requiring explicit confirmation.

3. TRUCK HEALTH — ECM and sensor readouts: real-time fuel economy, engine hours, odometer, fault codes, tire pressure, brake wear, coolant and oil temp, DEF level, idle time. Flag anything needing attention. Predictive maintenance warnings.

4. FINANCIALS — profit and loss per load and per mile, settlements, fuel and IFTA tracking, detention time tracking, running weekly and monthly totals.

5. ALERTS — a driver-to-driver warning network. Drivers report DOT presence, active scales, and inspection activity. Drivers approaching that area get advance notice so they can get their pre-trip and post-trip in order and arrive compliant. IMPORTANT FRAMING: this is a compliance preparation and warning system, NOT an enforcement-evasion tool. Copy should say "arrive prepared and compliant."

6. DRIVER PROFILE / LEARNING — a personal fatigue and rhythm model. Shows the driver's own patterns and recommends breaks based on that individual driver rather than blanket rules. Frame all break guidance as suggestion, never enforcement.

7. VOICE INTERFACE — a persistent, prominent voice control element on every screen. Large mic button, visible listening state, transcript panel. Design it as the primary way to use the app: the driver speaks, the app responds and reads data aloud. Include a visible list of example voice commands.

Also include a LOAD RESET action — when a load falls through, a breakdown happens, or the driver is stuck in detention, one action recalculates the whole day: hours, route, parking, food, rest, and starts surfacing replacement loads.

Use React with Tailwind. Mobile and tablet responsive, but optimize the layout for a landscape tablet mounted in a truck cab. Mock data throughout.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://hercules-driver-os.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/59def010-ac63-461f-85a8-6757ef85ef3e).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
