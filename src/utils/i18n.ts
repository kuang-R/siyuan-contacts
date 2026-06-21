import zhCN from '../../i18n/zh_CN.json';
import enUS from '../../i18n/en_US.json';

type Lang = 'zh_CN' | 'en_US';

const messages: Record<Lang, Record<string, string>> = {
  zh_CN: zhCN as Record<string, string>,
  en_US: enUS as Record<string, string>,
};

let currentLang: Lang = 'zh_CN';

/**
 * Set the current language. Called during plugin onload.
 */
export function setLang(lang: string): void {
  if (lang === 'en_US' || lang === 'zh_CN') {
    currentLang = lang;
  }
}

/**
 * Get a translated string by key.
 * Falls back to the key itself if translation is missing.
 */
export function t(key: string): string {
  return messages[currentLang]?.[key] ?? key;
}

/** Alias for t() — unified i18n call across all files */
export const L = t;

/**
 * Get the current language code.
 */
export function getLang(): Lang {
  return currentLang;
}
