/**
 * Canonical building number shared with the backend.
 * Formatting whitespace and case do not create a new building identity.
 * Hyphens/punctuation are preserved because they may be meaningful.
 */
export const normalizeBuildingNumber = (value: unknown): string =>
  String(value ?? '')
    .normalize('NFKC')
    .replace(/[\s\u200B-\u200D\uFEFF]+/gu, '')
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 0x06F0))
    .toUpperCase();
