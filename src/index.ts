/**
 * siyuan-contacts — Plugin Entry Point
 *
 * Uses direct DOM injection for a floating button + slide-out panel.
 * Bypasses SiYuan dock/tab APIs which vary across frontend modes.
 */

import { setLang, L } from './utils/i18n';
import { ContactsApi } from './utils/api';
import { ensureContactsNotebook } from './utils/notebook';
import { initContactStore, loadAllContacts, contacts } from './stores/contactStore';
import { get } from 'svelte/store';
import { openAddForm } from './stores/uiStore';
import { registerContactSlash } from './editor/mentionPlugin';
import { registerSlashCommand } from './editor/slashCommand';
import { registerClickHandler } from './editor/linkPlugin';
import { PLUGIN_NAME } from './utils/constants';
import ContactPanel from './components/ContactPanel.svelte';

// SiYuan provides Plugin via require('siyuan').Plugin in the eval context.
// require() is available because SiYuan wraps plugins in:
//   new Function('module', 'exports', 'require', code)
declare const require: ((id: string) => any) | undefined;
const _siyuanModule = typeof require !== 'undefined' ? require('siyuan') : (window as any)?.siyuan;
const Plugin = _siyuanModule?.Plugin || (window as any)?.Plugin;
if (!Plugin) {
  throw new Error('[siyuan-contacts] Cannot find Plugin base class. '
    + 'Ensure the plugin runs inside SiYuan Note.');
}

import './index.css';

export default class ContactsPlugin extends Plugin {
  private api!: ContactsApi;
  private notebookId: string | null = null;
  private panelComponent: any = null;
  private fabBtn: HTMLElement | null = null;
  private backdropEl: HTMLElement | null = null;
  private panelEl: HTMLElement | null = null;
  private editorCleanups: Array<() => void> = [];

  async onload(): Promise<void> {
    const lang = window?.siyuan?.config?.lang ?? 'zh_CN';
    setLang(lang);

    this.api = new ContactsApi();
    try {
      this.notebookId = await ensureContactsNotebook(this.api);
    } catch (err) {
      console.error('[siyuan-contacts] Failed to ensure notebook:', err);
      return;
    }
    initContactStore(this.api, this.notebookId);

    this.injectUI();
    this.setupCommands();
    this.setupEditorPlugins();
    loadAllContacts().then(() => this.ensureContactsReadonly());
  }

  async onunload(): Promise<void> {
    for (const cleanup of this.editorCleanups) {
      try { cleanup(); } catch { /* ignore */ }
    }
    this.editorCleanups = [];

    if (this.panelComponent) { this.panelComponent.$destroy(); this.panelComponent = null; }
    if (this.fabBtn) { this.fabBtn.remove(); this.fabBtn = null; }
    if (this.backdropEl) { this.backdropEl.remove(); this.backdropEl = null; }
    if (this.panelEl) { this.panelEl.remove(); this.panelEl = null; }
  }

  // ========================================================================
  // UI: Floating button + backdrop + slide-out panel
  // ========================================================================

  private get showFabSetting(): boolean {
    try {
      const stored = localStorage.getItem('siyuan-contacts-showFab');
      if (stored === 'false') return false;
    } catch { /* ignore */ }
    return false; // default: hidden
  }

  private set showFabSetting(v: boolean) {
    try {
      localStorage.setItem('siyuan-contacts-showFab', String(v));
    } catch { /* ignore */ }
  }

  private injectUI(): void {
    this.createBackdrop();
    this.createPanel();
    if (this.showFabSetting) {
      this.createFAB();
    }
  }

  private createBackdrop(): void {
    const topBarH = this.getTopBarHeight();
    const el = document.createElement('div');
    el.id = `${PLUGIN_NAME}-backdrop`;
    el.style.cssText = `
      position: fixed; top: ${topBarH}px; right: 0; bottom: 0; left: 0; z-index: 10000;
      background: rgba(0,0,0,.3); opacity: 0; pointer-events: none;
      transition: opacity 0.3s;
    `;
    el.addEventListener('click', () => this.closePanel());
    document.body.appendChild(el);
    this.backdropEl = el;
  }

  private createPanel(): void {
    const topBarH = this.getTopBarHeight();
    const el = document.createElement('div');
    el.id = `${PLUGIN_NAME}-panel`;
    el.classList.add('siyuan-contacts');
    el.style.cssText = `
      position: fixed; top: ${topBarH}px; right: 0; bottom: 0; z-index: 10001;
      width: 360px; max-width: 90vw;
      background: var(--b3-theme-background, #fff);
      box-shadow: -4px 0 24px rgba(0,0,0,.15);
      transform: translateX(100%); transition: transform 0.3s ease;
      display: flex; flex-direction: column;
    `;
    document.body.appendChild(el);
    this.panelEl = el;

    this.panelComponent = new ContactPanel({
      target: el,
      props: {
        api: this.api,
        notebookId: this.notebookId,
        showFab: this.showFabSetting,
        onToggleFab: () => this.toggleFab(),
        onOpenDoc: (blockId: string, docId: string, editMode?: boolean) => {
          this.closePanel();
          try {
            if (_siyuanModule?.openTab) {
              _siyuanModule.openTab({ doc: { id: docId } });
              if (blockId) {
                const attempts = [300, 800, 1500];
                for (const delay of attempts) {
                  setTimeout(() => {
                    const layout = document.querySelector('.layout__wnd--active');
                    const root = layout || document;
                    const el = root.querySelector(`[data-node-id="${blockId}"]`);
                    if (el) {
                      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      // Enter edit mode: double-click the block to activate Protyle editor
                      if (editMode) {
                        setTimeout(() => {
                          el.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true }));
                        }, 100);
                      }
                    }
                  }, delay);
                }
              }
            }
          } catch { /* ignore */ }
        },
      },
    });
  }

  private createFAB(): void {
    const fab = document.createElement('div');
    fab.id = `${PLUGIN_NAME}-fab`;
    fab.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
           stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
           style="width:24px;height:24px;pointer-events:none;">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
      </svg>
    `;
    fab.style.cssText = `
      position: fixed; bottom: 80px; right: 24px; z-index: 9999;
      width: 48px; height: 48px; border-radius: 50%;
      background: var(--b3-theme-primary, #3575f0); color: white;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; box-shadow: 0 2px 12px rgba(0,0,0,.3);
      transition: transform 0.2s, opacity 0.2s;
      border: none; outline: none;
    `;
    fab.title = L('pluginName');
    fab.addEventListener('click', () => this.togglePanel());
    document.body.appendChild(fab);
    this.fabBtn = fab;
  }

  // ========================================================================
  // Panel open/close
  // ========================================================================

  private togglePanel(): void {
    if (this.isPanelOpen()) {
      this.closePanel();
    } else {
      this.openPanel();
    }
  }

  private removeFAB(): void {
    if (this.fabBtn) { this.fabBtn.remove(); this.fabBtn = null; }
  }

  private openPanel(): void {
    if (!this.panelEl || !this.backdropEl) return;
    // Re-read top bar height (DOM may not have been ready during onload)
    const topBarH = this.getTopBarHeight();
    this.panelEl.style.top = `${topBarH}px`;
    this.backdropEl.style.top = `${topBarH}px`;
    this.panelEl.style.transform = 'translateX(0)';
    this.backdropEl.style.opacity = '1';
    this.backdropEl.style.pointerEvents = 'auto';
    if (this.fabBtn) this.fabBtn.style.opacity = '0.3';
    // Auto-refresh contacts on every open
    loadAllContacts();
    // Trigger backlink reload if viewing a contact detail
    if (this.panelComponent) {
      this.panelComponent.$set({ panelOpenAt: Date.now() });
    }
  }

  private closePanel(): void {
    if (!this.panelEl || !this.backdropEl) return;
    this.panelEl.style.transform = 'translateX(100%)';
    this.backdropEl.style.opacity = '0';
    this.backdropEl.style.pointerEvents = 'none';
    if (this.fabBtn) this.fabBtn.style.opacity = '1';
  }

  private isPanelOpen(): boolean {
    return this.panelEl?.style.transform === 'translateX(0px)';
  }

  /** Read the actual SiYuan top bar bottom edge so panel aligns flush below it */
  /** Ensure all contacts have custom-sy-readonly (may be lost on manual delete/restore) */
  private async ensureContactsReadonly(): Promise<void> {
    try {
      if (!this.notebookId) return;
      // Query all contact blocks missing custom-sy-readonly in one shot
      const rows = await this.api.sqlQuery(
        `SELECT id FROM blocks WHERE box = '${this.notebookId.replace(/'/g, "''")}'`
        + ` AND type = 'd' AND ial LIKE '%custom-contact-name%'`
        + ` AND ial NOT LIKE '%custom-sy-readonly%'`
      );
      for (const row of rows) {
        await this.api.setBlockAttrs(row.id, { 'custom-sy-readonly': 'true' });
      }
    } catch { /* best-effort */ }
  }

  private getTopBarHeight(): number {
    // Try known SiYuan toolbar selectors, use the bottom edge as offset
    const el = document.getElementById('toolbar')
      || document.getElementById('barTop')
      || document.querySelector('.toolbar');
    if (el) {
      const rect = el.getBoundingClientRect();
      // bottom = distance from viewport top to toolbar bottom edge
      if (rect.bottom > 0) return rect.bottom;
    }
    return 45; // fallback
  }

  // ========================================================================
  // FAB toggle
  // ========================================================================

  private toggleFab(): void {
    const next = !this.showFabSetting;
    this.showFabSetting = next;
    if (next) {
      if (!this.fabBtn) this.createFAB();
    } else {
      this.removeFAB();
    }
    // Sync the Svelte component's showFab prop
    if (this.panelComponent) {
      this.panelComponent.$set({ showFab: next });
    }
  }

  // ========================================================================
  // Commands & editors
  // ========================================================================

  private setupCommands(): void {
    // Top bar button — opens the contacts panel
    this.addTopBar?.({
      icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
      title: L('pluginName'),
      callback: () => this.togglePanel(),
    });

    // Hotkey command — quick add contact
    this.addCommand({
      langKey: 'quickAddContact',
      hotkey: 'Ctrl+Shift+A',
      callback: () => {
        this.openPanel();
        openAddForm();
      },
    });
  }

  private setupEditorPlugins(): void {
    const unregContact = registerContactSlash(this);
    if (unregContact) this.editorCleanups.push(unregContact);
    const unregSlash = registerSlashCommand(this, () => this.openPanel());
    if (unregSlash) this.editorCleanups.push(unregSlash);
    const unregClick = registerClickHandler(this, () => this.openPanel());
    if (unregClick) this.editorCleanups.push(unregClick);
  }
}
