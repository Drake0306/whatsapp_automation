/**
 * Normalizes a phone number to international format (digits only, with country code).
 * Handles Indian numbers: adds "91" if missing.
 * Strips +, spaces, dashes, and parentheses.
 */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/[^0-9]/g, "");

  // Indian number without country code (10 digits starting with 6-9)
  if (digits.length === 10 && /^[6-9]/.test(digits)) {
    return "91" + digits;
  }

  // Already has country code
  return digits;
}
