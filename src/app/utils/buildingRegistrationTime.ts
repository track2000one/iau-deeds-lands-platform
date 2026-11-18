/** Central-building registration uses Asia/Riyadh (UTC+03:00) in the form.
 * ISO UTC strings remain the only values transmitted to the backend.
 * The audit creation timestamp is separate and immutable.
 */
const RIYADH_TIMEZONE = 'Asia/Riyadh';

export const formatBuildingRegistrationTime = (value?: string | null): string => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('ar-SA-u-ca-gregory', {
    timeZone: RIYADH_TIMEZONE,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: true,
  }).format(date);
};

export const toRiyadhDateTimeInput = (value?: string | null): string => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: RIYADH_TIMEZONE,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(date);
  const formatted = Object.fromEntries(parts.map(({ type, value: part }) => [type, part]));
  return `${formatted.year}-${formatted.month}-${formatted.day}T${formatted.hour}:${formatted.minute}`;
};

/** Returns null when date/time is invalid; no implicit device-timezone conversion. */
export const riyadhDateTimeInputToIso = (value: string): string | null => {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const result = new Date(`${value}:00+03:00`);
  if (Number.isNaN(result.getTime())) return null;
  const iso = result.toISOString();
  return toRiyadhDateTimeInput(iso) === value ? iso : null;
};
