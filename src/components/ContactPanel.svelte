<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import {
    contacts, isLoading, error, sortMode, searchText, selectedGroup,
    filteredContacts, allGroups, loadAllContacts,
    createContact, updateContact, deleteContact,
  } from '../stores/contactStore';
  import {
    panelView, selectedContactId, showDeleteConfirm, isSaving,
    viewContact, backToList, openAddForm, openEditForm,
    openDeleteConfirm, cancelDelete,
  } from '../stores/uiStore';
  import { ContactSortMode, MAX_AVATAR_SIZE } from '../utils/constants';
  import { t } from '../utils/i18n';

  export let api: any;
  export let notebookId: string | null = null;
  export let showFab = true;
  export let onToggleFab: () => void = () => {};

  function L(key: string): string { return t(key); }

  // Local state
  let _contacts: any[] = [], _loading = false, _error: string|null = null;
  let _sort = ContactSortMode.NAME_ASC, _search = '', _group = '';
  let _filtered: any[] = [], _groups: string[] = [];
  let _view = 'list', _cid: string|null = null, _contact: any = null;
  let _showDel = false, _saving = false, _isList = true, _hasSearch = false;

  // Form fields
  let fName = '', fPhones: string[] = [''], fEmails: string[] = [''],
    fBirthday = '', fAddr = '', fOrg = '', fNotes = '', fGroups = '',
    fAvatar = '', fWeb = '', fWx = '', fQq = '';
  let avatarPrev = '', avatarErr = '';

  const unsubs: Array<()=>void> = [];

  function doSub(s: any, fn: (v:any)=>void) { unsubs.push(s.subscribe(fn)); }

  onMount(() => {
    doSub(contacts, v => { _contacts = v; _contact = _contacts.find(c => c.id === _cid) ?? null; });
    doSub(isLoading, v => _loading = v);
    doSub(error, v => _error = v);
    doSub(sortMode, v => _sort = v);
    doSub(searchText, v => { _search = v; _hasSearch = _search.length > 0 || _group !== ''; });
    doSub(selectedGroup, v => { _group = v; _hasSearch = _search.length > 0 || _group !== ''; });
    doSub(filteredContacts, v => _filtered = v);
    doSub(allGroups, v => _groups = v);
    doSub(panelView, v => { _view = v; _isList = v === 'list'; });
    doSub(selectedContactId, v => { _cid = v; _contact = _contacts.find(c => c.id === _cid) ?? null; });
    doSub(showDeleteConfirm, v => _showDel = v);
    doSub(isSaving, v => _saving = v);
    loadAllContacts();
  });

  onDestroy(() => { unsubs.forEach(f => f()); });

  // Phone/email helpers
  function parseMulti(v: string): string[] {
    const arr = v ? String(v).split(',').map(s => s.trim()).filter(Boolean) : [];
    return arr.length > 0 ? arr : [''];
  }
  function joinMulti(arr: string[]): string {
    return arr.map(s => s.trim()).filter(Boolean).join(', ');
  }
  function addPhone() { fPhones = [...fPhones, '']; }
  function rmPhone(i: number) { if (fPhones.length > 1) { fPhones.splice(i, 1); fPhones = fPhones; } }
  function addEmail() { fEmails = [...fEmails, '']; }
  function rmEmail(i: number) { if (fEmails.length > 1) { fEmails.splice(i, 1); fEmails = fEmails; } }

  function initForm(c: any) {
    fName = c?.name || '';
    fPhones = parseMulti(c?.phone);
    fEmails = parseMulti(c?.email);
    fBirthday = c?.birthday || ''; fAddr = c?.address || ''; fOrg = c?.org || '';
    fNotes = c?.notes || ''; fGroups = c?.groups?.join(', ') || '';
    fAvatar = c?.avatar || ''; fWeb = c?.website || '';
    fWx = c?.wechat || ''; fQq = c?.qq || '';
    avatarPrev = c?.avatar || ''; avatarErr = '';
  }
  $: if (_view === 'edit-form' && _contact) initForm(_contact);
  $: if (_view === 'add-form' && !_contact) initForm(null);

  function getBrief(c: any): string {
    const parts = [c.phone, c.email, c.org].filter(Boolean).map(p => String(p).split(',')[0].trim());
    return parts.slice(0,2).join(' · ') || ' ';
  }
  function getInitials(n: string): string {
    if (!n||!n.trim()) return '?'; const tn = n.trim();
    return /[一-鿿]/.test(tn) ? [...tn].filter(c=>/[一-鿿]/.test(c)).slice(0,2).join('') :
      tn.split(/\s+/).filter(Boolean).map(p=>p[0].toUpperCase()).slice(0,2).join('');
  }

  function goAdd() { openAddForm(); }
  function goBack() { backToList(); }
  function goEdit() { if (_cid) openEditForm(_cid); }
  function goDel() { openDeleteConfirm(); }
  function cancelDel() { cancelDelete(); }

  function saveForm() {
    if (!fName.trim()) return;
    isSaving.set(true);
    const data = {
      name: fName, phone: joinMulti(fPhones), email: joinMulti(fEmails),
      birthday: fBirthday, address: fAddr, org: fOrg, notes: fNotes,
      groups: fGroups, avatar: fAvatar, website: fWeb, wechat: fWx, qq: fQq,
    };
    (_view === 'edit-form' && _cid
      ? updateContact(_cid, data).then(() => viewContact(_cid!))
      : createContact(data).then(() => backToList())
    ).catch(e => console.error(e)).finally(() => isSaving.set(false));
  }
  function cancelForm() { _view === 'edit-form' && _cid ? viewContact(_cid) : backToList(); }

  function doDelete() {
    if (!_cid) return;
    isSaving.set(true);
    deleteContact(_cid).then(() => backToList())
      .catch(e => console.error(e)).finally(() => isSaving.set(false));
  }

  function openSiYuan(id: string) {
    try { window.siyuan?.ws?.send({ type:'openTab', data:{ doc:{ id } } }); } catch {}
  }

  let copiedNum = '';
  function copyTel(e: Event, num: string) {
    e.preventDefault();
    try { navigator.clipboard?.writeText(num); } catch {}
    copiedNum = num;
    setTimeout(() => copiedNum = '', 2000);
  }

  let fabToast = '';
  function handleToggleFab() {
    const wasVisible = showFab;
    onToggleFab();
    fabToast = wasVisible ? L('fabHidden') : L('fabShown');
    setTimeout(() => fabToast = '', 2000);
  }

  function onAvatarFile(e: Event) {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (!f) return;
    avatarErr = '';
    if (f.size > MAX_AVATAR_SIZE) { avatarErr = L('avatarTooLarge'); return; }
    const r = new FileReader();
    r.onload = () => { avatarPrev = r.result as string; fAvatar = r.result as string; };
    r.readAsDataURL(f);
  }
</script>

<div class="root">
  {#if _loading && _contacts.length === 0}
    <div class="center">{L('loading')}</div>
  {:else if _error && _contacts.length === 0}
    <div class="center">{L('errorLoading')}: {_error}</div>
  {:else if _isList}
    <!-- LIST -->
    <div class="toolbar">
      <input type="text" class="s-in" placeholder={L('searchPlaceholder')} value={_search}
        on:input={e => searchText.set(e.target.value)} />
      <select class="s-sel" value={_sort} on:change={e => sortMode.set(e.target.value)}>
        <option value={ContactSortMode.NAME_ASC}>{L('sortByNameAsc')}</option>
        <option value={ContactSortMode.NAME_DESC}>{L('sortByNameDesc')}</option>
        <option value={ContactSortMode.CREATED_DESC}>{L('sortByCreated')}</option>
        <option value={ContactSortMode.UPDATED_DESC}>{L('sortByUpdated')}</option>
      </select>
      <button type="button" class="btn-fab" on:click={handleToggleFab} title={L('settingShowFab')}>
        {#if showFab}
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
            <circle cx="8" cy="8" r="6" opacity="0.85"/>
            <circle cx="8" cy="8" r="3.5" fill="white"/>
            <circle cx="8" cy="8" r="1.5" opacity="0.85"/>
          </svg>
        {:else}
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="14" height="14" fill="currentColor" opacity="0.4">
            <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
            <circle cx="8" cy="8" r="1.5"/>
          </svg>
        {/if}
      </button>
      <button type="button" class="btn-add" on:click={goAdd}>+</button>
    </div>
    {#if _groups.length > 0}
      <div class="g-bar">
        <span class="g-tag" class:active={_group===''} on:click={()=>selectedGroup.set('')}>{L('allGroups')}</span>
        {#each _groups as g}
          <span class="g-tag" class:active={_group===g}
            on:click={()=>selectedGroup.set(_group===g?'':g)}>{g}</span>
        {/each}
      </div>
    {/if}
    {#if fabToast}
      <div class="toast" style="bottom:120px">{fabToast}</div>
    {/if}
    <div class="c-list">
      {#each _filtered as c (c.id)}
        <div class="c-item" on:click={()=>viewContact(c.id)}>
          <div class="av-sm">{getInitials(c.name)}</div>
          <div class="c-info">
            <div class="c-name">{c.name}</div>
            <div class="c-brief">{getBrief(c)}</div>
            {#if c.groups.length > 0}
              <div class="c-tags">{#each c.groups.slice(0,3) as g}<span class="c-tag">{g}</span>{/each}</div>
            {/if}
          </div>
        </div>
      {/each}
      {#if _filtered.length === 0}
        <div class="center">{L('noContacts')}</div>
      {/if}
    </div>

  {:else if _view === 'detail' && _contact}
    <!-- DETAIL -->
    <div class="d-head">
      <button class="d-back" on:click={goBack}>{L('back')}</button>
      <span class="d-title">{_contact.name}</span>
      <button class="d-ed" on:click={goEdit}>{L('edit')}</button>
      <button class="d-del" on:click={goDel}>{L('delete')}</button>
    </div>
    <div class="d-body">
      <div class="d-av-row"><div class="av-lg">{getInitials(_contact.name)}</div></div>
      <div class="d-row"><span class="d-l">{L('name')}</span><span class="d-v b">{_contact.name}</span></div>
      {#if _contact.phone}
        <div class="d-row"><span class="d-l">{L('phone')}</span>
          <span class="d-v">{#each parseMulti(_contact.phone).filter(Boolean) as p, i}
            {#if i>0}, {/if}<a href="tel:{p}" class="link" on:click={(e) => copyTel(e, p)}>{p}</a>{/each}</span></div>
      {/if}
      {#if copiedNum}
        <div class="toast">📋 {copiedNum} {L('copied')}</div>
      {/if}
      {#if _contact.email}
        <div class="d-row"><span class="d-l">{L('email')}</span>
          <span class="d-v">{#each parseMulti(_contact.email).filter(Boolean) as e, i}
            {#if i>0}, {/if}<a href="mailto:{e}" class="link">{e}</a>{/each}</span></div>
      {/if}
      {#if _contact.birthday}<div class="d-row"><span class="d-l">{L('birthday')}</span><span class="d-v">{_contact.birthday}</span></div>{/if}
      {#if _contact.address}<div class="d-row"><span class="d-l">{L('address')}</span><span class="d-v">{_contact.address}</span></div>{/if}
      {#if _contact.org}<div class="d-row"><span class="d-l">{L('org')}</span><span class="d-v">{_contact.org}</span></div>{/if}
      {#if _contact.website}<div class="d-row"><span class="d-l">{L('website')}</span><span class="d-v"><a href={_contact.website.startsWith('http')?_contact.website:'https://'+_contact.website} target="_blank" class="link">{_contact.website}</a></span></div>{/if}
      {#if _contact.wechat}<div class="d-row"><span class="d-l">{L('wechat')}</span><span class="d-v">{_contact.wechat}</span></div>{/if}
      {#if _contact.qq}<div class="d-row"><span class="d-l">{L('qq')}</span><span class="d-v">{_contact.qq}</span></div>{/if}
      {#if _contact.notes}<div class="d-row"><span class="d-l">{L('notes')}</span><span class="d-v">{_contact.notes}</span></div>{/if}
      {#if _contact.groups.length > 0}<div class="d-row"><span class="d-l">{L('groups')}</span><span class="d-v d-gs">{#each _contact.groups as g}<span class="d-gt">{g}</span>{/each}</span></div>{/if}
      {#if _contact.created}<div class="d-row"><span class="d-l">{L('created')}</span><span class="d-v meta">{_contact.created.slice(0,10)}</span></div>{/if}
      {#if _contact.updated}<div class="d-row"><span class="d-l">{L('updated')}</span><span class="d-v meta">{_contact.updated.slice(0,10)}</span></div>{/if}
    </div>

  {:else if _view === 'add-form' || _view === 'edit-form'}
    <!-- FORM -->
    <div class="f-head">
      <span class="f-title">{_view==='add-form'?L('addContact'):L('editContact')}</span>
      <button class="f-cancel" on:click={cancelForm} disabled={_saving}>{L('cancel')}</button>
    </div>
    <div class="f-body">
      <div class="fg"><label class="fl">{L('avatar')}</label>
        <div class="av-up">
          <label class="av-lab" class:has-img={!!avatarPrev}>
            {#if avatarPrev}<img src={avatarPrev} alt="" />{:else}+{/if}
            <input type="file" accept="image/*" on:change={onAvatarFile} class="f-hidden" />
          </label>
          {#if avatarPrev}<button class="av-rm" on:click={()=>{avatarPrev='';fAvatar='';}}>x</button>{/if}
        </div>
        {#if avatarErr}<p class="f-err">{avatarErr}</p>{/if}
      </div>
      <div class="fg"><label class="fl">{L('name')} *</label><input type="text" class="fi" bind:value={fName} /></div>

      <!-- Phones -->
      <div class="fg"><label class="fl">{L('phone')}</label>
        {#each fPhones as p, i}
          <div class="multi-row">
            <input type="text" class="fi" bind:value={fPhones[i]} placeholder="13800138000" />
            {#if fPhones.length > 1}
              <button class="btn-rm" on:click={()=>rmPhone(i)}>−</button>
            {/if}
          </div>
        {/each}
        <button class="btn-add-more" on:click={addPhone}>+ {L('phone')}</button>
      </div>

      <!-- Emails -->
      <div class="fg"><label class="fl">{L('email')}</label>
        {#each fEmails as e, i}
          <div class="multi-row">
            <input type="email" class="fi" bind:value={fEmails[i]} placeholder="name@example.com" />
            {#if fEmails.length > 1}
              <button class="btn-rm" on:click={()=>rmEmail(i)}>−</button>
            {/if}
          </div>
        {/each}
        <button class="btn-add-more" on:click={addEmail}>+ {L('email')}</button>
      </div>

      <div class="fg"><label class="fl">{L('birthday')}</label><input type="date" class="fi" bind:value={fBirthday} /></div>
      <div class="fg"><label class="fl">{L('org')}</label><input type="text" class="fi" bind:value={fOrg} /></div>
      <div class="fg"><label class="fl">{L('address')}</label><input type="text" class="fi" bind:value={fAddr} /></div>
      <div class="fg"><label class="fl">{L('groups')}</label><input type="text" class="fi" bind:value={fGroups} placeholder={L('groupsHint')} /></div>
      <div class="fg"><label class="fl">{L('website')}</label><input type="url" class="fi" bind:value={fWeb} /></div>
      <div class="fg"><label class="fl">{L('wechat')}</label><input type="text" class="fi" bind:value={fWx} /></div>
      <div class="fg"><label class="fl">{L('qq')}</label><input type="text" class="fi" bind:value={fQq} /></div>
      <div class="fg"><label class="fl">{L('notes')}</label><textarea class="fi f-ta" bind:value={fNotes} rows={3}></textarea></div>
      <div class="f-act-inner">
        <button class="f-save" on:click={saveForm} disabled={!fName.trim()||_saving}>
          {_saving?L('loading'):L('save')}</button>
      </div>
    </div>
  {/if}
</div>

{#if _showDel && _contact}
  <div class="del-overlay" on:click|self={cancelDel}>
    <div class="del-box">
      <p>{L('confirmDelete')} "{_contact.name}"?</p>
      <div class="del-btns">
        <button on:click={cancelDel}>{L('cancel')}</button>
        <button class="del-ok" on:click={doDelete}>{L('delete')}</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .root{display:flex;flex-direction:column;height:100%;overflow:hidden;font-size:13px;}
  .center{display:flex;align-items:center;justify-content:center;height:100%;color:#888;}
  .toolbar{display:flex;align-items:center;gap:6px;padding:8px 10px;border-bottom:1px solid #e0e0e0;background:#f5f5f5;flex-shrink:0;}
  .s-in{flex:1;min-width:0;padding:6px 10px;border:1px solid #ddd;border-radius:6px;font-size:13px;outline:none;}
  .s-sel{padding:6px 4px;border:1px solid #ddd;border-radius:6px;font-size:12px;cursor:pointer;max-width:90px;}
  .btn-add{width:28px;height:28px;border:none;border-radius:6px;background:#3575f0;color:#fff;font-size:18px;cursor:pointer;flex-shrink:0;}
  .btn-fab{width:28px;height:28px;border:none;border-radius:6px;background:transparent;cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center;padding:0;color:#888;}
  .btn-fab:hover{background:#e8e8e8;color:#333;}
  .g-bar{display:flex;gap:6px;padding:6px 10px;overflow-x:auto;border-bottom:1px solid #eee;flex-shrink:0;}
  .g-tag{padding:2px 8px;border-radius:10px;font-size:11px;white-space:nowrap;cursor:pointer;border:1px solid #ddd;}
  .g-tag.active{background:#3575f0;color:#fff;border-color:#3575f0;}
  .c-list{flex:1;overflow-y:auto;}
  .c-item{display:flex;align-items:center;gap:10px;padding:10px;cursor:pointer;border-bottom:1px solid #eee;}
  .c-item:hover{background:rgba(0,0,0,.02);}
  .av-sm{width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:#3575f0;color:#fff;font-weight:600;font-size:14px;flex-shrink:0;}
  .av-lg{width:72px;height:72px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:#3575f0;color:#fff;font-weight:600;font-size:28px;}
  .c-info{flex:1;min-width:0;}
  .c-name{font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
  .c-brief{font-size:11px;color:#888;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:1px;}
  .c-tags{display:flex;gap:3px;flex-wrap:wrap;margin-top:2px;}
  .c-tag{font-size:10px;padding:1px 6px;border-radius:8px;background:#e8f0fe;color:#3575f0;}
  .d-head{display:flex;align-items:center;gap:8px;padding:8px 10px;border-bottom:1px solid #e0e0e0;background:#f5f5f5;flex-shrink:0;}
  .d-back,.d-ed,.d-del{padding:3px 10px;border:1px solid #ddd;border-radius:4px;cursor:pointer;font-size:12px;background:#fff;}
  .d-del:hover{background:#fce8e8;border-color:#e74c3c;color:#e74c3c;}
  .d-title{flex:1;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
  .d-body{flex:1;overflow-y:auto;padding:16px;}
  .d-av-row{display:flex;justify-content:center;margin-bottom:16px;}
  .d-row{display:flex;padding:6px 0;border-bottom:1px solid #f0f0f0;}
  .d-l{width:60px;flex-shrink:0;font-size:11px;color:#999;}
  .d-v{flex:1;word-break:break-all;}
  .d-v.b{font-weight:600;}
  .d-v.meta{font-size:11px;color:#bbb;}
  .d-gs{display:flex;gap:4px;flex-wrap:wrap;}
  .d-gt{font-size:11px;padding:1px 8px;border-radius:10px;background:#e8f0fe;color:#3575f0;}
  .link{color:#3575f0;text-decoration:none;cursor:pointer;}
  .link:hover{text-decoration:underline;}
  .link.copied{color:#27ae60;}
  .f-head{display:flex;align-items:center;gap:8px;padding:8px 10px;border-bottom:1px solid #e0e0e0;background:#f5f5f5;flex-shrink:0;}
  .f-title{flex:1;font-weight:600;}
  .f-cancel{padding:3px 10px;border:1px solid #ddd;border-radius:4px;cursor:pointer;font-size:12px;background:#fff;}
  .f-body{flex:1;overflow-y:auto;padding:12px 12px 0;}
  .fg{margin-bottom:12px;}
  .f-act-inner{display:flex;gap:8px;padding:12px 0 12px;border-top:1px solid #e0e0e0;}
  .f-save{flex:1;padding:10px;border:none;border-radius:6px;background:#3575f0;color:#fff;font-size:14px;font-weight:500;cursor:pointer;}
  .f-save:disabled{opacity:.5;cursor:not-allowed;}
  .fl{display:block;font-size:11px;color:#999;margin-bottom:3px;}
  .fi{width:100%;padding:7px 8px;border:1px solid #ddd;border-radius:5px;font-size:13px;outline:none;box-sizing:border-box;}
  .fi:focus{border-color:#3575f0;}
  .f-ta{resize:vertical;min-height:50px;}
  .f-err{font-size:11px;color:#e74c3c;margin-top:2px;}
  .av-up{display:flex;align-items:center;gap:8px;}
  .av-lab{display:flex;align-items:center;justify-content:center;width:56px;height:56px;border-radius:50%;border:2px dashed #ddd;cursor:pointer;font-size:20px;color:#ccc;overflow:hidden;}
  .av-lab.has-img{border-style:solid;border-color:#3575f0;}
  .av-lab img{width:100%;height:100%;object-fit:cover;}
  .av-rm{width:20px;height:20px;border:none;border-radius:50%;background:#e74c3c;color:#fff;cursor:pointer;font-size:10px;}
  .f-hidden{display:none;}
  .multi-row{display:flex;gap:4px;margin-bottom:4px;}
  .btn-rm{width:28px;height:28px;border:1px solid #ddd;border-radius:4px;background:#fff;color:#e74c3c;cursor:pointer;font-size:16px;flex-shrink:0;display:flex;align-items:center;justify-content:center;}
  .btn-rm:hover{background:#fce8e8;}
  .btn-add-more{padding:3px 8px;border:1px dashed #ddd;border-radius:4px;background:transparent;color:#3575f0;cursor:pointer;font-size:11px;margin-top:2px;}
  .btn-add-more:hover{background:#e8f0fe;border-color:#3575f0;}
  .toast{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#333;color:#fff;padding:8px 16px;border-radius:6px;font-size:13px;z-index:9999;box-shadow:0 2px 8px rgba(0,0,0,.3);animation:fadeIn .3s;}
  @keyframes fadeIn{from{opacity:0;transform:translateX(-50%) translateY(10px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
  .del-overlay{position:absolute;inset:0;background:rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;z-index:100;}
  .del-box{background:#fff;border-radius:8px;padding:20px;max-width:260px;width:90%;box-shadow:0 4px 20px rgba(0,0,0,.2);}
  .del-btns{display:flex;gap:8px;justify-content:flex-end;margin-top:12px;}
  .del-btns button{padding:6px 14px;border:1px solid #ddd;border-radius:4px;cursor:pointer;font-size:13px;background:#fff;}
  .del-ok{background:#e74c3c!important;color:#fff;border-color:#e74c3c!important;}
</style>
