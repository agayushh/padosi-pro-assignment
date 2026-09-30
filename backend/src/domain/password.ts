import bcrypt from "bcrypt";

export const PASSWORD_ROUNDS = 12;

export function hashPassword(
  password: string,
  rounds = PASSWORD_ROUNDS,
): Promise<string> {
  return bcrypt.hash(password, rounds);
}

export function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}

let dummyHash: string | null = null;

export function dummyPasswordHash(): string {
  dummyHash ??= bcrypt.hashSync("not-a-real-user", PASSWORD_ROUNDS);
  return dummyHash;
}
