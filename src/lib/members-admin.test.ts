import { describe, expect, it } from "vitest";
import {
  assignableRoles,
  checkRoleAssignment,
  inviteIsDead,
  validateInvite,
} from "@/lib/members-admin";
import { allowedFor } from "@/lib/access";

describe("role assignment guards", () => {
  it("never allows granting platform_admin", () => {
    expect(checkRoleAssignment("a", "b", "platform_admin")).toEqual({
      ok: false,
      reason: "platform_admin",
    });
  });

  it("never lets an account assign a role to itself", () => {
    expect(checkRoleAssignment("same", "same", "dispatcher")).toEqual({
      ok: false,
      reason: "self",
    });
  });

  it("rejects roles outside the assignable set", () => {
    expect(checkRoleAssignment("a", "b", "superuser")).toEqual({
      ok: false,
      reason: "unknown_role",
    });
  });

  it("allows a minimal role to a different account", () => {
    expect(checkRoleAssignment("a", "b", "driver")).toEqual({ ok: true });
  });

  it("platform_admin is not in the assignable list", () => {
    expect(assignableRoles).not.toContain("platform_admin");
  });
});

describe("invitation validation", () => {
  it("accepts a single-use email-bound driver invite", () => {
    expect(
      validateInvite({ role: "driver", expiresDays: 7, maxUses: 1, email: "jax@example.com" }),
    ).toBeNull();
  });

  it("refuses owner as an invite role", () => {
    expect(validateInvite({ role: "owner" as never, expiresDays: 7, maxUses: 1 })).toMatch(
      /never owner/i,
    );
  });

  it("refuses bad expiry and use counts", () => {
    expect(validateInvite({ role: "driver", expiresDays: 0, maxUses: 1 })).toMatch(/expiry/i);
    expect(validateInvite({ role: "driver", expiresDays: 31, maxUses: 1 })).toMatch(/expiry/i);
    expect(validateInvite({ role: "driver", expiresDays: 7, maxUses: 0 })).toMatch(/uses/i);
    expect(validateInvite({ role: "driver", expiresDays: 7, maxUses: 1.5 })).toMatch(/uses/i);
  });

  it("refuses a malformed bound email", () => {
    expect(
      validateInvite({ role: "leased", expiresDays: 7, maxUses: 1, email: "not-an-email" }),
    ).toMatch(/email/i);
  });

  it("marks revoked, expired and used-up invites as dead", () => {
    const future = new Date(Date.now() + 86_400_000).toISOString();
    const past = new Date(Date.now() - 86_400_000).toISOString();
    expect(inviteIsDead({ revoked: true, expiresAt: future, usedCount: 0, maxUses: 1 })).toBe(true);
    expect(inviteIsDead({ revoked: false, expiresAt: past, usedCount: 0, maxUses: 1 })).toBe(true);
    expect(inviteIsDead({ revoked: false, expiresAt: future, usedCount: 1, maxUses: 1 })).toBe(true);
    expect(inviteIsDead({ revoked: false, expiresAt: future, usedCount: 0, maxUses: 1 })).toBe(false);
  });
});

describe("members page access", () => {
  it("is open to company and platform admins only", () => {
    expect(allowedFor("/members", "company_admin")).toBe(true);
    expect(allowedFor("/members", "platform_admin")).toBe(true);
    expect(allowedFor("/members", "driver")).toBe(false);
    expect(allowedFor("/members", "dispatcher")).toBe(false);
    expect(allowedFor("/members", "broker")).toBe(false);
    expect(allowedFor("/members", null)).toBe(false);
  });
});
