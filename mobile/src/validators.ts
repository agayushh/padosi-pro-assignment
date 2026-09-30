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

export function emailError(value: string): string | null {
  const email = value.trim();
  if (!email) return "Email is required.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Enter a valid email address.";
  return null;
}

export function passwordError(value: string): string | null {
  if (value.length < 8) return "Password must be at least 8 characters.";
  if (value.length > 72) return "Password must be at most 72 characters.";
  if (!/[A-Za-z]/.test(value)) return "Password must include a letter.";
  if (!/\d/.test(value)) return "Password must include a number.";
  return null;
}

export function confirmPasswordError(password: string, confirm: string): string | null {
  if (!confirm) return "Confirm your password.";
  if (password !== confirm) return "Passwords do not match.";
  return null;
}

export function nameError(value: string): string | null {
  const name = value.trim();
  if (name.length < 2 || !/\p{L}/u.test(name)) return "Enter your full name.";
  if (name.length > 80) return "Name is too long.";
  return null;
}

export function mobileError(value: string): string | null {
  if (!value.trim()) return "Mobile number is required.";
  if (!normalizeIndianMobile(value)) return "Enter a 10-digit Indian mobile number.";
  return null;
}

export function addressError(value: string): string | null {
  const address = value.trim();
  if (address.length < 5) return "Enter your address so we know where to send help.";
  if (address.length > 300) return "Address is too long.";
  return null;
}

export function businessNameError(value: string): string | null {
  const name = value.trim();
  if (!name) return null;
  if (name.length < 2) return "Business name must be at least 2 characters.";
  if (name.length > 120) return "Business name is too long.";
  return null;
}
