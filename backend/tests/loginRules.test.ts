import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { decideLogin } from "../src/domain/loginRules.js";
import { PASSWORD_ROUNDS, hashPassword, verifyPassword } from "../src/domain/password.js";
import { decideRefresh } from "../src/domain/session.js";

describe("login rules", () => {
  it("allows a verified user with the right password", () => {
    assert.deepEqual(
      decideLogin({ userFound: true, passwordMatches: true, emailVerified: true }),
      { ok: true },
    );
  });

  it("sends an unverified user back to verification only after the password matches", () => {
    assert.deepEqual(
      decideLogin({ userFound: true, passwordMatches: true, emailVerified: false }),
      { ok: false, code: "EMAIL_NOT_VERIFIED" },
    );
    assert.deepEqual(
      decideLogin({ userFound: true, passwordMatches: false, emailVerified: false }),
      { ok: false, code: "INVALID_CREDENTIALS" },
    );
  });

  it("does not reveal whether the email exists", () => {
    assert.deepEqual(
      decideLogin({ userFound: false, passwordMatches: false, emailVerified: false }),
      { ok: false, code: "INVALID_CREDENTIALS" },
    );
    assert.deepEqual(
      decideLogin({ userFound: false, passwordMatches: true, emailVerified: true }),
      { ok: false, code: "INVALID_CREDENTIALS" },
    );
  });

  it("stores passwords with bcrypt and never as the original text", async () => {
    assert.equal(PASSWORD_ROUNDS, 12);
    const hash = await hashPassword("secret12", 4);
    assert.notEqual(hash, "secret12");
    assert.match(hash, /^\$2[aby]\$/);
    assert.equal(await verifyPassword("secret12", hash), true);
    assert.equal(await verifyPassword("secret13", hash), false);
  });
});

describe("refresh session rules", () => {
  const now = new Date("2026-09-30T10:00:00.000Z");

  it("accepts a live session and rejects a missing, reused, or expired one", () => {
    assert.equal(decideRefresh(null, now), "missing");
    assert.equal(
      decideRefresh({ revokedAt: null, expiresAt: new Date(now.getTime() + 1000) }, now),
      "ok",
    );
    assert.equal(
      decideRefresh({ revokedAt: now, expiresAt: new Date(now.getTime() + 1000) }, now),
      "reuse",
    );
    assert.equal(
      decideRefresh({ revokedAt: null, expiresAt: now }, now),
      "expired",
    );
  });
});
