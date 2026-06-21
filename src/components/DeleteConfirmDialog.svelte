<script lang="ts">
  /**
   * DeleteConfirmDialog — Modal confirmation dialog for contact deletion.
   *
   * Props:
   * - contactName: name of the contact to delete
   * - onConfirm: callback when user confirms deletion
   * - onCancel: callback when user cancels
   */
  import { t } from '../utils/i18n';

  export let contactName: string = '';
  export let onConfirm: () => void = () => {};
  export let onCancel: () => void = () => {};

  function handleOverlayClick(e: MouseEvent): void {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  }

  function handleKeydown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      onCancel();
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="delete-dialog-overlay" on:click={handleOverlayClick}>
  <div class="delete-dialog">
    <div class="dialog-title">{t('deleteContact')}</div>
    <div class="dialog-message">
      {t('confirmDelete')}
      {#if contactName}
        <br /><strong>"{contactName}"</strong>
      {/if}
    </div>
    <div class="dialog-actions">
      <button class="btn-cancel-dialog" on:click={onCancel}>
        {t('cancel')}
      </button>
      <button class="btn-confirm-delete" on:click={onConfirm}>
        {t('delete')}
      </button>
    </div>
  </div>
</div>

<style>
  .delete-dialog-overlay {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
  }
  .delete-dialog {
    background: var(--contacts-bg, #ffffff);
    border-radius: 8px;
    padding: 24px;
    max-width: 300px;
    width: 90%;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  }
  .dialog-title {
    font-weight: 600;
    font-size: 16px;
    margin-bottom: 8px;
    color: var(--contacts-text, #333333);
  }
  .dialog-message {
    font-size: 13px;
    color: var(--contacts-text-secondary, #666666);
    margin-bottom: 20px;
    line-height: 1.5;
  }
  .dialog-actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
  }
  .btn-cancel-dialog {
    padding: 8px 16px;
    border: 1px solid var(--contacts-border, #e0e0e0);
    border-radius: 6px;
    background: var(--contacts-bg, #ffffff);
    color: var(--contacts-text, #333333);
    cursor: pointer;
    font-size: 13px;
  }
  .btn-cancel-dialog:hover {
    background: var(--contacts-hover, rgba(0, 0, 0, 0.05));
  }
  .btn-confirm-delete {
    padding: 8px 16px;
    border: none;
    border-radius: 6px;
    background: #e74c3c;
    color: white;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
  }
  .btn-confirm-delete:hover {
    background: #c0392b;
  }
</style>
