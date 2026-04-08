const dateOnlyPattern = /^(\d{4})-(\d{2})-(\d{2})/;
const brazilTimeZone = "America/Sao_Paulo";

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

function getSaoPauloDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: brazilTimeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  return {
    year: parts.find((part) => part.type === "year")?.value ?? "",
    month: parts.find((part) => part.type === "month")?.value ?? "",
    day: parts.find((part) => part.type === "day")?.value ?? "",
  };
}

function getTodayWithoutTime() {
  const todayParts = getSaoPauloDateParts(new Date());
  const today = new Date(
    Number(todayParts.year),
    Number(todayParts.month) - 1,
    Number(todayParts.day),
    12
  );

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

export function formatSimpleDateTime(value: string | null) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: brazilTimeZone,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
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
