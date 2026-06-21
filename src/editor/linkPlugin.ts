/**
 * Link Plugin — Click handler for contact block references and block icons.
 *
 * Provides:
 * 1. Detection of contact document clicks — when a user clicks a block ref
 *    that points to a contact, we can show the contact detail in the dock panel.
 * 2. Enhanced block icon menu for contact documents — adds "Edit Contact"
 *    and "View Contact" options when right-clicking a contact document's block icon.
 *
 * SiYuan natively handles `siyuan://blocks/ID` links for navigation.
 * This plugin enhances the experience by detecting contact-related clicks
 * and optionally showing the contact detail in the dock panel.
 */

import type { Plugin } from 'siyuan';
import { contacts, loadAllContacts } from '../stores/contactStore';
import { viewContact } from '../stores/uiStore';
import { get } from 'svelte/store';
import { PLUGIN_NAME } from '../utils/constants';

/**
 * Register click handlers for contact-related navigation.
 * Returns a cleanup function that removes both event listeners.
 */
export function registerClickHandler(plugin: Plugin): () => void {
  const urlHandler = (event: any) => {
    try {
      const { id } = event?.detail ?? {};
      if (!id) return;

      const contactList = get(contacts);
      const isContact = contactList.some((c) => c.id === id);
      if (isContact) {
        viewContact(id);
      }
    } catch (err) {
      console.debug(`[${PLUGIN_NAME}] Error handling block URL:`, err);
    }
  };

  const blockIconHandler = (event: any) => {
    try {
      const { menu, blockElements } = event?.detail ?? {};
      if (!menu || !blockElements || blockElements.length === 0) return;

      const blockElement = blockElements[0];
      const blockId = blockElement?.getAttribute?.('data-node-id') ?? '';
      if (!blockId) return;

      const contactList = get(contacts);
      const isContact = contactList.some((c) => c.id === blockId);
      if (isContact) {
        addContactMenuItems(menu, blockId);
      }
    } catch (err) {
      console.debug(`[${PLUGIN_NAME}] Error handling block icon click:`, err);
    }
  };

  plugin.eventBus.on('open-siyuan-url-block', urlHandler);
  plugin.eventBus.on('click-blockicon', blockIconHandler);

  // Return cleanup function
  return () => {
    plugin.eventBus.off('open-siyuan-url-block', urlHandler);
    plugin.eventBus.off('click-blockicon', blockIconHandler);
  };
}

/**
 * Add "View Contact" menu item to the block icon context menu.
 *
 * The `menu` object is a SiYuan subMenu that supports methods like:
 * - addItem({ label, icon, click })
 * - addSeparator()
 */
function addContactMenuItems(menu: any, blockId: string): void {
  if (!menu || typeof menu.addItem !== 'function') return;

  // Add separator before our items
  if (typeof menu.addSeparator === 'function') {
    menu.addSeparator();
  }

  // "View Contact Details" menu item
  menu.addItem({
    label: '📇 View Contact Details',
    icon: 'iconAccount',
    click: () => {
      viewContact(blockId);
    },
  });

  // "Refresh Contacts" menu item
  menu.addItem({
    label: '🔄 Refresh Contacts',
    icon: 'iconRefresh',
    click: async () => {
      await loadAllContacts();
    },
  });
}
