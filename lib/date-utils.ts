const dateOnlyPattern = /^(\d{4})-(\d{2})-(\d{2})/;

function getSimpleDateParts(value: string | null) {
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

function getTodayWithoutTime() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return today;
}

function getSimpleDateAtNoon(value: string | null) {
  const parts = getSimpleDateParts(value);

  if (!parts) {
    return null;
  }

  return new Date(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    12
  );
}

export function formatSimpleDate(value: string | null) {
  const parts = getSimpleDateParts(value);

  if (!parts) {
    return value || "-";
  }

  return `${parts.day}/${parts.month}/${parts.year}`;
}

export function getDateInputValue(value: string | null) {
  const parts = getSimpleDateParts(value);

  if (!parts) {
    return "";
  }

  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function getSimpleDateTime(value: string | null) {
  return getSimpleDateAtNoon(value)?.getTime() ?? Number.POSITIVE_INFINITY;
}

export function getDaysUntilSimpleDate(value: string | null) {
  const date = getSimpleDateAtNoon(value);

  if (!date) {
    return null;
  }

  const today = getTodayWithoutTime();
  const millisecondsPerDay = 1000 * 60 * 60 * 24;

  return Math.round((date.getTime() - today.getTime()) / millisecondsPerDay);
}

export function isBeforeTodayDateOnly(value: string | null) {
  const daysUntilDate = getDaysUntilSimpleDate(value);

  return daysUntilDate !== null && daysUntilDate < 0;
}

export function isTodayOrFutureDateOnly(value: string | null) {
  const daysUntilDate = getDaysUntilSimpleDate(value);

  return daysUntilDate !== null && daysUntilDate >= 0;
}

export function isBetweenTodayAndFutureDays(value: string | null, days: number) {
  const daysUntilDate = getDaysUntilSimpleDate(value);

  return daysUntilDate !== null && daysUntilDate >= 0 && daysUntilDate <= days;
}
