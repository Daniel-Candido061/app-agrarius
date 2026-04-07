const dateOnlyPattern = /^(\d{4})-(\d{2})-(\d{2})/;

function getDateOnlyParts(value: string | null) {
  const match = value?.match(dateOnlyPattern);

  if (!match) {
    return null;
  }

  const [, year, month, day] = match;

  return {
    year,
    month,
    day,
  };
}

function getLocalDateOnly(value: string | null) {
  const parts = getDateOnlyParts(value);

  if (!parts) {
    return null;
  }

  const date = new Date(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day)
  );

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function getTodayWithoutTime() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return today;
}

export function formatDateOnly(value: string | null) {
  const parts = getDateOnlyParts(value);

  if (!parts) {
    return value || "-";
  }

  return `${parts.day}/${parts.month}/${parts.year}`;
}

export function getDateInputValue(value: string | null) {
  const parts = getDateOnlyParts(value);

  if (!parts) {
    return "";
  }

  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function getDaysUntilDateOnly(value: string | null) {
  const date = getLocalDateOnly(value);

  if (!date) {
    return null;
  }

  const today = getTodayWithoutTime();
  const millisecondsPerDay = 1000 * 60 * 60 * 24;

  return Math.round((date.getTime() - today.getTime()) / millisecondsPerDay);
}

export function isBeforeTodayDateOnly(value: string | null) {
  const daysUntilDate = getDaysUntilDateOnly(value);

  return daysUntilDate !== null && daysUntilDate < 0;
}

export function isBetweenTodayAndFutureDays(value: string | null, days: number) {
  const daysUntilDate = getDaysUntilDateOnly(value);

  return daysUntilDate !== null && daysUntilDate >= 0 && daysUntilDate <= days;
}
