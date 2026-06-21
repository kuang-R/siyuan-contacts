/**
 * Contact Store — Central state management for contacts.
 *
 * Provides:
 * - Writable stores for contact list, loading state, errors
 * - Derived stores for filtered/sorted contact list and group tags
 * - CRUD actions: loadAll, create, update, delete
 */

import { writable, derived, get } from 'svelte/store';
import type { Contact, ContactFormData } from '../models/contact';
import type { ContactsApi } from '../utils/api';
import { ContactSortMode, ATTR_PREFIX } from '../utils/constants';
import { parseIAL, buildAttrsFromForm, buildUpdateAttrsFromForm } from '../models/attributeKeys';
import { getInitials } from '../utils/avatar';
import { buildListContactsQuery } from '../utils/sql';
import { getContactPath } from '../utils/notebook';
import type { SqlRow } from '../utils/api';

// ==========================================================================
// Writable Stores
// ==========================================================================

/** All loaded contacts */
export const contacts = writable<Contact[]>([]);

/** Whether contacts are currently loading */
export const isLoading = writable<boolean>(false);

/** Error message (null = no error) */
export const error = writable<string | null>(null);

/** Current sort mode */
export const sortMode = writable<ContactSortMode>(ContactSortMode.NAME_ASC);

/** Current search/filter text */
export const searchText = writable<string>('');

/** Selected group filter (empty string = show all) */
export const selectedGroup = writable<string>('');

// ==========================================================================
// Derived Stores
// ==========================================================================

/** All unique group tags across all contacts, sorted alphabetically */
export const allGroups = derived(contacts, ($contacts) => {
  const groupSet = new Set<string>();
  for (const c of $contacts) {
    for (const g of c.groups) {
      groupSet.add(g);
    }
  }
  return Array.from(groupSet).sort((a, b) => a.localeCompare(b, 'zh-CN'));
});

/** Filtered and sorted contact list — reacts to searchText, selectedGroup, sortMode, contacts */
export const filteredContacts = derived(
  [contacts, searchText, selectedGroup, sortMode],
  ([$contacts, $searchText, $selectedGroup, $sortMode]) => {
    let result = [...$contacts];

    // Filter by selected group
    if ($selectedGroup) {
      result = result.filter((c) => c.groups.includes($selectedGroup));
    }

    // Filter by search text (case-insensitive match on name, phone, email, org, notes)
    if ($searchText) {
      const lower = $searchText.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(lower) ||
          c.phone.toLowerCase().includes(lower) ||
          c.email.toLowerCase().includes(lower) ||
          c.org.toLowerCase().includes(lower) ||
          c.notes.toLowerCase().includes(lower)
      );
    }

    // Sort
    switch ($sortMode) {
      case ContactSortMode.NAME_ASC:
        result.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
        break;
      case ContactSortMode.NAME_DESC:
        result.sort((a, b) => b.name.localeCompare(a.name, 'zh-CN'));
        break;
      case ContactSortMode.CREATED_DESC:
        result.sort(
          (a, b) => (b.created || '').localeCompare(a.created || '')
        );
        break;
      case ContactSortMode.UPDATED_DESC:
        result.sort(
          (a, b) => (b.updated || '').localeCompare(a.updated || '')
        );
        break;
    }

    return result;
  }
);

// ==========================================================================
// Internal State
// ==========================================================================

let api: ContactsApi;
let notebookId: string;

// ==========================================================================
// Store Initialization
// ==========================================================================

/**
 * Initialize the store with the API client and notebook ID.
 * Must be called before any CRUD operations.
 */
export function initContactStore(_api: ContactsApi, _notebookId: string): void {
  api = _api;
  notebookId = _notebookId;
}

/**
 * Returns a promise that resolves when the contact store is ready.
 * Can be used to wait for async initialization.
 */
export function contactStoreReady(): boolean {
  return !!(api && notebookId);
}

// ==========================================================================
// CRUD Actions
// ==========================================================================

/**
 * Load all contacts from the contacts notebook via SQL query.
 * Updates the `contacts` store with parsed Contact objects.
 */
export async function loadAllContacts(): Promise<void> {
  if (!api || !notebookId) {
    error.set('Contact store not initialized');
    isLoading.set(false);
    return;
  }

  isLoading.set(true);
  error.set(null);

  try {
    const query = buildListContactsQuery(notebookId);
    const rows = await api.sqlQuery(query);
    const parsed = rows.map(parseContactFromRow).filter((c): c is Contact => c !== null);
    contacts.set(parsed);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    error.set(msg);
    console.error('[siyuan-contacts] Failed to load contacts:', err);
  } finally {
    isLoading.set(false);
  }
}

/**
 * Create a new contact document and set its attributes.
 * Returns the new contact's block ID.
 */
export async function createContact(data: ContactFormData): Promise<string> {
  if (!api || !notebookId) throw new Error('Contact store not initialized');

  const path = getContactPath(data.name);
  const markdown = `# ${escapeMarkdown(data.name)}`;

  // Create the document
  const docId = await api.createDocWithMd(notebookId, path, markdown);

  // Build attributes and set them
  const attrs = buildAttrsFromForm(data);
  await api.setBlockAttrs(docId, attrs);

  // Reload to refresh the list
  await loadAllContacts();
  return docId;
}

/**
 * Update an existing contact's attributes.
 */
export async function updateContact(id: string, data: ContactFormData): Promise<void> {
  if (!api) throw new Error('Contact store not initialized');

  const attrs = buildUpdateAttrsFromForm(data);
  await api.setBlockAttrs(id, attrs);

  // If name changed, update the document title
  const existing = get(contacts).find((c) => c.id === id);
  if (existing && existing.name !== data.name) {
    try {
      const markdown = `# ${escapeMarkdown(data.name)}`;
      await api.updateBlock(id, 'markdown', markdown);
    } catch (err) {
      console.warn('[siyuan-contacts] Failed to update document title:', err);
      // Non-critical — attributes are still updated
    }
  }

  await loadAllContacts();
}

/**
 * Delete a contact document by its block ID.
 */
export async function deleteContact(id: string): Promise<void> {
  if (!api || !notebookId) throw new Error('Contact store not initialized');

  const contact = get(contacts).find((c) => c.id === id);
  if (!contact) throw new Error('Contact not found');

  // Get the actual file path from the database (not hpath from name)
  const rows = await api.sqlQuery(
    `SELECT path FROM blocks WHERE id = '${id.replace(/'/g, "''")}'`
  );
  const filePath = rows[0]?.path || getContactPath(contact.name);

  // Remove file via file tree API
  try {
    await api.removeDoc(notebookId, filePath);
  } catch (err) {
    console.warn('[siyuan-contacts] removeDoc failed (may already be deleted):', err);
  }

  // Remove database block
  try { await api.deleteBlock(id); } catch { /* best-effort */ }

  // Remove locally immediately
  contacts.update(list => list.filter(c => c.id !== id));
}

/**
 * Get all contact names for @mention autocomplete.
 */
export function getContactNames(): string[] {
  return get(contacts).map((c) => c.name);
}

/**
 * Search contacts by name prefix (for autocomplete).
 */
export function searchContactNames(prefix: string): Contact[] {
  const lower = prefix.toLowerCase();
  return get(contacts).filter(
    (c) => c.name.toLowerCase().includes(lower)
  );
}

// ==========================================================================
// Helpers
// ==========================================================================

/**
 * Parse a SQL row into a Contact object.
 * Handles the IAL string to extract custom-contact-* attributes.
 */
function parseContactFromRow(row: SqlRow): Contact | null {
  try {
    const ial = typeof row.ial === 'string' ? row.ial : '';
    if (!ial) return null;

    const attrs = parseIAL(ial);
    const name = attrs['custom-contact-name'] ?? row.name ?? '';

    // Require at minimum a name to consider it a valid contact
    if (!name) return null;

    const groupsStr = attrs['custom-contact-groups'] ?? '';
    const avatar = attrs['custom-contact-avatar'] ?? '';

    return {
      id: row.id ?? '',
      name,
      phone: attrs['custom-contact-phone'] ?? '',
      email: attrs['custom-contact-email'] ?? '',
      birthday: attrs['custom-contact-birthday'] ?? '',
      address: attrs['custom-contact-address'] ?? '',
      org: attrs['custom-contact-org'] ?? '',
      notes: attrs['custom-contact-notes'] ?? '',
      groups: parseGroupsString(groupsStr),
      avatar,
      website: attrs['custom-contact-website'] ?? '',
      wechat: attrs['custom-contact-wechat'] ?? '',
      qq: attrs['custom-contact-qq'] ?? '',
      created: attrs['custom-contact-created'] ?? row.created ?? '',
      updated: attrs['custom-contact-updated'] ?? row.updated ?? '',
      avatarUrl: avatar || '',
      initials: getInitials(name),
    };
  } catch (err) {
    console.warn('[siyuan-contacts] Failed to parse contact row:', err);
    return null;
  }
}

/**
 * Parse a comma-separated groups string into a string array.
 */
function parseGroupsString(str: string): string[] {
  if (!str) return [];
  return str
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Escape special characters in markdown content.
 */
function escapeMarkdown(input: string): string {
  return input
    .replace(/\\/g, '\\\\')
    .replace(/#/g, '\\#')
    .replace(/\|/g, '\\|');
}
