export type DateType = 'gregorian' | 'hijri';

export const normalizeHijriInput = (value: string) => {
  return value
    .replace(/[^0-9/\-]/g, '')
    .replaceAll('-', '/')
    .slice(0, 10);
};

export const formatFlexibleDate = (
  value?: string | Date | null,
  type: DateType = 'gregorian'
) => {
  if (!value) return '-';

  const rawValue = value instanceof Date ? value.toISOString() : String(value);

  if (!rawValue) return '-';

  if (type === 'hijri') {
    return `${rawValue}هـ`;
  }

  try {
    const date = new Date(rawValue);
    if (Number.isNaN(date.getTime())) return rawValue;
    return date.toLocaleDateString('ar-SA-u-ca-gregory');
  } catch {
    return rawValue;
  }
};

export const getFlexibleDateType = (record: any, key: string): DateType => {
  const typeKey = `${key}Type`;
  const value = record?.[typeKey];

  return value === 'hijri' ? 'hijri' : 'gregorian';
};
