<script lang="ts">
  /**
   * ContactDetail — Read-only contact detail view with action buttons.
   *
   * Props:
   * - contact: the Contact object to display
   * - onBack: go back to list
   * - onEdit: switch to edit mode
   * - onDelete: show delete confirmation
   * - onOpenInSiYuan: open the contact document in SiYuan
   */
  import type { Contact } from '../models/contact';
  import ContactAvatar from './ContactAvatar.svelte';
  import { t } from '../utils/i18n';

  export let contact: Contact;
  export let onBack: () => void = () => {};
  export let onEdit: () => void = () => {};
  export let onDelete: () => void = () => {};
  export let onOpenInSiYuan: (id: string) => void = () => {};

  /** Fields to display in the detail view */
  const fields: Array<{ key: keyof Contact; labelKey: string; isLink?: boolean }> = [
    { key: 'phone', labelKey: 'phone' },
    { key: 'email', labelKey: 'email' },
    { key: 'birthday', labelKey: 'birthday' },
    { key: 'address', labelKey: 'address' },
    { key: 'org', labelKey: 'org' },
    { key: 'website', labelKey: 'website', isLink: true },
    { key: 'wechat', labelKey: 'wechat' },
    { key: 'qq', labelKey: 'qq' },
    { key: 'notes', labelKey: 'notes' },
  ];

  $: visibleFields = fields.filter((f) => {
    const val = contact[f.key as keyof Contact];
    return val && String(val).trim();
  });
</script>

<div class="contact-detail">
  <!-- Header -->
  <div class="contact-detail-header">
    <button class="btn-back" on:click={onBack} title={t('back')}>
      ←
    </button>
    <span class="header-title">{contact.name}</span>
    <button class="btn-edit" on:click={onEdit}>{t('edit')}</button>
    <button class="btn-delete" on:click={onDelete}>{t('delete')}</button>
  </div>

  <!-- Body -->
  <div class="contact-detail-body">
    <!-- Avatar -->
    <div class="detail-avatar-row">
      <ContactAvatar avatar={contact.avatar} name={contact.name} size="large" />
    </div>

    <!-- Name -->
    <div class="detail-field">
      <span class="detail-label">{t('name')}</span>
      <span class="detail-value" style="font-weight: 600;">{contact.name}</span>
    </div>

    <!-- Phone & Email (primary fields) -->
    {#if contact.phone}
      <div class="detail-field">
        <span class="detail-label">{t('phone')}</span>
        <span class="detail-value">
          {#each contact.phone.split(',') as phone, i}
            {#if i > 0}, {/if}
            <a href="tel:{phone.trim()}" class="detail-link">{phone.trim()}</a>
          {/each}
        </span>
      </div>
    {/if}

    {#if contact.email}
      <div class="detail-field">
        <span class="detail-label">{t('email')}</span>
        <span class="detail-value">
          {#each contact.email.split(',') as email, i}
            {#if i > 0}, {/if}
            <a href="mailto:{email.trim()}" class="detail-link">{email.trim()}</a>
          {/each}
        </span>
      </div>
    {/if}

    <!-- Dynamic fields -->
    {#each visibleFields as field}
      {#if field.key !== 'phone' && field.key !== 'email'}
        <div class="detail-field">
          <span class="detail-label">{t(field.labelKey)}</span>
          <span class="detail-value">
            {#if field.isLink && String(contact[field.key])}
              <a
                href={String(contact[field.key]).startsWith('http')
                  ? String(contact[field.key])
                  : `https://${contact[field.key]}`}
                class="detail-link"
                target="_blank"
                rel="noopener noreferrer"
              >
                {contact[field.key]}
              </a>
            {:else}
              {String(contact[field.key] ?? '')}
            {/if}
          </span>
        </div>
      {/if}
    {/each}

    <!-- Groups -->
    {#if contact.groups.length > 0}
      <div class="detail-field">
        <span class="detail-label">{t('groups')}</span>
        <span class="detail-value">
          <div class="detail-groups">
            {#each contact.groups as group}
              <span class="detail-group-tag">{group}</span>
            {/each}
          </div>
        </span>
      </div>
    {/if}

    <!-- Timestamps -->
    {#if contact.created}
      <div class="detail-field">
        <span class="detail-label">{t('created')}</span>
        <span class="detail-value detail-meta">{contact.created.slice(0, 10)}</span>
      </div>
    {/if}
    {#if contact.updated}
      <div class="detail-field">
        <span class="detail-label">{t('updated')}</span>
        <span class="detail-value detail-meta">{contact.updated.slice(0, 10)}</span>
      </div>
    {/if}

    <!-- Open in SiYuan -->
    <div class="detail-open">
      <button
        class="btn-open-siyuan"
        on:click={() => onOpenInSiYuan(contact.id)}
      >
        📄 Open in SiYuan
      </button>
    </div>
  </div>
</div>

<style>
  .contact-detail {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .contact-detail-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
    border-bottom: 1px solid var(--contacts-border, #e0e0e0);
    flex-shrink: 0;
    background: var(--contacts-surface, #f5f5f5);
  }
  .btn-back {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border: none;
    border-radius: 6px;
    background: transparent;
    cursor: pointer;
    color: var(--contacts-text, #333333);
    font-size: 16px;
  }
  .btn-back:hover {
    background: var(--contacts-hover, rgba(0, 0, 0, 0.05));
  }
  .header-title {
    flex: 1;
    font-weight: 600;
    font-size: 15px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .btn-edit,
  .btn-delete {
    padding: 4px 12px;
    border: 1px solid var(--contacts-border, #e0e0e0);
    border-radius: 6px;
    cursor: pointer;
    font-size: 12px;
    background: var(--contacts-bg, #ffffff);
    color: var(--contacts-text, #333333);
    transition: all 0.15s;
  }
  .btn-edit:hover {
    background: var(--contacts-primary-light, #e8f0fe);
    border-color: var(--contacts-primary, #3575f0);
    color: var(--contacts-primary, #3575f0);
  }
  .btn-delete:hover {
    background: #fce8e8;
    border-color: #e74c3c;
    color: #e74c3c;
  }
  .contact-detail-body {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
  }
  .detail-avatar-row {
    display: flex;
    justify-content: center;
    margin-bottom: 20px;
  }
  .detail-field {
    display: flex;
    padding: 8px 0;
    border-bottom: 1px solid var(--contacts-border, #e0e0e0);
  }
  .detail-field:last-child {
    border-bottom: none;
  }
  .detail-label {
    width: 64px;
    flex-shrink: 0;
    font-size: 12px;
    color: var(--contacts-text-secondary, #666666);
    padding-top: 2px;
  }
  .detail-value {
    flex: 1;
    font-size: 14px;
    color: var(--contacts-text, #333333);
    word-break: break-all;
  }
  .detail-link {
    color: var(--contacts-primary, #3575f0);
    text-decoration: none;
  }
  .detail-link:hover {
    text-decoration: underline;
  }
  .detail-meta {
    font-size: 12px;
    color: var(--contacts-text-secondary, #666666);
  }
  .detail-groups {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
  }
  .detail-group-tag {
    font-size: 12px;
    padding: 2px 8px;
    border-radius: 10px;
    background: var(--contacts-primary-light, #e8f0fe);
    color: var(--contacts-primary, #3575f0);
  }
  .detail-open {
    margin-top: 16px;
    text-align: center;
  }
  .btn-open-siyuan {
    padding: 8px 16px;
    border: 1px solid var(--contacts-border, #e0e0e0);
    border-radius: 8px;
    background: var(--contacts-bg, #ffffff);
    color: var(--contacts-text, #333333);
    cursor: pointer;
    font-size: 13px;
    transition: all 0.15s;
  }
  .btn-open-siyuan:hover {
    background: var(--contacts-hover, rgba(0, 0, 0, 0.05));
  }
</style>
