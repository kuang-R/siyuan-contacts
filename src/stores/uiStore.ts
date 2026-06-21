/**
 * UI Store — State management for panel views and UI-related state.
 */

import { writable } from 'svelte/store';

/** Current view: 'list' | 'detail' | 'add-form' | 'edit-form' */
export type PanelView = 'list' | 'detail' | 'add-form' | 'edit-form';

/** The ID of the currently selected/viewed contact */
export const selectedContactId = writable<string | null>(null);

/** Current panel view */
export const panelView = writable<PanelView>('list');

/** Whether the delete confirmation dialog is visible */
export const showDeleteConfirm = writable<boolean>(false);

/** Whether a save operation is in progress */
export const isSaving = writable<boolean>(false);

// ==========================================================================
// Navigation Actions
// ==========================================================================

/**
 * Navigate to the contact detail view.
 */
export function viewContact(id: string): void {
  // Toggle to null first so the subscriber always fires,
  // even when viewing the same contact after an update.
  selectedContactId.set(null);
  selectedContactId.set(id);
  panelView.set('detail');
}

/**
 * Go back to the list view.
 */
export function backToList(): void {
  selectedContactId.set(null);
  panelView.set('list');
  showDeleteConfirm.set(false);
}

/**
 * Open the add-contact form.
 */
export function openAddForm(): void {
  selectedContactId.set(null);
  panelView.set('add-form');
}

/**
 * Open the edit-contact form for a specific contact.
 */
export function openEditForm(id: string): void {
  selectedContactId.set(id);
  panelView.set('edit-form');
}

/**
 * Show the delete confirmation dialog.
 */
export function openDeleteConfirm(): void {
  showDeleteConfirm.set(true);
}

/**
 * Hide the delete confirmation dialog.
 */
export function cancelDelete(): void {
  showDeleteConfirm.set(false);
}
