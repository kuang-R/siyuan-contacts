<script lang="ts">
  /**
   * ContactToolbar — Search input, sort selector, and add button.
   *
   * Props:
   * - searchValue: current search text
   * - sortMode: current sort mode
   * - onSearch: callback for search text changes
   * - onSortChange: callback for sort mode changes
   * - onAdd: callback for add button click
   */
  import { ContactSortMode } from '../utils/constants';
  import { t } from '../utils/i18n';

  export let searchValue: string = '';
  export let sortMode: ContactSortMode = ContactSortMode.NAME_ASC;
  export let onSearch: (value: string) => void = () => {};
  export let onSortChange: (mode: ContactSortMode) => void = () => {};
  export let onAdd: () => void = () => {};

  function handleSearchInput(e: Event): void {
    const target = e.target as HTMLInputElement;
    onSearch(target.value);
  }

  function handleSortChange(e: Event): void {
    const target = e.target as HTMLSelectElement;
    onSortChange(target.value as ContactSortMode);
  }
</script>

<div class="contacts-toolbar">
  <input
    type="text"
    class="search-input"
    placeholder={t('searchPlaceholder')}
    value={searchValue}
    on:input={handleSearchInput}
  />
  <select
    class="sort-select"
    value={sortMode}
    on:change={handleSortChange}
    title={t('sortByName')}
  >
    <option value={ContactSortMode.NAME_ASC}>{t('sortByNameAsc')}</option>
    <option value={ContactSortMode.NAME_DESC}>{t('sortByNameDesc')}</option>
    <option value={ContactSortMode.CREATED_DESC}>{t('sortByCreated')}</option>
    <option value={ContactSortMode.UPDATED_DESC}>{t('sortByUpdated')}</option>
  </select>
  <button
    class="btn-add"
    on:click={onAdd}
    title={t('addContact')}
  >
    +
  </button>
</div>

<style>
  .contacts-toolbar {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 10px 12px;
    border-bottom: 1px solid var(--contacts-border, #e0e0e0);
    background: var(--contacts-surface, #f5f5f5);
    flex-shrink: 0;
  }
  .search-input {
    flex: 1;
    min-width: 0;
    padding: 6px 10px;
    border: 1px solid var(--contacts-border, #e0e0e0);
    border-radius: 6px;
    font-size: 13px;
    background: var(--contacts-bg, #ffffff);
    color: var(--contacts-text, #333333);
    outline: none;
    transition: border-color 0.2s;
  }
  .search-input:focus {
    border-color: var(--contacts-primary, #3575f0);
  }
  .search-input::placeholder {
    color: var(--contacts-text-secondary, #666666);
  }
  .sort-select {
    padding: 6px 8px;
    border: 1px solid var(--contacts-border, #e0e0e0);
    border-radius: 6px;
    font-size: 12px;
    background: var(--contacts-bg, #ffffff);
    color: var(--contacts-text, #333333);
    cursor: pointer;
    outline: none;
    max-width: 100px;
  }
  .btn-add {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    border: none;
    border-radius: 6px;
    background: var(--contacts-primary, #3575f0);
    color: white;
    font-size: 18px;
    font-weight: 600;
    cursor: pointer;
    flex-shrink: 0;
    transition: opacity 0.2s;
    line-height: 1;
  }
  .btn-add:hover {
    opacity: 0.85;
  }
</style>
