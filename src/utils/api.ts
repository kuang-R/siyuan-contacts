/**
 * ContactsApi — Wrapper around SiYuan kernel HTTP API.
 *
 * All contact operations go through this class, which uses the
 * @siyuan-community/siyuan-sdk Client for HTTP communication.
 */

import { Client } from '@siyuan-community/siyuan-sdk';
import type { AttrRecord } from '../models/attributeKeys';
import { buildBacklinksQuery, buildFindReferencingBlocksQuery } from './sql';

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

export interface BacklinkItem {
  /** Document block ID that contains the reference */
  id: string;
  /** Document title */
  title?: string;
  /** Human-readable path */
  hPath?: string;
  /** Notebook ID (box) */
  box?: string;
  /** Snippet of the referencing content */
  content?: string;
  /** Specific block ID within the document that contains the reference */
  blockID?: string;
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
    const data = res?.data as any;
    return (data?.files ?? []) as DocInfo[];
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
  // Reference / Backlink Operations
  // ==========================================================================

  /**
   * Get documents that backlink to (reference) a given block.
   * Uses SQL query on the refs table as primary method,
   * falls back to /api/ref/getBackmentionDoc.
   *
   * @param blockId - The block ID to find backlinks for (contact document root block)
   * @returns Array of backlink items, empty array on failure or no results
   */
  async getBacklinks(blockId: string): Promise<BacklinkItem[]> {
    // Primary: SQL query on refs table
    try {
      const query = buildBacklinksQuery(blockId);
      const rows = await this.sqlQuery(query);
      if (rows.length > 0) {
        // Enrich with document titles and paths from blocks table
        const rootIds = [...new Set(rows.map((r: any) => r.root_id || r.id))].filter(Boolean);
        const docInfo = await this.resolveDocInfo(rootIds);
        // Fetch referencing block content for meaningful snippets
        const blockIds = [...new Set(rows.map((r: any) => r.blockID || r.block_id).filter(Boolean))];
        const blockContent = await this.resolveBlockContent(blockIds);
        return rows.map((r: any) => {
          const docId = r.id || r.root_id || '';
          const bkId = r.blockID || r.block_id || '';
          return {
            id: docId,
            blockID: bkId,
            content: blockContent[bkId] || r.content || '',
            title: docInfo[docId]?.title || '',
            hPath: docInfo[docId]?.hPath || '',
            box: '',
          };
        });
      }
    } catch (err) {
      console.warn('[siyuan-contacts] SQL backlinks query failed, trying API fallback:', err);
    }

    // Fallback: API call
    try {
      const response = await this.client._axios.post('/api/ref/getBackmentionDoc', {
        id: blockId,
      });
      if (response?.data?.code === 0 && Array.isArray(response.data.data)) {
        return response.data.data as BacklinkItem[];
      }
      console.warn('[siyuan-contacts] Backlink API returned unexpected format:', response?.data);
    } catch (err) {
      console.warn('[siyuan-contacts] Backlink API call failed:', err);
    }

    return [];
  }

  /**
   * Resolve document block IDs to their titles and paths via SQL.
   */
  private async resolveDocInfo(ids: string[]): Promise<Record<string, { title: string; hPath: string }>> {
    try {
      if (ids.length === 0) return {};
      const idList = ids.map(id => `'${id.replace(/'/g, "''")}'`).join(',');
      const rows = await this.sqlQuery(
        `SELECT id, name, content, hpath FROM blocks WHERE id IN (${idList}) AND type = 'd'`
      );
      const map: Record<string, { title: string; hPath: string }> = {};
      for (const row of rows) {
        map[row.id] = {
          title: row.name || row.content || '',
          hPath: row.hpath || '',
        };
      }
      return map;
    } catch {
      return {};
    }
  }

  /**
   * Resolve block IDs to their text content (for backlink snippets).
   */
  private async resolveBlockContent(ids: string[]): Promise<Record<string, string>> {
    try {
      if (ids.length === 0) return {};
      const idList = ids.map(id => `'${id.replace(/'/g, "''")}'`).join(',');
      const rows = await this.sqlQuery(
        `SELECT id, content FROM blocks WHERE id IN (${idList})`
      );
      const map: Record<string, string> = {};
      for (const row of rows) {
        map[row.id] = row.content || '';
      }
      return map;
    } catch {
      return {};
    }
  }

  /**
   * Repair backlinks for a restored contact document.
   *
   * When a contact document is deleted and restored, SiYuan clears the `refs`
   * table entries and does not rebuild them on restore. This method finds
   * source documents that still contain block references to the contact
   * (in their markdown) and touches them to trigger re-indexing, which
   * rebuilds the `refs` entries.
   *
   * @param contactBlockId - The contact document's root block ID
   * @param contactsNotebookId - The contacts notebook box ID (excluded from search)
   * @returns Number of source documents repaired
   */
  async repairBacklinks(contactBlockId: string, contactsNotebookId: string): Promise<number> {
    try {
      // Find source documents that reference this contact block
      const query = buildFindReferencingBlocksQuery(contactBlockId, contactsNotebookId);
      const refRows = await this.sqlQuery(query);

      if (!refRows.length) return 0;

      // Deduplicate by root_id
      const seen = new Set<string>();
      const docRoots: string[] = [];
      for (const row of refRows) {
        const rid = row.root_id;
        if (rid && !seen.has(rid)) {
          seen.add(rid);
          docRoots.push(rid);
        }
      }

      // Limit to avoid overwhelming the database
      const MAX_REPAIR = 50;
      const toRepair = docRoots.slice(0, MAX_REPAIR);

      let repaired = 0;
      for (const rootId of toRepair) {
        try {
          // Touch the document root block to trigger re-indexing.
          // Setting a transient attribute forces SiYuan to save & re-parse
          // the document, which rebuilds refs entries for block references.
          await this.setBlockAttrs(rootId, { 'custom-contact-repair-ts': String(Date.now()) });
          repaired++;
        } catch {
          // Individual document touch failures are non-fatal
        }
      }

      return repaired;
    } catch {
      return 0;
    }
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
