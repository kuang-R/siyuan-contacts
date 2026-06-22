/**
 * SQL query builders for contact operations.
 *
 * SiYuan's blocks table schema (relevant columns):
 *   id         TEXT PRIMARY KEY  — block ID
 *   parent_id  TEXT              — parent block ID
 *   root_id    TEXT              — root block ID (same as id for document roots)
 *   box        TEXT              — notebook ID
 *   path       TEXT              — file path
 *   hpath      TEXT              — human-readable path
 *   name       TEXT              — content / title
 *   content    TEXT              — block text content
 *   markdown   TEXT              — markdown source
 *   type       TEXT              — 'd' = document, 'h' = heading, 'p' = paragraph
 *   ial        TEXT              — inline attribute list as string
 *   created    TEXT              — created timestamp
 *   updated    TEXT              — updated timestamp
 */

import { ATTR_PREFIX } from './constants';

/**
 * Build a SQL query that lists all contact documents in a notebook.
 * Filters for document type blocks that have custom-contact attributes.
 */
export function buildListContactsQuery(notebookId: string): string {
  return `
    SELECT id, hpath, name, ial, created, updated
    FROM blocks
    WHERE box = '${escapeSql(notebookId)}'
      AND type = 'd'
      AND ial LIKE '%${escapeSql(ATTR_PREFIX)}name%'
    ORDER BY created DESC
  `;
}

/**
 * Build a SQL query that searches contacts by keyword.
 */
export function buildSearchContactsQuery(notebookId: string, keyword: string): string {
  const escaped = escapeSql(keyword);
  return `
    SELECT id, hpath, name, ial, created, updated
    FROM blocks
    WHERE box = '${escapeSql(notebookId)}'
      AND type = 'd'
      AND ial LIKE '%${escapeSql(ATTR_PREFIX)}name%'
      AND (
        name LIKE '%${escaped}%'
        OR content LIKE '%${escaped}%'
        OR ial LIKE '%${escaped}%'
      )
    ORDER BY updated DESC
  `;
}

/**
 * Build a query to get a single contact by block ID.
 */
export function buildGetContactQuery(blockId: string): string {
  return `
    SELECT id, hpath, name, ial, created, updated
    FROM blocks
    WHERE id = '${escapeSql(blockId)}'
  `;
}

/**
 * Build a query to get all unique group tags from contacts in a notebook.
 */
export function buildListGroupsQuery(notebookId: string): string {
  return `
    SELECT DISTINCT ial
    FROM blocks
    WHERE box = '${escapeSql(notebookId)}'
      AND type = 'd'
      AND ial LIKE '%${escapeSql(ATTR_PREFIX)}groups%'
  `;
}

/**
 * Build a SQL query to find documents that backlink to a given block.
 *
 * SiYuan's refs table tracks block references:
 *   def_block_root_id — root document ID of the referenced block
 *   root_id           — root document ID of the block containing the reference
 *   content           — reference text
 *   block_id          — the specific block containing the reference
 */
export function buildBacklinksQuery(defBlockId: string): string {
  return `
    SELECT DISTINCT r.root_id AS id, r.content, r.block_id AS blockID, r.root_id
    FROM refs r
    WHERE r.def_block_root_id = '${escapeSql(defBlockId)}'
      AND r.root_id != '${escapeSql(defBlockId)}'
  `;
}

/**
 * Escape a string value for safe use in SQL.
 * Simple escaping: double up single quotes.
 */
function escapeSql(value: string): string {
  return value.replace(/'/g, "''");
}
