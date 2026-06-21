/**
 * Attribute key definitions and IAL (Inline Attribute List) parser.
 *
 * SiYuan stores block attributes in IAL format in the `ial` column:
 *   {: custom-contact-name="Zhang San" custom-contact-phone="13800138000"}
 *
 * This module provides:
 * 1. Canonical mapping between Contact fields and SiYuan attribute keys
 * 2. IAL string parser
 * 3. Form data → attribute record builder
 */

import { ATTR_KEYS, type ContactField } from '../utils/constants';
import type { ContactFormData } from './contact';

/** Type for the raw IAL key → value mapping */
export type AttrRecord = Record<string, string>;

/**
 * Parse a SiYuan IAL string into a key-value record.
 *
 * IAL format: {: key1="value1" key2="value2" key3=value3 }
 * Values may be:
 *   - Double-quoted: key="value with spaces"
 *   - Unquoted: key=simple_value
 *
 * @param ial - Raw IAL string from the blocks table
 * @returns Parsed key-value record (empty object on parse failure)
 */
export function parseIAL(ial: string): AttrRecord {
  const result: AttrRecord = {};
  if (!ial || typeof ial !== 'string') return result;

  // Strip the "{: " prefix(es) and "}" suffix
  let inner = ial.trim();
  // Handle nested {: patterns (IAL can appear multiple times)
  while (inner.startsWith('{:')) {
    inner = inner.slice(2).trim();
  }
  // Remove trailing "}"
  const lastBrace = inner.lastIndexOf('}');
  if (lastBrace !== -1) {
    inner = inner.slice(0, lastBrace).trim();
  }

  if (!inner) return result;

  // Match key="value" pairs (values with double quotes, handle escaped quotes)
  const quotedRegex = /(\S+)\s*=\s*"((?:[^"\\]|\\.)*)"/g;
  let match: RegExpExecArray | null;
  while ((match = quotedRegex.exec(inner)) !== null) {
    const key = match[1];
    let value = match[2];
    // Unescape common escapes
    value = value.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    result[key] = value;
  }

  // Remove already-matched quoted pairs before matching unquoted
  const remaining = inner.replace(quotedRegex, '').trim();

  // Match key=value pairs (unquoted values)
  const unquotedRegex = /(\S+)\s*=\s*(\S+)/g;
  while ((match = unquotedRegex.exec(remaining)) !== null) {
    const key = match[1];
    const value = match[2];
    // Only set if not already matched from a quoted pair
    if (!(key in result)) {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Extract a contact attribute from parsed IAL record by contact field.
 */
export function getAttr(attrs: AttrRecord, field: ContactField | 'created' | 'updated'): string {
  const key = ATTR_KEYS[field];
  return attrs[key] ?? '';
}

/**
 * Build a record of SiYuan block attributes from ContactFormData.
 * Used when creating or updating a contact document.
 */
export function buildAttrsFromForm(data: ContactFormData): AttrRecord {
  const now = new Date().toISOString();
  const attrs: AttrRecord = {};

  attrs[ATTR_KEYS.name] = data.name;
  attrs[ATTR_KEYS.phone] = data.phone;
  attrs[ATTR_KEYS.email] = data.email;
  attrs[ATTR_KEYS.birthday] = data.birthday;
  attrs[ATTR_KEYS.address] = data.address;
  attrs[ATTR_KEYS.org] = data.org;
  attrs[ATTR_KEYS.notes] = data.notes;
  attrs[ATTR_KEYS.groups] = data.groups;
  attrs[ATTR_KEYS.avatar] = data.avatar;
  attrs[ATTR_KEYS.website] = data.website;
  attrs[ATTR_KEYS.wechat] = data.wechat;
  attrs[ATTR_KEYS.qq] = data.qq;
  attrs[ATTR_KEYS.created] = now;
  attrs[ATTR_KEYS.updated] = now;

  // Remove empty strings (don't store empty attributes)
  for (const key of Object.keys(attrs)) {
    if (attrs[key] === '') {
      delete attrs[key];
    }
  }

  return attrs;
}

/**
 * Build an update attributes record (without overwriting 'created').
 * Unlike buildAttrsFromForm, this includes ALL fields including empty strings,
 * so that clearing a field in the UI actually clears it in storage.
 * SiYuan's setBlockAttrs merges attributes — omitting a key leaves old value.
 */
export function buildUpdateAttrsFromForm(data: ContactFormData): AttrRecord {
  const now = new Date().toISOString();
  const attrs: AttrRecord = {};

  // Include all fields — even empty strings — so cleared fields are actually removed
  attrs[ATTR_KEYS.name] = data.name;
  attrs[ATTR_KEYS.phone] = data.phone;
  attrs[ATTR_KEYS.email] = data.email;
  attrs[ATTR_KEYS.birthday] = data.birthday;
  attrs[ATTR_KEYS.address] = data.address;
  attrs[ATTR_KEYS.org] = data.org;
  attrs[ATTR_KEYS.notes] = data.notes;
  attrs[ATTR_KEYS.groups] = data.groups;
  attrs[ATTR_KEYS.avatar] = data.avatar;
  attrs[ATTR_KEYS.website] = data.website;
  attrs[ATTR_KEYS.wechat] = data.wechat;
  attrs[ATTR_KEYS.qq] = data.qq;
  attrs[ATTR_KEYS.updated] = now;
  // Note: 'created' is intentionally NOT included — it should never be overwritten

  return attrs;
}

/**
 * Parse a SiYuan SQL row into the contact attribute record.
 *
 * SiYuan's SQL API returns rows where the `ial` column contains the IAL string.
 * This function parses it and returns only our custom-contact-* keys.
 */
export function parseContactAttrs(row: { ial?: string; [key: string]: any }): AttrRecord {
  const attrs = parseIAL(row.ial ?? '');
  // Filter to only our custom-contact-* keys
  const filtered: AttrRecord = {};
  for (const key of Object.keys(attrs)) {
    if (key.startsWith('custom-contact-')) {
      filtered[key] = attrs[key];
    }
  }
  return filtered;
}
