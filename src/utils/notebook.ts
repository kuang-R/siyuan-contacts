/**
 * Notebook management utilities.
 * Ensures the dedicated contacts notebook exists.
 */

import type { ContactsApi } from './api';
import { CONTACTS_NOTEBOOK_NAME, CONTACTS_NOTEBOOK_NAME_EN, PLUGIN_NAME } from './constants';

/**
 * Load or create the contacts notebook.
 *
 * Tries Chinese name first, then English, respecting the user's system language.
 * If neither exists, creates a new notebook with the Chinese name as default.
 *
 * @returns The notebook ID (box ID)
 * @throws If notebook cannot be found or created
 */
export async function ensureContactsNotebook(api: ContactsApi): Promise<string> {
  // List all notebooks to detect closed ones or duplicates
  const allNotebooks = await api.listNotebooks();

  // Find all notebooks with our target names (including closed ones)
  const candidates = allNotebooks.filter(
    n => n.name === CONTACTS_NOTEBOOK_NAME || n.name === CONTACTS_NOTEBOOK_NAME_EN
  );

  // Reopen any closed candidates (e.g. accidentally closed by a previous version)
  for (const nb of candidates) {
    if (nb.closed) {
      console.log(`[${PLUGIN_NAME}] Reopening closed notebook: "${nb.name}"`);
      await api.openNotebook(nb.id);
    }
  }

  // Prefer Chinese name, then English, then first candidate
  let notebook = candidates.find(n => n.name === CONTACTS_NOTEBOOK_NAME)
    ?? candidates.find(n => n.name === CONTACTS_NOTEBOOK_NAME_EN)
    ?? candidates[0];

  if (notebook) {
    console.log(`[${PLUGIN_NAME}] Using notebook: "${notebook.name}" (${notebook.id})`);
    return notebook.id;
  }

  // Create new notebook
  console.log(`[${PLUGIN_NAME}] Creating new notebook: "${CONTACTS_NOTEBOOK_NAME}"`);
  notebook = await api.createNotebook(CONTACTS_NOTEBOOK_NAME);
  console.log(`[${PLUGIN_NAME}] Created notebook: "${notebook.name}" (${notebook.id})`);
  return notebook.id;
}

/**
 * Get the document path for a contact.
 * By default, contacts are stored at the root of the notebook.
 * Users can optionally organize into folders.
 */
export function getContactPath(name: string, parentPath: string = '/'): string {
  const safeName = name.replace(/[/\\:*?"<>|]/g, '_').trim();
  if (!safeName) {
    throw new Error('Contact name cannot be empty');
  }
  if (parentPath.endsWith('/')) {
    return `${parentPath}${safeName}`;
  }
  return `${parentPath}/${safeName}`;
}
