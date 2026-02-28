/**
 * Format phone input to international format: +<digits>
 * Auto-prepends +, strips non-digits (except leading +), limits to 15 digits.
 */
export function formatPhoneInput(value: string): string {
  // Strip everything except digits and leading +
  let digits = value.replace(/[^\d+]/g, "");

  // Ensure starts with +
  if (digits.length > 0 && !digits.startsWith("+")) {
    digits = "+" + digits;
  }

  // Remove any + that isn't at position 0
  digits = digits[0] + digits.slice(1).replace(/\+/g, "");

  // Limit to + plus 15 digits (ITU E.164 max)
  const numberPart = digits.slice(1).slice(0, 15);
  return digits.length > 0 ? "+" + numberPart : "";
}

/**
 * Validate phone is in international format: + followed by 7–15 digits.
 */
export function isValidPhone(value: string): boolean {
  if (!value || value.length === 0) return false;
  const cleaned = value.replace(/\s+/g, "");
  return /^\+\d{7,15}$/.test(cleaned);
}
