/**
 * Avatar utility functions.
 */

import { MAX_AVATAR_SIZE } from './constants';

/**
 * Read a File object as a base64 data URI string.
 * Validates size against MAX_AVATAR_SIZE.
 *
 * @throws If file exceeds size limit
 */
export function fileToDataURI(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.size > MAX_AVATAR_SIZE) {
      reject(
        new Error(
          `Avatar image too large (${(file.size / 1024).toFixed(1)}KB). ` +
          `Maximum size is ${MAX_AVATAR_SIZE / 1024}KB.`
        )
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read avatar file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Get initials from a contact name for avatar fallback display.
 *
 * For CJK characters: returns the first character.
 * For Latin characters: returns first character of first and last name parts.
 *
 * @param name - Full name
 * @param maxChars - Maximum number of characters for initials (default: 2)
 */
export function getInitials(name: string, maxChars: number = 2): string {
  if (!name || !name.trim()) return '?';

  const trimmed = name.trim();

  // Check if name contains CJK characters
  if (/[一-鿿㐀-䶿]/.test(trimmed)) {
    // For CJK: take first 1-2 characters
    const CJKChars = [...trimmed].filter((c) =>
      /[一-鿿㐀-䶿]/.test(c)
    );
    return CJKChars.slice(0, maxChars).join('');
  }

  // For Latin: first letter of first and last word
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/**
 * Validate that a string is a valid data URI.
 */
export function isValidDataURI(uri: string): boolean {
  return uri.startsWith('data:image/');
}
