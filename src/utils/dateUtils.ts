export type DateType = 'gregorian' | 'hijri';

const HIJRI_DATE_PATTERN = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/;
const GREGORIAN_DATE_PATTERN = /^(\d{4})-(\d{1,2})-(\d{1,2})/;

const pad2 = (value: string | number) => String(value).padStart(2, '0');

export const normalizeHijriInput = (value: string) => {
  return value
    .replace(/[^0-9/\-]/g, '')
    .replaceAll('-', '/')
    .slice(0, 10);
};

export const normalizeFlexibleDateForInput = (
  value?: string | Date | null,
  type: DateType = 'gregorian'
) => {
  if (!value) return '';

  const rawValue = value instanceof Date ? value.toISOString() : String(value).trim();
  if (!rawValue) return '';

  if (type === 'hijri') {
    const match = rawValue.match(HIJRI_DATE_PATTERN);
    if (!match) return normalizeHijriInput(rawValue);

    const [, year, month, day] = match;
    return `${year}/${pad2(month)}/${pad2(day)}`;
  }

  const match = rawValue.match(GREGORIAN_DATE_PATTERN);
  if (match) {
    const [, year, month, day] = match;
    return `${year}-${pad2(month)}-${pad2(day)}`;
  }

  const parsed = new Date(rawValue);
  if (Number.isNaN(parsed.getTime())) return rawValue;

  return [
    parsed.getFullYear(),
    pad2(parsed.getMonth() + 1),
    pad2(parsed.getDate()),
  ].join('-');
};

export const formatFlexibleDate = (
  value?: string | Date | null,
  type: DateType = 'gregorian',
  language: 'ar' | 'en' = 'ar'
) => {
  if (!value) return '-';

  const rawValue = value instanceof Date ? value.toISOString() : String(value).trim();
  if (!rawValue) return '-';

  if (type === 'hijri') {
    const normalized = normalizeFlexibleDateForInput(rawValue, 'hijri');
    if (!normalized) return '-';
    return language === 'en' ? `${normalized} AH` : `${normalized}هـ`;
  }

  try {
    const normalized = normalizeFlexibleDateForInput(rawValue, 'gregorian');
    const match = normalized.match(GREGORIAN_DATE_PATTERN);

    if (!match) return rawValue;

    const [, year, month, day] = match;
    const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 12, 0, 0));

    if (Number.isNaN(date.getTime())) return rawValue;

    const locale = language === 'en' ? 'en-GB-u-ca-gregory-nu-latn' : 'ar-SA-u-ca-gregory';
    const formatted = new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: 'UTC',
    }).format(date);

    return language === 'en' ? formatted : `${formatted}م`;
  } catch {
    return rawValue;
  }
};

export const isValidFlexibleDate = (value: string, type: DateType = 'gregorian') => {
  if (!value) return true;

  if (type === 'hijri') {
    const match = value.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})$/);
    if (!match) return false;

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);

    return (
      year >= 1200 &&
      year <= 1700 &&
      month >= 1 &&
      month <= 12 &&
      day >= 1 &&
      day <= 30
    );
  }

  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
};

export const getFlexibleDateType = (record: any, key: string): DateType => {
  const typeKey = `${key}Type`;
  const declaredType = record?.[typeKey];
  const rawValue = record?.[key];

  if (declaredType === 'hijri') return 'hijri';

  if (rawValue) {
    const raw = rawValue instanceof Date ? rawValue.toISOString() : String(rawValue).trim();
    const match = raw.match(/^(\d{4})[-/]/);
    const year = match ? Number(match[1]) : NaN;

    if (Number.isFinite(year) && year >= 1200 && year <= 1700) {
      return 'hijri';
    }
  }

  return 'gregorian';
};
