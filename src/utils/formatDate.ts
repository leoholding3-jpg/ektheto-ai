import type { AppLanguage } from '../types';

const LOCALE_MAP: Record<AppLanguage, string> = {
  en: 'en-US',
  pt: 'pt-PT',
  es: 'es-ES',
};

const NOT_AVAILABLE: Record<AppLanguage, string> = {
  en: 'not available',
  pt: 'não disponível',
  es: 'no disponible',
};

export function formatDateLocalized(
  isoOrRaw: string | null | undefined,
  lang: AppLanguage = 'en'
): string {
  if (
    !isoOrRaw ||
    isoOrRaw === 'não disponível' ||
    isoOrRaw === 'not available' ||
    isoOrRaw === 'no disponible'
  ) {
    return NOT_AVAILABLE[lang];
  }
  const parsed = new Date(isoOrRaw);
  if (Number.isNaN(parsed.getTime())) return isoOrRaw;
  return new Intl.DateTimeFormat(LOCALE_MAP[lang], {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed);
}

export function formatRelativeLocalized(
  isoOrRaw: string | null | undefined,
  lang: AppLanguage = 'en'
): string {
  if (!isoOrRaw) return NOT_AVAILABLE[lang];
  const parsed = new Date(isoOrRaw);
  if (Number.isNaN(parsed.getTime())) return isoOrRaw;
  const diffMs = Date.now() - parsed.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (lang === 'en') {
    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays <= 7) return `${diffDays}d ago`;
    return formatDateLocalized(isoOrRaw, lang);
  }

  if (lang === 'es') {
    if (diffMin < 1) return 'ahora mismo';
    if (diffMin < 60) return `hace ${diffMin} min`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `hace ${diffHours} h`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays <= 7) return `hace ${diffDays} d`;
    return formatDateLocalized(isoOrRaw, lang);
  }

  if (diffMin < 1) return 'agora mesmo';
  if (diffMin < 60) return `há ${diffMin} min`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `há ${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays <= 7) return `há ${diffDays}d`;
  return formatDateLocalized(isoOrRaw, lang);
}
