<script lang="ts">
  /**
   * GroupFilter — Horizontal scrolling group tag filter bar.
   *
   * Props:
   * - groups: array of group tag strings
   * - selected: currently selected group (empty = all)
   * - onSelect: callback when a group is selected
   */
  import GroupTag from './GroupTag.svelte';

  export let groups: string[] = [];
  export let selected: string = '';
  export let onSelect: (group: string) => void = () => {};
  export let allLabel: string = 'All';

  function handleSelect(group: string): void {
    // Toggle: clicking the already-selected group deselects it (back to "all")
    onSelect(selected === group ? '' : group);
  }
</script>

{#if groups.length > 0}
  <div class="group-filter">
    <GroupTag
      name={allLabel}
      active={selected === ''}
      on:click={() => onSelect('')}
    />
    {#each groups as group}
      <GroupTag
        {group}
        name={group}
        active={selected === group}
        on:click={() => handleSelect(group)}
      />
    {/each}
  </div>
{/if}

<style>
  .group-filter {
    display: flex;
    gap: 6px;
    padding: 8px 12px;
    overflow-x: auto;
    flex-shrink: 0;
    border-bottom: 1px solid var(--contacts-border, #e0e0e0);
    scrollbar-width: none;
  }
  .group-filter::-webkit-scrollbar {
    display: none;
  }
</style>
