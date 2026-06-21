/**
 * Contact data model interfaces.
 */

export interface Contact {
  /** SiYuan block ID (root block of the contact document) */
  id: string;

  /** Display name */
  name: string;

  /** Phone number(s) — comma-separated string from storage */
  phone: string;

  /** Email address(es) — comma-separated string from storage */
  email: string;

  /** Birthday in ISO format (YYYY-MM-DD) */
  birthday: string;

  /** Physical/postal address */
  address: string;

  /** Organization / company */
  org: string;

  /** Free-form notes (may contain markdown) */
  notes: string;

  /** Group tags parsed from comma-separated storage string */
  groups: string[];

  /** Avatar — base64 data URI or empty string */
  avatar: string;

  /** Website URL */
  website: string;

  /** WeChat ID */
  wechat: string;

  /** QQ number */
  qq: string;

  /** ISO timestamp of when the contact was created */
  created: string;

  /** ISO timestamp of last modification */
  updated: string;

  /** Resolved avatar URL for <img> src (computed) */
  avatarUrl: string;

  /** First character(s) for avatar fallback (computed) */
  initials: string;
}

/**
 * Form data structure used by ContactForm.
 * Matches raw input values before conversion to Contact.
 */
export interface ContactFormData {
  name: string;
  phone: string;
  email: string;
  birthday: string;
  address: string;
  org: string;
  notes: string;
  groups: string;   // comma-separated string from text input
  avatar: string;   // base64 data URI
  website: string;
  wechat: string;
  qq: string;
}

/**
 * Default empty form data.
 */
export function emptyFormData(): ContactFormData {
  return {
    name: '',
    phone: '',
    email: '',
    birthday: '',
    address: '',
    org: '',
    notes: '',
    groups: '',
    avatar: '',
    website: '',
    wechat: '',
    qq: '',
  };
}

/**
 * Convert a Contact to ContactFormData for editing.
 */
export function contactToFormData(c: Contact): ContactFormData {
  return {
    name: c.name,
    phone: c.phone,
    email: c.email,
    birthday: c.birthday,
    address: c.address,
    org: c.org,
    notes: c.notes,
    groups: c.groups.join(', '),
    avatar: c.avatar,
    website: c.website,
    wechat: c.wechat,
    qq: c.qq,
  };
}
