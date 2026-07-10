const DEFAULT_CLINIC_TIME_ZONE = 'Africa/Casablanca';

export function getClinicTimeZone(): string {
  return process.env.CLINIC_TIME_ZONE || DEFAULT_CLINIC_TIME_ZONE;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function parseDateInput(date: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return null;

  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

function parseTimeInput(time: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(time);
  if (!match) return null;

  return {
    hour: Number(match[1]),
    minute: Number(match[2]),
  };
}

function getZonedParts(date: Date, timeZone = getClinicTimeZone()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, Number(part.value)]),
  );

  return {
    year: values.year,
    month: values.month,
    day: values.day,
    hour: values.hour,
    minute: values.minute,
    second: values.second,
  };
}

function getTimeZoneOffsetMs(date: Date, timeZone = getClinicTimeZone()): number {
  const parts = getZonedParts(date, timeZone);
  const zonedAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );

  return zonedAsUtc - date.getTime();
}

export function zonedTimeToUtc(date: string, time: string, timeZone = getClinicTimeZone()): Date | null {
  const dateParts = parseDateInput(date);
  const timeParts = parseTimeInput(time);

  if (!dateParts || !timeParts) return null;
  if (
    dateParts.month < 1 ||
    dateParts.month > 12 ||
    dateParts.day < 1 ||
    dateParts.day > 31 ||
    timeParts.hour > 23 ||
    timeParts.minute > 59
  ) {
    return null;
  }

  const localAsUtc = new Date(
    Date.UTC(
      dateParts.year,
      dateParts.month - 1,
      dateParts.day,
      timeParts.hour,
      timeParts.minute,
      0,
      0,
    ),
  );

  const offset = getTimeZoneOffsetMs(localAsUtc, timeZone);
  const candidate = new Date(localAsUtc.getTime() - offset);
  const adjustedOffset = getTimeZoneOffsetMs(candidate, timeZone);

  return new Date(localAsUtc.getTime() - adjustedOffset);
}

export function zonedDateInput(date: Date, timeZone = getClinicTimeZone()): string {
  const parts = getZonedParts(date, timeZone);
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
}

export function zonedTimeInput(date: Date, timeZone = getClinicTimeZone()): string {
  const parts = getZonedParts(date, timeZone);
  return `${pad(parts.hour)}:${pad(parts.minute)}`;
}

export function zonedDayRange(date: string, timeZone = getClinicTimeZone()) {
  const dateParts = parseDateInput(date);
  if (!dateParts) return null;

  const start = zonedTimeToUtc(date, '00:00', timeZone);
  if (!start) return null;

  const nextLocalDay = new Date(Date.UTC(dateParts.year, dateParts.month - 1, dateParts.day + 1));
  const nextDate = `${nextLocalDay.getUTCFullYear()}-${pad(nextLocalDay.getUTCMonth() + 1)}-${pad(
    nextLocalDay.getUTCDate(),
  )}`;
  const nextStart = zonedTimeToUtc(nextDate, '00:00', timeZone);
  if (!nextStart) return null;

  return {
    start,
    end: new Date(nextStart.getTime() - 1),
  };
}
