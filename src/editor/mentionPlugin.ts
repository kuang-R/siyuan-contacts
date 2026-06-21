/**
 * Contact Link — Register a slash command per contact.
 * Type "/张" → shows matching contacts → select inserts the link.
 */

import { contacts } from '../stores/contactStore';
import { PLUGIN_NAME } from '../utils/constants';
import { get } from 'svelte/store';

export function registerContactSlash(plugin: any): () => void {
  if (!Array.isArray(plugin.protyleSlash)) return () => {};

  const activeIds: string[] = [];

  function rebuild() {
    for (const id of activeIds) {
      const idx = plugin.protyleSlash.findIndex((i: any) => i.id === id);
      if (idx !== -1) plugin.protyleSlash.splice(idx, 1);
    }
    activeIds.length = 0;

    const list = get(contacts);
    for (const c of list) {
      const name = String(c.name || '').trim();
      if (!name) continue;
      const cmdId = `${PLUGIN_NAME}-link-${c.id}`;

      plugin.protyleSlash.push({
        filter: [name, name.toLowerCase(), ...name.split('').filter((ch: string) => ch.trim())],
        html: `<span style="display:inline-flex;align-items:center;gap:4px;">📇 ${esc(name)}</span>`,
        id: cmdId,
        callback: (protyle: any) => {
          const html = `<span data-type="block-ref" data-id="${c.id}" data-subtype="d">${esc(name)}</span>`;
          try { protyle.insert(html); } catch {}
        },
      });
      activeIds.push(cmdId);
    }
  }

  rebuild();
  const unsub = contacts.subscribe(() => rebuild());

  return () => {
    unsub();
    for (const id of activeIds) {
      const idx = plugin.protyleSlash.findIndex((i: any) => i.id === id);
      if (idx !== -1) plugin.protyleSlash.splice(idx, 1);
    }
  };
}

function esc(s: string): string {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
