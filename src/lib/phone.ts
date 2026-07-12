/** Normalize Uzbek phone to +998XXXXXXXXX */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 9) return `+998${digits}`;
  if (digits.startsWith("998") && digits.length === 12) return `+${digits}`;
  return phone.trim();
}
