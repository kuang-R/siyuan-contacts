/**
 * ContactsApi — Wrapper around SiYuan kernel HTTP API.
 *
 * All contact operations go through this class, which uses the
 * @siyuan-community/siyuan-sdk Client for HTTP communication.
 */

import { Client } from '@siyuan-community/siyuan-sdk';
import type { AttrRecord } from '../models/attributeKeys';

export interface NotebookInfo {
  id: string;
  name: string;
  icon: string;
  sort: number;
  closed: boolean;
}

export interface DocInfo {
  id: string;
  title: string;
  path: string;
  hPath: string;
  icon: string;
  sort: number;
  count: number;
  subFileCount: number;
}

export interface SearchResult {
  blockID: string;
  rootID: string;
  path: string;
  box: string;
  hPath: string;
  content: string;
  type: string;
}

export interface SqlRow {
  [key: string]: any;
}

export class ContactsApi {
  private client: Client;

  constructor() {
    this.client = new Client();
  }

  // ==========================================================================
  // Notebook Operations
  // ==========================================================================

  /**
   * List all notebooks.
   */
  async listNotebooks(): Promise<NotebookInfo[]> {
    const res = await this.client.lsNotebooks();
    return (res?.data?.notebooks ?? []) as NotebookInfo[];
  }

  /**
   * Find a notebook by name (case-insensitive match).
   * Returns the first match or null.
   */
  async findNotebookByName(name: string): Promise<NotebookInfo | null> {
    const notebooks = await this.listNotebooks();
    const lower = name.toLowerCase();
    return notebooks.find((nb) => nb.name.toLowerCase() === lower) ?? null;
  }

  /**
   * Create a new notebook.
   * Returns the created notebook info.
   */
  async createNotebook(name: string): Promise<NotebookInfo> {
    const res = await this.client.createNotebook({ name });
    if (res?.code !== 0) {
      throw new Error(`Failed to create notebook: ${res?.msg ?? 'unknown error'}`);
    }
    // The API returns the notebook ID. Fetch full info.
    const notebooks = await this.listNotebooks();
    const notebook = notebooks.find((nb) => nb.name === name);
    if (!notebook) {
      throw new Error('Notebook created but not found in list');
    }
    return notebook;
  }

  /**
   * Open/reopen a notebook (show in document tree).
   */
  async openNotebook(notebookId: string): Promise<void> {
    const res = await this.client.openNotebook({ notebook: notebookId });
    if (res?.code !== 0) {
      throw new Error(`Failed to open notebook: ${res?.msg ?? 'unknown error'}`);
    }
  }

  // ==========================================================================
  // Document Operations
  // ==========================================================================

  /**
   * Create a contact document from markdown content.
   * Returns the block ID of the created document root.
   */
  async createDocWithMd(
    notebookId: string,
    path: string,
    markdown: string
  ): Promise<string> {
    const res = await this.client.createDocWithMd({
      notebook: notebookId,
      path,
      markdown,
    });
    if (res?.code !== 0) {
      throw new Error(`Failed to create document: ${res?.msg ?? 'unknown error'}`);
    }
    if (!res?.data || typeof res.data !== 'string') {
      throw new Error('createDocWithMd returned no document ID');
    }
    return res.data;
  }

  /**
   * Delete a document by notebook and path.
   */
  async removeDoc(notebookId: string, path: string): Promise<void> {
    const res = await this.client.removeDoc({
      notebook: notebookId,
      path,
    });
    if (res?.code !== 0) {
      throw new Error(`Failed to remove document: ${res?.msg ?? 'unknown error'}`);
    }
  }

  /**
   * List all documents under a given path in a notebook.
   */
  async listDocsByPath(notebookId: string, path: string = '/'): Promise<DocInfo[]> {
    const res = await this.client.listDocsByPath({
      notebook: notebookId,
      path,
    });
    return (res?.data ?? []) as DocInfo[];
  }

  // ==========================================================================
  // Block Attribute Operations
  // ==========================================================================

  /**
   * Set multiple block attributes at once (IAL format).
   * @param id - Block ID
   * @param attrs - Key-value map of attributes to set
   */
  async setBlockAttrs(id: string, attrs: AttrRecord): Promise<void> {
    const res = await this.client.setBlockAttrs({
      id,
      attrs,
    });
    if (res?.code !== 0) {
      throw new Error(`Failed to set block attributes: ${res?.msg ?? 'unknown error'}`);
    }
  }

  /**
   * Get block attributes as a structured record.
   * Returns empty object if block has no attributes.
   */
  async getBlockAttrs(id: string): Promise<AttrRecord> {
    const res = await this.client.getBlockAttrs({ id });
    return (res?.data ?? {}) as AttrRecord;
  }

  // ==========================================================================
  // Block Operations
  // ==========================================================================

  /**
   * Delete a block by ID.
   */
  async deleteBlock(id: string): Promise<void> {
    const res = await this.client.deleteBlock({ id });
    if (res?.code !== 0) {
      throw new Error(`Failed to delete block: ${res?.msg ?? 'unknown error'}`);
    }
  }

  /**
   * Update a block's content (e.g., to rename a document title).
   */
  async updateBlock(id: string, dataType: string, data: string): Promise<void> {
    const res = await this.client.updateBlock({
      id,
      dataType,
      data,
    });
    if (res?.code !== 0) {
      throw new Error(`Failed to update block: ${res?.msg ?? 'unknown error'}`);
    }
  }

  // ==========================================================================
  // Search Operations
  // ==========================================================================

  /**
   * Full-text search for contacts by keyword.
   * Searches only in the contacts notebook.
   */
  async searchContacts(keyword: string, notebookId: string): Promise<SearchResult[]> {
    const res = await this.client.fullTextSearchBlock({
      query: keyword,
      method: 0,   // keyword search
      types: ['d'], // documents only
      paths: [notebookId],
    });
    return (res?.data ?? []) as SearchResult[];
  }

  // ==========================================================================
  // SQL Query
  // ==========================================================================

  /**
   * Execute a raw SQL query against SiYuan's database.
   * Requires admin permissions.
   */
  async sqlQuery(stmt: string): Promise<SqlRow[]> {
    const res = await this.client.sql({ stmt });
    return (res?.data ?? []) as SqlRow[];
  }

  // ==========================================================================
  // Notification
  // ==========================================================================

  /**
   * Show a push notification to the user.
   */
  async pushMsg(msg: string, timeout: number = 5000): Promise<void> {
    await this.client.pushMsg({ msg, timeout });
  }

  /**
   * Show an error notification to the user.
   */
  async pushErrMsg(msg: string, timeout: number = 7000): Promise<void> {
    await this.client.pushErrMsg({ msg, timeout });
  }
}
