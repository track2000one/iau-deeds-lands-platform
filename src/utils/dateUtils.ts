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

/**
 * Returns the calendar date exactly as a form field expects it.
 *
 * Important: historical Hijri values may have been persisted by the backend in
 * a DateTime column, producing values such as `1445-05-19T00:00:00.000Z`.
 * When the accompanying *DateType is `hijri`, the year/month/day components are
 * therefore treated as the original Hijri document date and MUST NOT be passed
 * through JavaScript Date conversion.
 */
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
  type: DateType = 'gregorian'
) => {
  if (!value) return '-';

  const rawValue = value instanceof Date ? value.toISOString() : String(value).trim();
  if (!rawValue) return '-';

  if (type === 'hijri') {
    const normalized = normalizeFlexibleDateForInput(rawValue, 'hijri');
    return normalized ? `${normalized}هـ` : '-';
  }

  try {
    // Extract the document date first instead of allowing the local timezone to
    // move a UTC-midnight value to another calendar day.
    const normalized = normalizeFlexibleDateForInput(rawValue, 'gregorian');
    const match = normalized.match(GREGORIAN_DATE_PATTERN);

    if (!match) return rawValue;

    const [, year, month, day] = match;
    const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 12, 0, 0));

    if (Number.isNaN(date.getTime())) return rawValue;

    return new Intl.DateTimeFormat('ar-SA-u-ca-gregory', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: 'UTC',
    }).format(date);
  } catch {
    return rawValue;
  }
};

export const getFlexibleDateType = (record: any, key: string): DateType => {
  const typeKey = `${key}Type`;
  const value = record?.[typeKey];

  return value === 'hijri' ? 'hijri' : 'gregorian';
};
