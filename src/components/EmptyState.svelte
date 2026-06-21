<script lang="ts">
  /**
   * EmptyState — Placeholder shown when a list is empty.
   *
   * Props:
   * - icon: emoji or character to show as the icon
   * - message: main message text
   * - actionLabel: optional action button text
   * - onAction: optional action button click handler
   */
  export let icon: string = '👤';
  export let message: string = 'No items';
  export let actionLabel: string = '';
  export let onAction: (() => void) | null = null;
</script>

<div class="empty-state">
  <div class="empty-icon">{icon}</div>
  <div class="empty-text">{message}</div>
  {#if actionLabel && onAction}
    <button class="empty-action" on:click={onAction}>
      + {actionLabel}
    </button>
  {/if}
</div>

<style>
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    padding: 40px 20px;
    color: var(--contacts-text-secondary, #666666);
    text-align: center;
    gap: 12px;
  }
  .empty-icon {
    font-size: 48px;
    opacity: 0.4;
    line-height: 1;
  }
  .empty-text {
    font-size: 14px;
  }
  .empty-action {
    margin-top: 8px;
    padding: 8px 20px;
    border: 1px dashed var(--contacts-border, #e0e0e0);
    border-radius: 8px;
    background: transparent;
    color: var(--contacts-primary, #3575f0);
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s;
  }
  .empty-action:hover {
    border-style: solid;
    background: var(--contacts-primary-light, #e8f0fe);
  }
</style>
