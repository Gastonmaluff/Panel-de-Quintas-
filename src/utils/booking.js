import { toISODate } from "./date.js";

export const bookingModeLabels = {
  day: "Turno día",
  night: "Turno noche",
  multi_day: "Varios días",
};

export const bookingTimes = ["07:00", "19:00"];

const blockingStatuses = new Set(["confirmada", "pre-reserva", "seña pendiente", "bloqueada"]);

export function addDaysISO(dateValue, days) {
  if (!dateValue) return "";
  const date = new Date(`${dateValue}T12:00:00`);
  date.setDate(date.getDate() + days);
  return toISODate(date);
}

export function getDatesInRange(startDate, endDate) {
  if (!startDate || !endDate || endDate < startDate) return [];

  const dates = [];
  const cursor = new Date(`${startDate}T12:00:00`);
  const end = new Date(`${endDate}T12:00:00`);

  while (cursor <= end) {
    dates.push(toISODate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return dates;
}

function getModeFromLegacyTimeSlot(timeSlot = "") {
  const normalized = timeSlot.toLowerCase();

  if (normalized.includes("noche")) return "night";
  if (normalized.includes("fin")) return "multi_day";
  return "day";
}

export function getBookingModeFromReservation(reservation) {
  return reservation.bookingMode || getModeFromLegacyTimeSlot(reservation.timeSlot);
}

export function normalizeBooking(reservation = {}) {
  const bookingMode = getBookingModeFromReservation(reservation);
  const startDate = reservation.startDate || reservation.eventDate || "";
  const startTime =
    reservation.startTime || (bookingMode === "night" ? "19:00" : "07:00");
  const fallbackEndDate =
    bookingMode === "night" ? addDaysISO(startDate, 1) : reservation.eventDate || startDate;
  const endDate = reservation.endDate || fallbackEndDate;
  const endTime =
    reservation.endTime || (bookingMode === "night" ? "07:00" : "19:00");

  return {
    ...reservation,
    startDate,
    startTime,
    endDate,
    endTime,
    bookingMode,
    eventDate: reservation.eventDate || startDate,
    timeSlot: reservation.timeSlot || bookingModeLabels[bookingMode],
  };
}

export function applyBookingMode(values, bookingMode, startDate = values.startDate) {
  if (bookingMode === "night") {
    return {
      ...values,
      bookingMode,
      startDate,
      startTime: "19:00",
      endDate: startDate ? addDaysISO(startDate, 1) : "",
      endTime: "07:00",
    };
  }

  if (bookingMode === "multi_day") {
    return {
      ...values,
      bookingMode,
      startDate,
      startTime: values.startTime || "07:00",
      endDate: values.endDate && values.endDate >= startDate ? values.endDate : startDate,
      endTime: values.endTime || "19:00",
    };
  }

  return {
    ...values,
    bookingMode: "day",
    startDate,
    startTime: "07:00",
    endDate: startDate,
    endTime: "19:00",
  };
}

export function getReservationDates(reservation) {
  const booking = normalizeBooking(reservation);
  return getDatesInRange(booking.startDate, booking.endDate);
}

export function reservationBlocksAvailability(reservation) {
  return blockingStatuses.has(reservation.status);
}

export function buildAvailabilityFromReservations(reservations, excludedReservationId = "") {
  const availability = { reserved: new Set(), preReserved: new Set(), blocked: new Set() };

  reservations.forEach((reservation) => {
    if (reservation.id === excludedReservationId || !reservationBlocksAvailability(reservation)) {
      return;
    }

    const target =
      reservation.status === "bloqueada"
        ? availability.blocked
        : reservation.status === "pre-reserva"
          ? availability.preReserved
          : availability.reserved;

    getReservationDates(reservation).forEach((date) => target.add(date));
  });

  return {
    reserved: [...availability.reserved],
    preReserved: [...availability.preReserved],
    blocked: [...availability.blocked],
  };
}

export function getUnavailableDatesInRange(startDate, endDate, availability) {
  const unavailable = new Set([
    ...(availability?.reserved || []),
    ...(availability?.preReserved || []),
    ...(availability?.blocked || []),
  ]);

  return getDatesInRange(startDate, endDate).filter((date) => unavailable.has(date));
}

export function isRangeAvailable(startDate, endDate, availability) {
  return Boolean(startDate && endDate && endDate >= startDate) &&
    getUnavailableDatesInRange(startDate, endDate, availability).length === 0;
}

export function formatDateTimeShort(dateValue, timeValue) {
  if (!dateValue) return "Sin fecha";
  const [year, month, day] = dateValue.split("-");
  return `${day}/${month}/${year} - ${timeValue || "--:--"}`;
}

export function formatBookingRange(reservation) {
  const booking = normalizeBooking(reservation);
  return {
    start: formatDateTimeShort(booking.startDate, booking.startTime),
    end: formatDateTimeShort(booking.endDate, booking.endTime),
  };
}

export function getBookingDurationLabel(reservation) {
  const dates = getReservationDates(reservation);
  if (dates.length <= 1) return "1 día";
  return `${dates.length} días`;
}
