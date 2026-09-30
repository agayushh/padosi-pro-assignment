export type RefreshDecision = "ok" | "missing" | "reuse" | "expired";

export function decideRefresh(
  session: { revokedAt: Date | null; expiresAt: Date } | null,
  now: Date,
): RefreshDecision {
  if (!session) return "missing";
  if (session.revokedAt) return "reuse";
  if (session.expiresAt.getTime() <= now.getTime()) return "expired";
  return "ok";
}
