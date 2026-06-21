/**
 * siyuan-contacts — Plugin Entry Point
 */

import { setLang } from './utils/i18n';
import { ContactsApi } from './utils/api';
import { ensureContactsNotebook } from './utils/notebook';
import { initContactStore, loadAllContacts } from './stores/contactStore';
import { openAddForm } from './stores/uiStore';
import { registerMentionHint } from './editor/mentionPlugin';
import { registerSlashCommand } from './editor/slashCommand';
import { registerClickHandler } from './editor/linkPlugin';
import { PLUGIN_NAME } from './utils/constants';
import ContactPanel from './components/ContactPanel.svelte';
import { Plugin } from 'siyuan';

import './index.css';

const PLUGIN_ICON_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
  <circle cx="12" cy="7" r="4"/>
</svg>
`;

export default class ContactsPlugin extends Plugin {
  private api!: ContactsApi;
  private notebookId: string | null = null;
  private dockComponent: any = null;
  // Cleanup callbacks returned by editor modules
  private editorCleanups: Array<() => void> = [];

  async onload(): Promise<void> {
    const lang = window?.siyuan?.config?.lang ?? 'zh_CN';
    setLang(lang);

    this.addIcons(PLUGIN_ICON_SVG);
    this.api = new ContactsApi();

    try {
      this.notebookId = await ensureContactsNotebook(this.api);
    } catch (err) {
      console.error('[siyuan-contacts] Failed to ensure notebook:', err);
      return;
    }

    initContactStore(this.api, this.notebookId);
    this.setupDock();
    this.setupCommands();
    this.setupEditorPlugins();
    loadAllContacts();
  }

  async onunload(): Promise<void> {
    // Run editor cleanup callbacks (remove eventBus listeners, slash commands, etc.)
    for (const cleanup of this.editorCleanups) {
      try { cleanup(); } catch { /* ignore cleanup errors */ }
    }
    this.editorCleanups = [];

    // Destroy dock component
    if (this.dockComponent) {
      this.dockComponent.$destroy();
      this.dockComponent = null;
    }
  }

  private setupDock(): void {
    const plugin = this;

    this.addDock({
      config: {
        position: 'LeftBottom',
        size: { width: 320, height: 420 },
        icon: 'iconAccount',
        title: 'Contacts',
      },
      data: {},
      type: PLUGIN_NAME,
      init(this: any): void {
        if (this.element) {
          this.element.classList.add('siyuan-contacts');
          plugin.dockComponent = new ContactPanel({
            target: this.element,
            props: {
              api: plugin.api,
              notebookId: plugin.notebookId,
            },
          });
        }
      },
      destroy(this: any): void {
        if (plugin.dockComponent) {
          plugin.dockComponent.$destroy();
          plugin.dockComponent = null;
        }
      },
      resize(): void {},
      update(): void {},
    });
  }

  private setupCommands(): void {
    this.addCommand({
      langKey: 'quickAddContact',
      hotkey: 'Ctrl+Shift+A',
      callback: () => {
        openAddForm();
      },
    });
  }

  private setupEditorPlugins(): void {
    const unregMention = registerMentionHint(this);
    if (unregMention) this.editorCleanups.push(unregMention);

    const unregSlash = registerSlashCommand(this);
    if (unregSlash) this.editorCleanups.push(unregSlash);

    const unregClick = registerClickHandler(this);
    if (unregClick) this.editorCleanups.push(unregClick);
  }
}
