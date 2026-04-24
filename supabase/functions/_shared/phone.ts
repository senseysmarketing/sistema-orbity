/**
 * Shared phone utilities for Brazilian numbers.
 * Handles the "9th digit" problem and country code variations.
 *
 * Used by WhatsApp edges to ensure elastic search across phone variants.
 */

/**
 * Generates all possible variants of a phone number to handle:
 * - With/without country code (55)
 * - With/without 9th digit (Brazilian mobile)
 *
 * Example input: "5511988887777"
 * Output: ["5511988887777", "551188887777", "11988887777", "1188887777"]
 *
 * @param phone - Raw phone (any format, will be cleaned)
 * @returns Array of unique digit-only variants
 */
export function phoneVariants(phone: string): string[] {
  if (!phone) return [];

  const digits = phone.replace(/\D/g, '');
  if (!digits) return [];

  const variants = new Set<string>();
  variants.add(digits);

  // Brazilian with country code
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
    const ddd = digits.substring(2, 4);
    const local = digits.substring(4);

    if (digits.length === 13 && local.startsWith('9')) {
      // Has 9th digit -> add variant without it
      const without9 = `55${ddd}${local.substring(1)}`;
      variants.add(without9);
      variants.add(`${ddd}${local.substring(1)}`); // no country code, no 9
      variants.add(`${ddd}${local}`); // no country code, with 9
    } else if (digits.length === 12) {
      // Missing 9th digit -> add variant with it
      const with9 = `55${ddd}9${local}`;
      variants.add(with9);
      variants.add(`${ddd}9${local}`); // no country code, with 9
      variants.add(`${ddd}${local}`); // no country code, no 9
    }
  }

  // Without country code (10 or 11 digits) - add variants with country code
  if (!digits.startsWith('55') && (digits.length === 10 || digits.length === 11)) {
    const ddd = digits.substring(0, 2);
    const local = digits.substring(2);

    variants.add(`55${digits}`);

    if (digits.length === 11 && local.startsWith('9')) {
      variants.add(`55${ddd}${local.substring(1)}`);
      variants.add(`${ddd}${local.substring(1)}`);
    } else if (digits.length === 10) {
      variants.add(`55${ddd}9${local}`);
      variants.add(`${ddd}9${local}`);
    }
  }

  return Array.from(variants);
}
