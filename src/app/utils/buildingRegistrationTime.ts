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


/** Report filters compare UTC instants while all entered clock values are Riyadh-local.
 * "To" includes the entire selected minute, not just its first second.
 */
export type BuildingRegistrationRecord = {
  registrationAt?: string | null;
  createdAt?: string | null;
};

export type BuildingRegistrationRange = {
  fromMs: number | null;
  toExclusiveMs: number | null;
  valid: boolean;
};

export const buildingRegistrationMillis = (record: BuildingRegistrationRecord): number | null => {
  const raw = record.registrationAt || record.createdAt;
  if (!raw) return null;
  const value = Date.parse(raw);
  return Number.isFinite(value) ? value : null;
};

export const getBuildingRegistrationRange = (from: string, to: string): BuildingRegistrationRange => {
  const startIso = from ? riyadhDateTimeInputToIso(from) : null;
  const endIso = to ? riyadhDateTimeInputToIso(to) : null;
  const fromMs = startIso ? Date.parse(startIso) : null;
  const toExclusiveMs = endIso ? Date.parse(endIso) + 60_000 : null;
  return {
    fromMs,
    toExclusiveMs,
    valid: (!from || fromMs !== null) && (!to || toExclusiveMs !== null) &&
      (fromMs === null || toExclusiveMs === null || fromMs < toExclusiveMs),
  };
};

export const matchesBuildingRegistrationRange = (
  record: BuildingRegistrationRecord, range: BuildingRegistrationRange,
): boolean => {
  if (!range.valid) return false;
  if (range.fromMs === null && range.toExclusiveMs === null) return true;
  const value = buildingRegistrationMillis(record);
  return value !== null &&
    (range.fromMs === null || value >= range.fromMs) &&
    (range.toExclusiveMs === null || value < range.toExclusiveMs);
};

export const compareBuildingRegistrationTime = (
  first: BuildingRegistrationRecord, second: BuildingRegistrationRecord, direction: 'asc' | 'desc',
): number => {
  const left = buildingRegistrationMillis(first);
  const right = buildingRegistrationMillis(second);
  // Records without timestamps remain at the end, regardless of direction.
  if (left === null) return right === null ? 0 : 1;
  if (right === null) return -1;
  return direction === 'asc' ? left - right : right - left;
};
