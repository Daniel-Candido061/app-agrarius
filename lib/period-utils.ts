const dateOnlyPattern = /^(\d{4})-(\d{2})-(\d{2})/;
const brazilTimeZone = "America/Sao_Paulo";

export const periodOptions = [
  { value: "semana", label: "Semana" },
  { value: "mes", label: "Mês" },
  { value: "trimestre", label: "Trimestre" },
  { value: "semestre", label: "Semestre" },
  { value: "ano", label: "Ano" },
] as const;

export type PeriodValue = (typeof periodOptions)[number]["value"];

export const defaultPeriodValue: PeriodValue = "mes";

function getSaoPauloDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: brazilTimeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  return {
    year: Number(parts.find((part) => part.type === "year")?.value ?? 0),
    month: Number(parts.find((part) => part.type === "month")?.value ?? 1),
    day: Number(parts.find((part) => part.type === "day")?.value ?? 1),
  };
}

function getDateOnlyAtNoon(value: string | null) {
  const match = value?.match(dateOnlyPattern);

  if (!match) {
    return null;
  }

  const [, year, month, day] = match;

  return new Date(Number(year), Number(month) - 1, Number(day), 12);
}

function getCurrentPeriodRange(period: PeriodValue) {
  const todayParts = getSaoPauloDateParts(new Date());
  const today = new Date(
    todayParts.year,
    todayParts.month - 1,
    todayParts.day,
    12
  );

  if (period === "semana") {
    const startDate = new Date(today);
    const daysSinceMonday = today.getDay() === 0 ? 6 : today.getDay() - 1;
    startDate.setDate(today.getDate() - daysSinceMonday);

    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);

    return {
      startDate,
      endDate,
    };
  }

  if (period === "trimestre") {
    const quarterStartMonth = Math.floor((todayParts.month - 1) / 3) * 3;

    return {
      startDate: new Date(todayParts.year, quarterStartMonth, 1, 12),
      endDate: new Date(todayParts.year, quarterStartMonth + 3, 0, 12),
    };
  }

  if (period === "semestre") {
    const semesterStartMonth = todayParts.month <= 6 ? 0 : 6;

    return {
      startDate: new Date(todayParts.year, semesterStartMonth, 1, 12),
      endDate: new Date(todayParts.year, semesterStartMonth + 6, 0, 12),
    };
  }

  if (period === "ano") {
    return {
      startDate: new Date(todayParts.year, 0, 1, 12),
      endDate: new Date(todayParts.year, 11, 31, 12),
    };
  }

  return {
    startDate: new Date(todayParts.year, todayParts.month - 1, 1, 12),
    endDate: new Date(todayParts.year, todayParts.month, 0, 12),
  };
}

export function getPeriodValue(value: string | string[] | null | undefined) {
  const normalizedValue = Array.isArray(value) ? value[0] : value;

  return periodOptions.some((option) => option.value === normalizedValue)
    ? (normalizedValue as PeriodValue)
    : defaultPeriodValue;
}

export function getPeriodLabel(period: PeriodValue) {
  return (
    periodOptions.find((option) => option.value === period)?.label ??
    periodOptions.find((option) => option.value === defaultPeriodValue)?.label ??
    "Mês"
  );
}

export function isDateInPeriod(value: string | null, period: PeriodValue) {
  const date = getDateOnlyAtNoon(value);

  if (!date) {
    return false;
  }

  const { startDate, endDate } = getCurrentPeriodRange(period);

  return date >= startDate && date <= endDate;
}
