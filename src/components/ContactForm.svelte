<script lang="ts">
  /**
   * ContactForm — Add / Edit contact form.
   *
   * Props:
   * - initialData: pre-filled Contact data (for editing). Empty = new contact.
   * - onSave: callback with form data when Save is clicked
   * - onCancel: callback when Cancel is clicked
   * - isSaving: whether a save operation is in progress
   */
  import { createEventDispatcher } from 'svelte';
  import type { Contact, ContactFormData } from '../models/contact';
  import { emptyFormData, contactToFormData } from '../models/contact';
  import ContactAvatar from './ContactAvatar.svelte';
  import { t } from '../utils/i18n';
  import { MAX_AVATAR_SIZE } from '../utils/constants';

  export let initialData: Contact | null = null;
  export let onSave: (data: ContactFormData) => Promise<void> = async () => {};
  export let onCancel: () => void = () => {};
  export let isSaving: boolean = false;

  // Form state
  let form: ContactFormData = initialData
    ? contactToFormData(initialData)
    : emptyFormData();

  let avatarPreview: string = form.avatar || '';
  let avatarError: string = '';

  // React to initialData changes (e.g. when switching contacts)
  $: if (initialData) {
    form = contactToFormData(initialData);
    avatarPreview = form.avatar || '';
  }

  // Validation
  $: nameValid = form.name.trim().length > 0;
  $: canSave = nameValid && !isSaving;

  async function handleAvatarUpload(e: Event): Promise<void> {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    avatarError = '';

    if (file.size > MAX_AVATAR_SIZE) {
      avatarError = `Image too large (max ${MAX_AVATAR_SIZE / 1024}KB)`;
      return;
    }

    try {
      const dataUri = await readFileAsDataURI(file);
      avatarPreview = dataUri;
      form.avatar = dataUri;
    } catch (err) {
      avatarError = 'Failed to read image';
    }
  }

  function readFileAsDataURI(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }

  function handleRemoveAvatar(): void {
    avatarPreview = '';
    form.avatar = '';
    avatarError = '';
  }

  async function handleSubmit(): Promise<void> {
    if (!canSave) return;
    await onSave(form);
  }

  function handleCancel(): void {
    onCancel();
  }

  // Form input binding helper
  function bindField<K extends keyof ContactFormData>(
    key: K,
    value: string
  ): void {
    (form as any)[key] = value;
  }
</script>

<div class="contact-form">
  <!-- Header -->
  <div class="form-header">
    <span class="header-title">
      {initialData ? t('editContact') : t('addContact')}
    </span>
    <button class="btn-cancel" on:click={handleCancel} disabled={isSaving}>
      {t('cancel')}
    </button>
  </div>

  <!-- Body -->
  <div class="form-body">
    <!-- Avatar Upload -->
    <div class="form-group">
      <label class="form-label">{t('avatar')}</label>
      <div class="avatar-upload">
        <label
          class="avatar-upload-label"
          class:has-image={!!avatarPreview}
          title={t('uploadAvatar')}
        >
          {#if avatarPreview}
            <img src={avatarPreview} alt="Avatar preview" />
          {:else}
            <span>+</span>
          {/if}
          <input
            type="file"
            accept="image/*"
            on:change={handleAvatarUpload}
            class="file-input-hidden"
          />
        </label>
        {#if avatarPreview}
          <button
            class="btn-remove-avatar"
            on:click={handleRemoveAvatar}
            type="button"
          >
            ✕
          </button>
        {/if}
      </div>
      {#if avatarError}
        <p class="form-error">{avatarError}</p>
      {/if}
    </div>

    <!-- Name (required) -->
    <div class="form-group">
      <label class="form-label" for="contact-name">
        {t('name')} *
      </label>
      <input
        id="contact-name"
        type="text"
        class="form-input"
        class:input-error={!nameValid && form.name.length > 0}
        bind:value={form.name}
        placeholder={t('name')}
        autofocus
      />
    </div>

    <!-- Phone -->
    <div class="form-group">
      <label class="form-label" for="contact-phone">{t('phone')}</label>
      <input
        id="contact-phone"
        type="text"
        class="form-input"
        bind:value={form.phone}
        placeholder="13800138000"
      />
    </div>

    <!-- Email -->
    <div class="form-group">
      <label class="form-label" for="contact-email">{t('email')}</label>
      <input
        id="contact-email"
        type="email"
        class="form-input"
        bind:value={form.email}
        placeholder="name@example.com"
      />
    </div>

    <!-- Birthday -->
    <div class="form-group">
      <label class="form-label" for="contact-birthday">{t('birthday')}</label>
      <input
        id="contact-birthday"
        type="date"
        class="form-input"
        bind:value={form.birthday}
      />
    </div>

    <!-- Organization -->
    <div class="form-group">
      <label class="form-label" for="contact-org">{t('org')}</label>
      <input
        id="contact-org"
        type="text"
        class="form-input"
        bind:value={form.org}
        placeholder={t('org')}
      />
    </div>

    <!-- Address -->
    <div class="form-group">
      <label class="form-label" for="contact-address">{t('address')}</label>
      <input
        id="contact-address"
        type="text"
        class="form-input"
        bind:value={form.address}
        placeholder={t('address')}
      />
    </div>

    <!-- Groups -->
    <div class="form-group">
      <label class="form-label" for="contact-groups">{t('groups')}</label>
      <input
        id="contact-groups"
        type="text"
        class="form-input"
        bind:value={form.groups}
        placeholder={t('groupsHint')}
      />
      <p class="form-hint">{t('groupsHint')}</p>
    </div>

    <!-- Website -->
    <div class="form-group">
      <label class="form-label" for="contact-website">{t('website')}</label>
      <input
        id="contact-website"
        type="url"
        class="form-input"
        bind:value={form.website}
        placeholder="https://"
      />
    </div>

    <!-- WeChat -->
    <div class="form-group">
      <label class="form-label" for="contact-wechat">{t('wechat')}</label>
      <input
        id="contact-wechat"
        type="text"
        class="form-input"
        bind:value={form.wechat}
      />
    </div>

    <!-- QQ -->
    <div class="form-group">
      <label class="form-label" for="contact-qq">{t('qq')}</label>
      <input
        id="contact-qq"
        type="text"
        class="form-input"
        bind:value={form.qq}
      />
    </div>

    <!-- Notes -->
    <div class="form-group">
      <label class="form-label" for="contact-notes">{t('notes')}</label>
      <textarea
        id="contact-notes"
        class="form-input form-textarea"
        bind:value={form.notes}
        placeholder={t('notes')}
        rows={3}
      ></textarea>
    </div>
  </div>

  <!-- Actions -->
  <div class="form-actions">
    <button
      class="btn-save"
      on:click={handleSubmit}
      disabled={!canSave}
    >
      {isSaving ? t('loading') : t('save')}
    </button>
  </div>
</div>

<style>
  .contact-form {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .form-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
    border-bottom: 1px solid var(--contacts-border, #e0e0e0);
    flex-shrink: 0;
    background: var(--contacts-surface, #f5f5f5);
  }
  .header-title {
    flex: 1;
    font-weight: 600;
    font-size: 15px;
  }
  .form-body {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
  }
  .form-group {
    margin-bottom: 14px;
  }
  .form-label {
    display: block;
    font-size: 12px;
    color: var(--contacts-text-secondary, #666666);
    margin-bottom: 4px;
  }
  .form-input {
    width: 100%;
    padding: 8px 10px;
    border: 1px solid var(--contacts-border, #e0e0e0);
    border-radius: 6px;
    font-size: 14px;
    background: var(--contacts-bg, #ffffff);
    color: var(--contacts-text, #333333);
    outline: none;
    box-sizing: border-box;
    transition: border-color 0.2s;
    font-family: inherit;
  }
  .form-input:focus {
    border-color: var(--contacts-primary, #3575f0);
  }
  .input-error {
    border-color: #e74c3c;
  }
  .form-textarea {
    resize: vertical;
    min-height: 60px;
  }
  .form-hint {
    font-size: 11px;
    color: var(--contacts-text-secondary, #666666);
    margin-top: 2px;
  }
  .form-error {
    font-size: 11px;
    color: #e74c3c;
    margin-top: 2px;
  }
  .avatar-upload {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .avatar-upload-label {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 64px;
    height: 64px;
    border-radius: 50%;
    border: 2px dashed var(--contacts-border, #e0e0e0);
    cursor: pointer;
    font-size: 24px;
    color: var(--contacts-text-secondary, #666666);
    text-align: center;
    transition: all 0.2s;
    overflow: hidden;
    position: relative;
  }
  .avatar-upload-label:hover {
    border-color: var(--contacts-primary, #3575f0);
    color: var(--contacts-primary, #3575f0);
  }
  .avatar-upload-label.has-image {
    border-style: solid;
    border-color: var(--contacts-primary, #3575f0);
  }
  .avatar-upload-label img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    position: absolute;
    inset: 0;
  }
  .file-input-hidden {
    display: none;
  }
  .btn-remove-avatar {
    width: 24px;
    height: 24px;
    border: none;
    border-radius: 50%;
    background: #e74c3c;
    color: white;
    cursor: pointer;
    font-size: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .form-actions {
    display: flex;
    gap: 8px;
    padding: 12px 16px;
    border-top: 1px solid var(--contacts-border, #e0e0e0);
    flex-shrink: 0;
  }
  .btn-cancel {
    padding: 4px 12px;
    border: 1px solid var(--contacts-border, #e0e0e0);
    border-radius: 6px;
    background: var(--contacts-bg, #ffffff);
    color: var(--contacts-text, #333333);
    font-size: 12px;
    cursor: pointer;
  }
  .btn-save {
    flex: 1;
    padding: 10px;
    border: none;
    border-radius: 6px;
    background: var(--contacts-primary, #3575f0);
    color: white;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: opacity 0.2s;
  }
  .btn-save:hover:not(:disabled) {
    opacity: 0.9;
  }
  .btn-save:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
