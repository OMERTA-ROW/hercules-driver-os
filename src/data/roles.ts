/**
 * NETWORK ROLE MODEL
 * ==================
 * driver → dispatcher → broker. Each layer is a strict superset of the scope
 * below it. This module is intentionally free of any driver-side imports so the
 * dispatcher and broker layers can be lifted into their own app later: the only
 * thing they share with HERCULES is the data model, never the components.
 */

export type NetworkRole = "driver" | "dispatcher" | "broker";

export type NetworkScope =
  /* driver */
  | "self.truck"
  | "self.loads"
  | "self.documents"
  /* dispatcher — fleet-wide, read heavy, intervention only */
  | "fleet.monitor"
  | "fleet.exceptions"
  | "fleet.override"
  /* broker — the tier above dispatch */
  | "network.post"
  | "network.match"
  | "network.track"
  | "network.facilities";

export type RoleSpec = {
  id: NetworkRole;
  /** Higher rank = wider scope. driver 1 → dispatcher 2 → broker 3. */
  rank: number;
  label: string;
  who: string;
  /** One-line statement of what the role actually does day to day. */
  job: string;
  /** Scopes this role adds on top of every role beneath it. */
  adds: NetworkScope[];
  /** Deliberate non-goals — what this role is NOT for. */
  notFor: string[];
};

export const roleSpecs: RoleSpec[] = [
  {
    id: "driver",
    rank: 1,
    label: "Driver",
    who: "Owner-operator or company driver in the seat.",
    job: "Runs the truck. Approves everything HERCULES proposes.",
    adds: ["self.truck", "self.loads", "self.documents"],
    notFor: ["Cannot see other trucks", "Cannot post freight"],
  },
  {
    id: "dispatcher",
    rank: 2,
    label: "Dispatcher",
    who: "Large fleet, 100+ vehicles. Supervises, does not assign.",
    job: "Watches the fleet and handles exceptions. HERCULES does the dispatching.",
    adds: ["fleet.monitor", "fleet.exceptions", "fleet.override"],
    notFor: [
      "No manual load-assignment desk — HERCULES matches and routes",
      "Override is for exceptions, not for day-to-day work",
    ],
  },
  {
    id: "broker",
    rank: 3,
    label: "Broker",
    who: "Posts freight into the HERCULES network.",
    job: "Posts and manages loads, tracks them, supplies facility intelligence.",
    adds: ["network.post", "network.match", "network.track", "network.facilities"],
    notFor: ["Cannot drive a truck's approvals for it — the driver still accepts"],
  },
];

export function roleSpec(id: NetworkRole): RoleSpec {
  return roleSpecs.find((r) => r.id === id) ?? roleSpecs[0]!;
}

/** Every scope a role holds, including everything inherited from below. */
export function scopesFor(id: NetworkRole): NetworkScope[] {
  const rank = roleSpec(id).rank;
  return roleSpecs.filter((r) => r.rank <= rank).flatMap((r) => r.adds);
}

export function roleHasScope(id: NetworkRole, scope: NetworkScope) {
  return scopesFor(id).includes(scope);
}

/** Is this role at or above the required layer? */
export function roleAtLeast(id: NetworkRole, min: NetworkRole) {
  return roleSpec(id).rank >= roleSpec(min).rank;
}
