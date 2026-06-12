import { toISODate } from "./date.js";
import {
  getDatesInRange,
  getUnavailableDatesInRange as getUnavailableRangeDates,
  isPastDay,
  isRangeAvailable as getRangeAvailability,
} from "./booking.js";

export const availabilityLabels = {
  available: "Disponible",
  reserved: "Reservado",
  partial: "Parcial",
  preReserved: "Pre-reservado",
  blocked: "Bloqueado",
  past: "Pasado",
};

export const unavailableReasons = {
  reserved: "Fecha reservada",
  partial: "Ocupacion parcial",
  preReserved: "Fecha pre-reservada",
  blocked: "Fecha bloqueada",
  past: "Fecha pasada",
  invalid: "Fecha inválida",
};

function normalizeDateValue(value) {
  if (!value) return "";
  if (value instanceof Date) return toISODate(value);
  return String(value).slice(0, 10);
}

export function getTodayISO() {
  return toISODate(new Date());
}

export function normalizeAvailabilityData(availabilityData = {}) {
  if (Array.isArray(availabilityData)) {
    return availabilityData.reduce(
      (accumulator, item) => {
        if (item?.date && accumulator[item.status]) {
          accumulator[item.status].push(item.date);
        }
        return accumulator;
      },
      { reserved: [], preReserved: [], blocked: [], partial: [] },
    );
  }

  return {
    reserved: availabilityData.reserved || [],
    preReserved: availabilityData.preReserved || [],
    blocked: availabilityData.blocked || [],
    partial: availabilityData.partial || [],
  };
}

export function getAvailabilityStatus(dateValue, availabilityData) {
  const isoDate = normalizeDateValue(dateValue);
  const availability = normalizeAvailabilityData(availabilityData);

  if (!isoDate) return "invalid";
  if (isPastDay(isoDate)) return "past";
  if (availability.reserved.includes(isoDate)) return "reserved";
  if (availability.preReserved.includes(isoDate)) return "preReserved";
  if (availability.blocked.includes(isoDate)) return "blocked";
  if (availability.partial.includes(isoDate)) return "partial";
  return "available";
}

export function getDateAvailability(dateValue, availabilityData) {
  const status = getAvailabilityStatus(dateValue, availabilityData);
  const selectable = status === "available" || status === "partial";

  return {
    status,
    selectable,
    label: availabilityLabels[status] || availabilityLabels.available,
    reason: selectable ? "" : unavailableReasons[status] || unavailableReasons.invalid,
  };
}

export function isDateSelectable(dateValue, availabilityData) {
  return getDateAvailability(dateValue, availabilityData).selectable;
}

export function getUnavailableReason(dateValue, availabilityData) {
  return getDateAvailability(dateValue, availabilityData).reason;
}

export { getDatesInRange };

export function getUnavailableDatesInRange(startDate, endDate, availabilityData) {
  return getUnavailableRangeDates(startDate, endDate, normalizeAvailabilityData(availabilityData));
}

export function isRangeAvailable(startDate, endDate, availabilityData) {
  return getRangeAvailability(startDate, endDate, normalizeAvailabilityData(availabilityData));
}

export function getFirstAvailabilityMonth(availabilityData) {
  const availability = normalizeAvailabilityData(availabilityData);
  const today = getTodayISO();
  const futureDates = [
    ...availability.reserved,
    ...availability.preReserved,
    ...availability.blocked,
    ...availability.partial,
  ]
    .filter((date) => date >= today)
    .sort();
  const baseDate = futureDates[0] || today;
  const date = new Date(`${baseDate}T12:00:00`);

  return {
    year: date.getFullYear(),
    month: date.getMonth(),
  };
}
