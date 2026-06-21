<script lang="ts">
  /**
   * ContactListItem — A single contact row in the list.
   *
   * Props:
   * - contact: the Contact object to display
   * - onClick: callback when the item is clicked
   */
  import type { Contact } from '../models/contact';
  import ContactAvatar from './ContactAvatar.svelte';

  export let contact: Contact;
  export let onClick: (id: string) => void = () => {};

  $: brief = getBrief(contact);
  $: displayGroups = contact.groups.slice(0, 3);

  function getBrief(c: Contact): string {
    const parts: string[] = [];
    if (c.phone) parts.push(c.phone.split(',')[0].trim());
    if (c.email) parts.push(c.email.split(',')[0].trim());
    if (c.org) parts.push(c.org);
    return parts.slice(0, 2).join(' · ') || ' ';
  }

  function handleClick(): void {
    onClick(contact.id);
  }

  function handleKeypress(e: KeyboardEvent): void {
    if (e.key === 'Enter') {
      onClick(contact.id);
    }
  }
</script>

<div
  class="contact-list-item"
  on:click={handleClick}
  on:keypress={handleKeypress}
  role="button"
  tabindex="0"
>
  <ContactAvatar avatar={contact.avatar} name={contact.name} size="small" />
  <div class="contact-info">
    <div class="contact-name">{contact.name}</div>
    {#if brief && brief !== ' '}
      <div class="contact-brief">{brief}</div>
    {/if}
    {#if displayGroups.length > 0}
      <div class="contact-item-tags">
        {#each displayGroups as group}
          <span class="contact-item-tag">{group}</span>
        {/each}
        {#if contact.groups.length > 3}
          <span class="contact-item-tag">+{contact.groups.length - 3}</span>
        {/if}
      </div>
    {/if}
  </div>
</div>

<style>
  .contact-list-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    cursor: pointer;
    transition: background 0.15s;
    border-bottom: 1px solid var(--contacts-border, #e0e0e0);
  }
  .contact-list-item:hover {
    background: var(--contacts-hover, rgba(0, 0, 0, 0.05));
  }
  .contact-list-item:last-child {
    border-bottom: none;
  }
  .contact-info {
    flex: 1;
    min-width: 0;
  }
  .contact-name {
    font-weight: 500;
    font-size: 14px;
    color: var(--contacts-text, #333333);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .contact-brief {
    font-size: 12px;
    color: var(--contacts-text-secondary, #666666);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-top: 2px;
  }
  .contact-item-tags {
    display: flex;
    gap: 3px;
    flex-wrap: wrap;
    margin-top: 2px;
  }
  .contact-item-tag {
    font-size: 10px;
    padding: 1px 6px;
    border-radius: 8px;
    background: var(--contacts-primary-light, #e8f0fe);
    color: var(--contacts-primary, #3575f0);
  }
</style>
