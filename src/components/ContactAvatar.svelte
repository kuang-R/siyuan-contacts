<script lang="ts">
  /**
   * ContactAvatar — Displays a contact's avatar image or initials fallback.
   *
   * Props:
   * - avatar: base64 data URI string (empty = show initials)
   * - name: contact name (for initials generation)
   * - size: 'small' (40px) | 'large' (80px)
   */
  export let avatar: string = '';
  export let name: string = '';
  export let size: 'small' | 'large' = 'small';

  $: initials = getInitials(name);
  $: avatarSrc = avatar || '';
  $: hasAvatar = !!avatarSrc && avatarSrc.startsWith('data:image/');

  function getInitials(n: string): string {
    if (!n || !n.trim()) return '?';
    const trimmed = n.trim();
    if (/[一-鿿㐀-䶿]/.test(trimmed)) {
      const cjk = [...trimmed].filter((c) => /[一-鿿㐀-䶿]/.test(c));
      return cjk.slice(0, 2).join('');
    }
    const parts = trimmed.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }
</script>

<div class="contact-avatar {size}" class:has-avatar={hasAvatar}>
  {#if hasAvatar}
    <img src={avatarSrc} alt={name} />
  {:else}
    <span class="avatar-initials">{initials}</span>
  {/if}
</div>

<style>
  .contact-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    flex-shrink: 0;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    color: white;
    background: var(--contacts-primary, #3575f0);
    user-select: none;
  }
  .contact-avatar.large {
    width: 80px;
    height: 80px;
    font-size: 32px;
  }
  .contact-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .avatar-initials {
    line-height: 1;
  }
</style>
