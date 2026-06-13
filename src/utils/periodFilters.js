import { toISODate } from "./date.js";

export const PERIOD_FILTERS = [
  { value: "today", label: "Hoy" },
  { value: "week", label: "Esta semana" },
  { value: "month", label: "Este mes" },
  { value: "custom", label: "Rango" },
];

export function parseDateValue(value) {
  if (!value) return null;
  if (value instanceof Date) return startOfDay(value);
  if (typeof value.toDate === "function") return startOfDay(value.toDate());

  const text = String(value);
  const dateOnly = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (dateOnly) {
    return new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]));
  }

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : startOfDay(parsed);
}

export function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function endOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

export function getCurrentMonthRange(baseDate = new Date()) {
  const startDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
  const endDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0);

  return {
    startDate: toISODate(startDate),
    endDate: toISODate(endDate),
  };
}

export function getDateRange(filterType, customStartDate = "", customEndDate = "", baseDate = new Date()) {
  const today = startOfDay(baseDate);

  if (filterType === "today") {
    return {
      startDate: today,
      endDate: endOfDay(today),
      label: "hoy",
      metricLabel: "de hoy",
      periodText: formatDateShort(today),
      fileSegment: `hoy-${toISODate(today)}`,
      isValid: true,
    };
  }

  if (filterType === "week") {
    const weekday = (today.getDay() + 6) % 7;
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - weekday);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);

    return {
      startDate,
      endDate: endOfDay(endDate),
      label: "esta semana",
      metricLabel: "de esta semana",
      periodText: `${formatDateShort(startDate)} al ${formatDateShort(endDate)}`,
      fileSegment: `semana-${toISODate(startDate)}-a-${toISODate(endDate)}`,
      isValid: true,
    };
  }

  if (filterType === "custom") {
    const startDate = parseDateValue(customStartDate);
    const endDate = parseDateValue(customEndDate);
    const isValid = Boolean(startDate && endDate && startDate <= endDate);

    return {
      startDate,
      endDate: endDate ? endOfDay(endDate) : null,
      label: "período",
      metricLabel: "del período",
      periodText: isValid ? `${formatDateShort(startDate)} al ${formatDateShort(endDate)}` : "Rango personalizado",
      fileSegment: isValid ? `${toISODate(startDate)}-a-${toISODate(endDate)}` : "rango",
      isValid,
      error: startDate && endDate && startDate > endDate
        ? "La fecha desde no puede ser mayor que la fecha hasta."
        : "",
    };
  }

  const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
  const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const monthName = new Intl.DateTimeFormat("es-PY", { month: "long", year: "numeric" }).format(startDate);

  return {
    startDate,
    endDate: endOfDay(endDate),
    label: "este mes",
    metricLabel: "del mes",
    periodText: capitalize(monthName),
    fileSegment: `${monthName.toLowerCase().replace(/\s+/g, "-")}`,
    isValid: true,
  };
}

export function isDateInRange(value, range) {
  if (!range?.isValid) return false;
  const date = parseDateValue(value);
  if (!date) return false;
  return date >= range.startDate && date <= range.endDate;
}

export function formatDateShort(value) {
  const date = parseDateValue(value);
  if (!date) return "Sin fecha";
  return new Intl.DateTimeFormat("es-PY", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function capitalize(value = "") {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
