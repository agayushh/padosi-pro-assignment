export function normalizeIndianMobile(input: string): string | null {
  const compact = input.replace(/[\s-]/g, "");
  let national = compact;
  if (national.startsWith("+91")) national = national.slice(3);
  else if (national.startsWith("0091") && national.length === 14) national = national.slice(4);
  else if (national.startsWith("91") && national.length === 12) national = national.slice(2);
  else if (national.startsWith("0") && national.length === 11) national = national.slice(1);

  if (!/^[6-9]\d{9}$/.test(national)) return null;
  return `+91${national}`;
}
