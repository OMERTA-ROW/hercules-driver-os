/**
 * MEMBERS & INVITATIONS — owner/admin helpers.
 *
 * Pure, testable rules for the owner admin screen. Every rule here is ALSO
 * enforced server-side (company_invite_create, company_member_decide,
 * company_member_remove, hercules_role_set all re-check the caller in the
 * database); these helpers exist so the interface refuses bad input early
 * and so the rules are pinned by tests. Nothing here grants access on its
 * own.
 */

import type { HerculesRole } from "@/lib/access";

/** Roles an owner/company admin may hand out. Platform Admin is never assignable. */
export const assignableRoles: HerculesRole[] = [
  "driver",
  "dispatcher",
  "broker",
  "shipper",
  "fleet_manager",
  "finance",
  "company_admin",
];

export type RoleAssignmentCheck =
  | { ok: true }
  | { ok: false; reason: "platform_admin" | "self" | "unknown_role" };

/**
 * May this actor assign `role` to `target`? Client-side mirror of the
 * database rule: never Platform Admin, never your own account (no
 * self-promotion, no accidental self-lockout), never an unknown role.
 */
export function checkRoleAssignment(
  actorId: string,
  targetId: string,
  role: string,
): RoleAssignmentCheck {
  if (role === "platform_admin") return { ok: false, reason: "platform_admin" };
  if (!assignableRoles.includes(role as HerculesRole)) return { ok: false, reason: "unknown_role" };
  if (actorId === targetId) return { ok: false, reason: "self" };
  return { ok: true };
}

export type InviteInput = {
  role: "driver" | "leased" | "dispatcher";
  expiresDays: number;
  maxUses: number;
  email?: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validate an invitation before it is sent to the database. Invitations are
 * single-use by default, expire within 1–30 days, and may be bound to one
 * email address so only that person can redeem them.
 */
export function validateInvite(input: InviteInput): string | null {
  if (!["driver", "leased", "dispatcher"].includes(input.role)) {
    return "Invitations can only offer driver, leased operator, or dispatcher — never owner.";
  }
  if (!Number.isInteger(input.expiresDays) || input.expiresDays < 1 || input.expiresDays > 30) {
    return "Expiry must be a whole number of days between 1 and 30.";
  }
  if (!Number.isInteger(input.maxUses) || input.maxUses < 1 || input.maxUses > 200) {
    return "Uses must be a whole number between 1 and 200.";
  }
  if (input.email && !EMAIL_RE.test(input.email.trim())) {
    return "That email address doesn't look right.";
  }
  return null;
}

/** True when an invite can no longer be redeemed. */
export function inviteIsDead(iv: {
  revoked: boolean;
  expiresAt: string;
  usedCount: number;
  maxUses: number;
}): boolean {
  return iv.revoked || new Date(iv.expiresAt).getTime() <= Date.now() || iv.usedCount >= iv.maxUses;
}
