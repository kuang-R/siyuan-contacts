<script lang="ts">
  /**
   * GroupTag — A badge/pill displaying a group tag name.
   *
   * Props:
   * - name: the group tag text
   * - active: whether this tag is currently selected/filtered
   */
  import { createEventDispatcher } from 'svelte';

  export let name: string = '';
  export let active: boolean = false;

  const dispatch = createEventDispatcher();

  function handleKeypress(e: KeyboardEvent): void {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      dispatch('click');
    }
  }
</script>

<span
  class="group-tag"
  class:active
  on:click
  on:keypress={handleKeypress}
  role="button"
  tabindex="0"
>
  {name}
</span>

<style>
  .group-tag {
    display: inline-flex;
    align-items: center;
    padding: 3px 10px;
    border-radius: 12px;
    font-size: 12px;
    white-space: nowrap;
    cursor: pointer;
    border: 1px solid var(--contacts-border, #e0e0e0);
    background: var(--contacts-bg, #ffffff);
    color: var(--contacts-text, #333333);
    transition: all 0.15s;
    user-select: none;
  }
  .group-tag:hover {
    background: var(--contacts-primary-light, #e8f0fe);
    border-color: var(--contacts-primary, #3575f0);
  }
  .group-tag.active {
    background: var(--contacts-primary, #3575f0);
    color: white;
    border-color: var(--contacts-primary, #3575f0);
  }
</style>
