<script lang="ts">
  /**
   * ContactList — Scrollable list of contacts.
   *
   * Props:
   * - contacts: array of Contact objects to display
   * - onClick: callback when a contact is clicked
   */
  import type { Contact } from '../models/contact';
  import ContactListItem from './ContactListItem.svelte';
  import EmptyState from './EmptyState.svelte';
  import { t } from '../utils/i18n';

  export let contacts: Contact[] = [];
  export let onClick: (id: string) => void = () => {};
  export let hasSearch: boolean = false;
</script>

{#if contacts.length === 0}
  <EmptyState
    icon="🔍"
    message={hasSearch ? t('noSearchResults') : t('noContacts')}
  />
{:else}
  <div class="contact-list">
    {#each contacts as contact (contact.id)}
      <ContactListItem {contact} {onClick} />
    {/each}
  </div>
{/if}

<style>
  .contact-list {
    flex: 1;
    overflow-y: auto;
    padding: 4px 0;
  }
</style>
