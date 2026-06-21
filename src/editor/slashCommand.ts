/**
 * Slash Command — /add-contact slash command integration.
 *
 * When the user types "/add-contact" (or its Chinese variants) in the
 * SiYuan editor, this command triggers the contact creation flow.
 *
 * SiYuan's Protyle slash menu shows a filtered list of commands.
 * We push a custom command item that, when selected, opens the
 * add-contact form in the dock panel.
 */

import type { Plugin } from 'siyuan';
import { openAddForm } from '../stores/uiStore';
import { PLUGIN_NAME } from '../utils/constants';
import { L } from '../utils/i18n';

/**
 * SiYuan slash command filter keywords for triggering this command.
 * Users can type any of these after "/" to see the command.
 */
const SLASH_FILTERS = [
  'add-contact',
  'addcontact',
  'add_contact',
  '添加联系人',
  '新建联系人',
  '联系人',
  '联络人',
];

/**
 * Register the /add-contact slash command with SiYuan.
 * Returns a cleanup function that removes the slash command from the array.
 */
export function registerSlashCommand(plugin: Plugin): () => void {
  const slashId = `${PLUGIN_NAME}-add-contact`;
  const slashItem = {
    filter: SLASH_FILTERS,
    html: buildSlashMenuHtml(),
    id: slashId,
    callback: (_protyle: any) => {
      try {
        openAddForm();
      } catch (err) {
        console.error(`[${PLUGIN_NAME}] Failed to open add form:`, err);
      }
    },
  };

  // Register the slash command
  if (Array.isArray(plugin.protyleSlash)) {
    plugin.protyleSlash.push(slashItem);
  } else {
    console.warn(`[${PLUGIN_NAME}] protyleSlash not available; slash command not registered`);
    return () => {}; // No-op cleanup
  }

  // Return cleanup: remove our slash item by id
  return () => {
    if (Array.isArray(plugin.protyleSlash)) {
      const idx = plugin.protyleSlash.findIndex((item: any) => item.id === slashId);
      if (idx !== -1) plugin.protyleSlash.splice(idx, 1);
    }
  };
}

/**
 * Build the HTML for the slash menu item display.
 */
function buildSlashMenuHtml(): string {
  // SVG icon: person with a plus (simplified user-add icon)
  const iconSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <line x1="19" y1="8" x2="19" y2="14"/>
      <line x1="22" y1="11" x2="16" y2="11"/>
    </svg>
  `;

  return `
    <div class="b3-menu__item">
      <span class="b3-menu__icon" style="display:inline-flex;align-items:center;justify-content:center;">
        ${iconSvg}
      </span>
      <span class="b3-menu__label">${escHtml(L('addContactSlashLabel'))}</span>
      <span class="b3-menu__accelerator" style="font-size:11px;color:var(--b3-theme-on-surface-light);margin-left:auto;">
        ${escHtml(L('pluginName'))}
      </span>
    </div>
  `;
}

function escHtml(s: string): string {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
