<script lang="ts">
  /**
   * LoadingSpinner — Simple loading indicator with text.
   */
  export let text: string = 'Loading...';
</script>

<div class="loading-spinner">
  <div class="spinner"></div>
  <span>{text}</span>
</div>

<style>
  .loading-spinner {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    gap: 8px;
    color: var(--contacts-text-secondary, #666666);
    font-size: 13px;
  }
  .spinner {
    width: 20px;
    height: 20px;
    border: 2px solid var(--contacts-border, #e0e0e0);
    border-top-color: var(--contacts-primary, #3575f0);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
</style>
