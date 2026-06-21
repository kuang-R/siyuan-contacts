// Plugin constants

export const PLUGIN_NAME = 'siyuan-contacts';
export const CONTACTS_NOTEBOOK_NAME = '通讯录';
export const CONTACTS_NOTEBOOK_NAME_EN = 'Contacts';
export const CONTACTS_ROOT_PATH = '/';

// Attribute prefix used by SiYuan for custom block attributes
export const ATTR_PREFIX = 'custom-contact-';

// Contact attribute keys (field names without prefix)
export const CONTACT_FIELDS = [
  'name',
  'phone',
  'email',
  'birthday',
  'address',
  'org',
  'notes',
  'groups',
  'avatar',
  'website',
  'wechat',
  'qq',
] as const;

export type ContactField = (typeof CONTACT_FIELDS)[number];

// Full attribute keys (with prefix) as used in SiYuan block IAL
export const ATTR_KEYS: Record<ContactField | 'created' | 'updated', string> = {
  name: `${ATTR_PREFIX}name`,
  phone: `${ATTR_PREFIX}phone`,
  email: `${ATTR_PREFIX}email`,
  birthday: `${ATTR_PREFIX}birthday`,
  address: `${ATTR_PREFIX}address`,
  org: `${ATTR_PREFIX}org`,
  notes: `${ATTR_PREFIX}notes`,
  groups: `${ATTR_PREFIX}groups`,
  avatar: `${ATTR_PREFIX}avatar`,
  website: `${ATTR_PREFIX}website`,
  wechat: `${ATTR_PREFIX}wechat`,
  qq: `${ATTR_PREFIX}qq`,
  created: `${ATTR_PREFIX}created`,
  updated: `${ATTR_PREFIX}updated`,
};

// Sort modes for the contact list
export enum ContactSortMode {
  NAME_ASC = 'name_asc',
  NAME_DESC = 'name_desc',
  CREATED_DESC = 'created_desc',
  UPDATED_DESC = 'updated_desc',
}

// Dock panel configuration
export const DOCK_CONFIG = {
  position: 'LeftBottom' as const,
  size: { width: 320, height: 420 },
  icon: 'iconAccount',
  title: 'Contacts',
};

// Debounce delay for search input (ms)
export const SEARCH_DEBOUNCE_MS = 300;

// Maximum avatar size in bytes (64KB)
export const MAX_AVATAR_SIZE = 64 * 1024;
