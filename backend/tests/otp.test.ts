import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  OTP_MAX_ATTEMPTS,
  OTP_RESEND_COOLDOWN_MS,
  OTP_TTL_MS,
  assessOtpAttempt,
  describeCooldown,
  describeOtpFailure,
  generateOtpCode,
  hashOtp,
  otpExpiresAt,
  otpMatches,
  resendCooldownRemaining,
} from "../src/domain/otp.js";

const pepper = "test-pepper-value";
const issuedAt = new Date("2026-09-30T10:00:00.000Z");

function openRecord(overrides: Partial<{ expiresAt: Date; attempts: number; usedAt: Date | null }> = {}) {
  return {
    expiresAt: otpExpiresAt(issuedAt),
    attempts: 0,
    usedAt: null,
    ...overrides,
  };
}

describe("OTP generation and storage", () => {
  it("uses a 6-digit code, a 10 minute lifetime, 5 attempts, and a 30 second resend cooldown", () => {
    assert.equal(OTP_TTL_MS, 10 * 60 * 1000);
    assert.equal(OTP_MAX_ATTEMPTS, 5);
    assert.equal(OTP_RESEND_COOLDOWN_MS, 30 * 1000);
  });

  it("pads the code to 6 digits", () => {
    assert.equal(generateOtpCode(() => 0), "000000");
    assert.equal(generateOtpCode(() => 42), "000042");
    assert.equal(generateOtpCode(() => 999999), "999999");
  });

  it("stores a hash, not the code", () => {
    const hash = hashOtp("123456", pepper);
    assert.notEqual(hash, "123456");
    assert.equal(hashOtp("123456", pepper), hash);
    assert.equal(otpMatches("123456", hash, pepper), true);
    assert.equal(otpMatches("123457", hash, pepper), false);
    assert.equal(otpMatches("123456", hash, "another-pepper-value"), false);
    assert.equal(otpMatches("123456", "not-a-hash", pepper), false);
  });
});

describe("OTP expiry, use, and attempts", () => {
  it("accepts the matching code before the expiry instant and rejects it at expiry", () => {
    const record = openRecord();
    const justBefore = new Date(record.expiresAt.getTime() - 1);
    assert.deepEqual(assessOtpAttempt(record, justBefore, true), { ok: true });
    assert.deepEqual(assessOtpAttempt(record, record.expiresAt, true), {
      ok: false,
      code: "OTP_EXPIRED",
      attempts: 0,
    });
  });

  it("rejects a used code even when the code still matches", () => {
    const record = openRecord({ usedAt: issuedAt });
    assert.deepEqual(assessOtpAttempt(record, issuedAt, true), {
      ok: false,
      code: "OTP_USED",
      attempts: 0,
    });
  });

  it("counts wrong attempts and locks on the fifth", () => {
    let attempts = 0;
    for (let tryNumber = 1; tryNumber <= 4; tryNumber += 1) {
      const result = assessOtpAttempt(openRecord({ attempts }), issuedAt, false);
      assert.equal(result.ok, false);
      if (!result.ok) {
        assert.equal(result.code, "OTP_INVALID");
        assert.equal(result.attempts, tryNumber);
        attempts = result.attempts;
      }
    }

    const locked = assessOtpAttempt(openRecord({ attempts }), issuedAt, false);
    assert.deepEqual(locked, { ok: false, code: "OTP_LOCKED", attempts: 5 });

    const stillLocked = assessOtpAttempt(openRecord({ attempts: 5 }), issuedAt, true);
    assert.deepEqual(stillLocked, { ok: false, code: "OTP_LOCKED", attempts: 5 });
  });

  it("still accepts the right code on the last allowed attempt", () => {
    assert.deepEqual(assessOtpAttempt(openRecord({ attempts: 4 }), issuedAt, true), { ok: true });
  });

  it("prefers used and expired over a wrong-code count", () => {
    const expired = openRecord({
      expiresAt: issuedAt,
      attempts: 1,
    });
    assert.equal(assessOtpAttempt(expired, issuedAt, false).ok, false);
    assert.equal(
      assessOtpAttempt(expired, issuedAt, false).ok === false &&
        (assessOtpAttempt(expired, issuedAt, false) as { code: string }).code,
      "OTP_EXPIRED",
    );
  });

  it("describes wrong, expired, used, and locked codes", () => {
    assert.deepEqual(describeOtpFailure("OTP_INVALID", 1), {
      message: "That code is not right. 4 attempts left.",
      attemptsRemaining: 4,
    });
    assert.deepEqual(describeOtpFailure("OTP_INVALID", 4), {
      message: "That code is not right. 1 attempt left.",
      attemptsRemaining: 1,
    });
    assert.equal(
      describeOtpFailure("OTP_EXPIRED", 0).message,
      "This code has expired. Request a new one.",
    );
    assert.equal(
      describeOtpFailure("OTP_USED", 0).message,
      "This code has already been used. Request a new one.",
    );
    assert.equal(
      describeOtpFailure("OTP_LOCKED", 5).message,
      "Too many wrong attempts. Request a new code.",
    );
  });
});

describe("resend cooldown", () => {
  it("waits 30 seconds from the last send", () => {
    assert.equal(resendCooldownRemaining(issuedAt, issuedAt), 30_000);
    assert.equal(
      resendCooldownRemaining(issuedAt, new Date(issuedAt.getTime() + 29_000)),
      1_000,
    );
    assert.equal(resendCooldownRemaining(issuedAt, new Date(issuedAt.getTime() + 30_000)), 0);
    assert.equal(describeCooldown(21_000), "Please wait 21 seconds before requesting another code.");
    assert.equal(describeCooldown(1_000), "Please wait 1 second before requesting another code.");
  });
});
