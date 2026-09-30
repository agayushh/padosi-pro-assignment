export type LoginDecision =
  | { ok: true }
  | { ok: false; code: "INVALID_CREDENTIALS" | "EMAIL_NOT_VERIFIED" };

// A wrong password stays a generic failure, including for unverified accounts.
// Verification state is only returned after the password matches.
export function decideLogin(input: {
  userFound: boolean;
  passwordMatches: boolean;
  emailVerified: boolean;
}): LoginDecision {
  if (!input.userFound || !input.passwordMatches) {
    return { ok: false, code: "INVALID_CREDENTIALS" };
  }
  if (!input.emailVerified) {
    return { ok: false, code: "EMAIL_NOT_VERIFIED" };
  }
  return { ok: true };
}
