<script lang="ts">
  /**
   * ContactPanel — Root dock panel component for the Contacts plugin.
   *
   * This component is mounted into the SiYuan dock panel container.
   * It orchestrates: toolbar, group filter, contact list, detail view, and forms.
   */
  import { onMount } from 'svelte';

  // Stores
  import {
    contacts,
    isLoading,
    error,
    sortMode,
    searchText,
    selectedGroup,
    filteredContacts,
    allGroups,
    loadAllContacts,
    createContact,
    updateContact,
    deleteContact,
  } from '../stores/contactStore';

  import {
    panelView,
    selectedContactId,
    showDeleteConfirm,
    isSaving,
    viewContact,
    backToList,
    openAddForm,
    openEditForm,
    openDeleteConfirm,
    cancelDelete,
  } from '../stores/uiStore';

  // Components
  import ContactToolbar from './ContactToolbar.svelte';
  import GroupFilter from './GroupFilter.svelte';
  import ContactList from './ContactList.svelte';
  import ContactDetail from './ContactDetail.svelte';
  import ContactForm from './ContactForm.svelte';
  import DeleteConfirmDialog from './DeleteConfirmDialog.svelte';
  import LoadingSpinner from './LoadingSpinner.svelte';

  import { ContactSortMode } from '../utils/constants';
  import { t } from '../utils/i18n';
  import type { ContactFormData } from '../models/contact';
  // ========================================================================
  // Props
  // ========================================================================
  export let api: any;
  export let notebookId: string | null = null;

  // ========================================================================
  // Derived state
  // ========================================================================
  $: currentContact = $contacts.find((c) => c.id === $selectedContactId) ?? null;
  $: isListView = $panelView === 'list';
  $: hasSearch = $searchText.length > 0 || $selectedGroup !== '';

  // ========================================================================
  // Lifecycle
  // ========================================================================
  onMount(() => {
    loadAllContacts();
  });

  // ========================================================================
  // Toolbar handlers
  // ========================================================================
  function handleSearch(value: string): void {
    searchText.set(value);
  }

  function handleSortChange(mode: ContactSortMode): void {
    sortMode.set(mode);
  }

  function handleAdd(): void {
    openAddForm();
  }

  // ========================================================================
  // Group filter
  // ========================================================================
  function handleGroupSelect(group: string): void {
    selectedGroup.set(group);
  }

  // ========================================================================
  // Contact list
  // ========================================================================
  function handleContactClick(id: string): void {
    viewContact(id);
  }

  // ========================================================================
  // Detail view
  // ========================================================================
  function handleEdit(): void {
    if ($selectedContactId) {
      openEditForm($selectedContactId);
    }
  }

  function handleDeleteClick(): void {
    openDeleteConfirm();
  }

  function handleBack(): void {
    backToList();
  }

  // ========================================================================
  // Form handlers
  // ========================================================================
  async function handleSaveForm(data: ContactFormData): Promise<void> {
    isSaving.set(true);
    try {
      if ($panelView === 'edit-form' && $selectedContactId) {
        await updateContact($selectedContactId, data);
        viewContact($selectedContactId); // Go back to detail view
      } else {
        await createContact(data);
        backToList(); // Go back to list
      }
    } catch (err) {
      console.error('[siyuan-contacts] Save failed:', err);
    } finally {
      isSaving.set(false);
    }
  }

  function handleCancelForm(): void {
    if ($panelView === 'edit-form' && $selectedContactId) {
      viewContact($selectedContactId); // Go back to detail
    } else {
      backToList();
    }
  }

  // ========================================================================
  // Delete handler
  // ========================================================================
  async function handleConfirmDelete(): Promise<void> {
    if (!$selectedContactId) return;
    isSaving.set(true);
    try {
      await deleteContact($selectedContactId);
      backToList();
    } catch (err) {
      console.error('[siyuan-contacts] Delete failed:', err);
    } finally {
      isSaving.set(false);
    }
  }

  function handleCancelDelete(): void {
    cancelDelete();
  }

  // ========================================================================
  // Navigate to contact in SiYuan
  // ========================================================================
  function openInSiYuan(id: string): void {
    // Use SiYuan's openTab to open the contact document
    try {
      window.siyuan?.ws?.send({
        type: 'openTab',
        data: { doc: { id } },
      });
    } catch {
      // Fallback: try opening via URL scheme
      console.log('Navigate to:', `siyuan://blocks/${id}`);
    }
  }
</script>

<div class="contacts-root">
  {#if $isLoading && $contacts.length === 0}
    <LoadingSpinner text={t('loading')} />
  {:else if $error && $contacts.length === 0}
    <div class="error-state">
      <p>{t('errorLoading')}</p>
      <p class="error-detail">{$error}</p>
      <button on:click={() => loadAllContacts()}>Retry</button>
    </div>
  {:else}
    <!-- List View -->
    {#if isListView}
      <ContactToolbar
        searchValue={$searchText}
        sortMode={$sortMode}
        onSearch={handleSearch}
        onSortChange={handleSortChange}
        onAdd={handleAdd}
      />
      <GroupFilter
        groups={$allGroups}
        selected={$selectedGroup}
        onSelect={handleGroupSelect}
        allLabel={t('allGroups')}
      />
      <ContactList
        contacts={$filteredContacts}
        onClick={handleContactClick}
        hasSearch={hasSearch}
      />
    {:else if $panelView === 'detail' && currentContact}
      <!-- Detail View -->
      <ContactDetail
        contact={currentContact}
        onBack={handleBack}
        onEdit={handleEdit}
        onDelete={handleDeleteClick}
        onOpenInSiYuan={(id) => openInSiYuan(id)}
      />
    {:else if $panelView === 'add-form'}
      <!-- Add Form -->
      <ContactForm
        onSave={handleSaveForm}
        onCancel={handleCancelForm}
        isSaving={$isSaving}
      />
    {:else if $panelView === 'edit-form' && currentContact}
      <!-- Edit Form -->
      <ContactForm
        initialData={currentContact}
        onSave={handleSaveForm}
        onCancel={handleCancelForm}
        isSaving={$isSaving}
      />
    {/if}
  {/if}
</div>

<!-- Delete Confirmation Dialog (overlays the entire dock) -->
{#if $showDeleteConfirm && currentContact}
  <DeleteConfirmDialog
    contactName={currentContact.name}
    onConfirm={handleConfirmDelete}
    onCancel={handleCancelDelete}
  />
{/if}

<style>
  .contacts-root {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
  }
  .error-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    padding: 20px;
    text-align: center;
    color: var(--contacts-text-secondary, #666666);
    gap: 8px;
  }
  .error-detail {
    font-size: 12px;
    opacity: 0.7;
    max-width: 100%;
    word-break: break-all;
  }
  .error-state button {
    margin-top: 4px;
    padding: 6px 16px;
    border: 1px solid var(--contacts-border, #e0e0e0);
    border-radius: 6px;
    background: var(--contacts-bg, #ffffff);
    color: var(--contacts-primary, #3575f0);
    cursor: pointer;
    font-size: 13px;
  }
</style>
