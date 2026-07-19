export type DateType = 'gregorian' | 'hijri';

export type FlexibleDateValue = {
  value: string;
  type: DateType;
};

export const emptyFlexibleDate: FlexibleDateValue = {
  value: '',
  type: 'gregorian',
};

export const normalizeHijriInput = (value: string) => {
  return value
    .replace(/[^0-9/\\-]/g, '')
    .replaceAll('-', '/')
    .slice(0, 10);
};

export const formatFlexibleDate = (
  value?: string,
  type: DateType = 'gregorian'
) => {
  if (!value) return '-';

  if (type === 'hijri') {
    return `${value}هـ`;
  }

  try {
    return new Date(value).toLocaleDateString('ar-SA-u-ca-gregory');
  } catch {
    return value;
  }
};

export const flexibleDateToStorage = (
  value?: string,
  type: DateType = 'gregorian'
) => {
  return {
    value: value || '',
    type,
  };
};

export const getDateValue = (date: string | FlexibleDateValue | undefined | null) => {
  if (!date) return '';

  if (typeof date === 'string') {
    return date;
  }

  return date.value || '';
};

export const getDateType = (date: string | FlexibleDateValue | undefined | null) => {
  if (!date || typeof date === 'string') {
    return 'gregorian' as DateType;
  }

  return date.type || 'gregorian';
};
