/**
 * Mention Plugin — @contact autocomplete in the SiYuan editor.
 *
 * When the user types "@" followed by text, this plugin searches the
 * contacts list and presents a dropdown of matching contacts.
 * Selecting a contact inserts a SiYuan block reference link:
 *   [Contact Name](siyuan://blocks/CONTACT_BLOCK_ID)
 *
 * This leverages SiYuan's built-in hint.extend system (if available)
 * or falls back to custom DOM event handling on Protyle instances.
 */

import type { Plugin } from 'siyuan';
import { searchContactNames } from '../stores/contactStore';
import { PLUGIN_NAME } from '../utils/constants';
import type { Contact } from '../models/contact';

/**
 * Register the @mention hint on all current and future Protyle instances.
 * Returns a cleanup function that removes the event listener.
 */
export function registerMentionHint(plugin: Plugin): () => void {
  const handler = (event: any) => {
    const protyle = event?.detail?.protyle;
    if (!protyle) return;

    try {
      injectMentionHint(protyle);
    } catch (err) {
      console.warn(`[${PLUGIN_NAME}] Failed to inject mention hint:`, err);
    }
  };

  plugin.eventBus.on('loaded-protyle-dynamic', handler);

  // Return cleanup function
  return () => {
    plugin.eventBus.off('loaded-protyle-dynamic', handler);
  };
}

/**
 * Inject the @ hint extension into a Protyle instance.
 *
 * SiYuan Protyle options may expose 'hint.extend' as an array
 * of { key, hint } objects. If available, we push our configuration.
 */
function injectMentionHint(protyle: any): void {
  // Check if the hint extension API is available on this Protyle
  if (!protyle.hint || !Array.isArray(protyle.hint.extend)) {
    console.debug(`[${PLUGIN_NAME}] hint.extend not available on this Protyle instance`);
    return;
  }

  // Avoid duplicate registration
  const existing = protyle.hint.extend.find((e: any) => e.key === '@');
  if (existing) return;

  protyle.hint.extend.push({
    key: '@',
    hint: async (_protyle: any, text: string) => {
      // text is the word fragment after "@" (what the user is typing)
      if (!text || text.trim().length === 0) {
        // Show all contacts when no filter text
        const all = searchContactNames('');
        return all.slice(0, 10).map((c) => buildHintItem(c));
      }

      const contacts = searchContactNames(text);
      if (contacts.length === 0) {
        return [];
      }

      return contacts.slice(0, 10).map((c) => buildHintItem(c));
    },
  });
}

/**
 * Build a hint result item for the SiYuan autocomplete dropdown.
 *
 * Returns an object expected by SiYuan's hint system:
 * - html: the rendered HTML for the dropdown item
 * - text: the text to insert when selected (SiYuan block ref link)
 */
function buildHintItem(contact: Contact): {
  html: string;
  text: string;
} {
  const name = escapeHtml(contact.name);
  const phone = contact.phone ? escapeHtml(contact.phone.split(',')[0].trim()) : '';
  const org = contact.org ? escapeHtml(contact.org) : '';

  const subtitle = [phone, org].filter(Boolean).join(' · ');
  const initials = contact.initials || name.charAt(0);

  const html = `
    <div class="contact-mention-item" style="display:flex;align-items:center;gap:8px;padding:4px 8px;">
      <span style="
        display:inline-flex;align-items:center;justify-content:center;
        width:28px;height:28px;border-radius:50%;
        background:var(--b3-theme-primary,#3575f0);color:#fff;
        font-size:12px;font-weight:600;flex-shrink:0;
      ">${initials}</span>
      <span style="display:flex;flex-direction:column;min-width:0;">
        <span style="font-size:13px;font-weight:500;line-height:1.4;">${name}</span>
        ${
          subtitle
            ? `<span style="font-size:11px;color:var(--b3-theme-on-surface,#999);line-height:1.4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${subtitle}</span>`
            : ''
        }
      </span>
    </div>
  `;

  // Insert as SiYuan block reference link — clicking it navigates to the contact
  const text = `[${contact.name}](siyuan://blocks/${contact.id})`;

  return { html, text };
}

/**
 * Escape HTML special characters to prevent XSS.
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
