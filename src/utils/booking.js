import { toISODate } from "./date.js";

export const bookingModeLabels = {
  day: "Turno dia",
  night: "Turno noche",
  multi_day: "Varios dias",
};

export const bookingModeDetailLabels = {
  day: "Turno dia - 11:00 a 22:00",
  night: "Turno noche - 11:00 a 09:00",
  multi_day: "Varios dias",
};

export const bookingModeSelectLabels = {
  day: "Turno dia (11:00 - 22:00)",
  night: "Turno noche (11:00 - 09:00)",
  multi_day: "Varios dias",
};

export const bookingTimes = ["08:00", "09:00", "10:00", "11:00", "12:00", "18:00", "19:00", "22:00"];
export const DEFAULT_START_TIME = "11:00";
export const DEFAULT_SAME_DAY_END_TIME = "22:00";
export const DEFAULT_OVERNIGHT_END_TIME = "09:00";

const blockingStatuses = new Set(["confirmada", "pre-reserva", "seña pendiente", "seÃ±a pendiente", "bloqueada"]);

export function getBookingModeLabel(bookingMode, variant = "detail") {
  if (variant === "select") return bookingModeSelectLabels[bookingMode] || bookingModeLabels[bookingMode];
  if (variant === "short") return bookingModeLabels[bookingMode] || bookingMode;
  return bookingModeDetailLabels[bookingMode] || bookingModeLabels[bookingMode] || bookingMode;
}

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

export function toDateTimeValue(dateValue, timeValue = "00:00") {
  if (!dateValue) return "";
  return `${dateValue}T${timeValue || "00:00"}`;
}

export function getDefaultEndTime(startDate, endDate) {
  return startDate && endDate && endDate > startDate
    ? DEFAULT_OVERNIGHT_END_TIME
    : DEFAULT_SAME_DAY_END_TIME;
}

export function applyDefaultReservationTimes(values = {}) {
  const startDate = values.startDate || "";
  const endDate = values.endDate || startDate;

  return {
    ...values,
    startDate,
    startTime: values.startTime || DEFAULT_START_TIME,
    endDate,
    endTime: values.endTime || getDefaultEndTime(startDate, endDate),
  };
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
  const startTime = reservation.startTime || DEFAULT_START_TIME;
  const fallbackEndDate =
    bookingMode === "night" ? addDaysISO(startDate, 1) : reservation.eventDate || startDate;
  const endDate = reservation.endDate || fallbackEndDate;
  const endTime = reservation.endTime || getDefaultEndTime(startDate, endDate);

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
      startTime: DEFAULT_START_TIME,
      endDate: startDate ? addDaysISO(startDate, 1) : "",
      endTime: DEFAULT_OVERNIGHT_END_TIME,
    };
  }

  if (bookingMode === "multi_day") {
    const endDate = values.endDate && values.endDate >= startDate ? values.endDate : startDate;

    return {
      ...values,
      bookingMode,
      startDate,
      startTime: values.startTime || DEFAULT_START_TIME,
      endDate,
      endTime: values.endTime || getDefaultEndTime(startDate, endDate),
    };
  }

  return {
    ...values,
    bookingMode: "day",
    startDate,
    startTime: DEFAULT_START_TIME,
    endDate: startDate,
    endTime: DEFAULT_SAME_DAY_END_TIME,
  };
}

export function getReservationDates(reservation) {
  const booking = normalizeBooking(reservation);
  return getDatesInRange(booking.startDate, booking.endDate);
}

export function reservationBlocksAvailability(reservation) {
  return blockingStatuses.has(reservation.status);
}

export function getReservationInterval(reservation = {}) {
  const booking = normalizeBooking(reservation);

  return {
    start: toDateTimeValue(booking.startDate, booking.startTime),
    end: toDateTimeValue(booking.endDate, booking.endTime),
  };
}

export function isReservationRangeValid(reservation = {}) {
  const { start, end } = getReservationInterval(reservation);
  return Boolean(start && end && end > start);
}

export function getReservationValidationMessage(reservation = {}) {
  const booking = normalizeBooking(reservation);

  if (!booking.startDate || !booking.endDate) return "Debe elegir fecha de ingreso y salida.";
  if (booking.endDate < booking.startDate) {
    return "La fecha de salida no puede ser anterior a la fecha de ingreso.";
  }
  if (booking.endDate === booking.startDate && booking.endTime <= booking.startTime) {
    return "La hora de salida debe ser posterior a la hora de ingreso.";
  }
  return "";
}

export function reservationsOverlap(first = {}, second = {}) {
  const firstInterval = getReservationInterval(first);
  const secondInterval = getReservationInterval(second);

  return Boolean(
    firstInterval.start &&
      firstInterval.end &&
      secondInterval.start &&
      secondInterval.end &&
      firstInterval.start < secondInterval.end &&
      firstInterval.end > secondInterval.start,
  );
}

export function findOverlappingReservation(reservations, candidate, excludedReservationId = "") {
  if (!isReservationRangeValid(candidate)) return null;

  return reservations.find(
    (reservation) =>
      reservation.id !== excludedReservationId &&
      reservationBlocksAvailability(reservation) &&
      reservationsOverlap(candidate, reservation),
  );
}

export function getDateSlotInterval(dateValue) {
  return {
    start: toDateTimeValue(dateValue, DEFAULT_START_TIME),
    end: toDateTimeValue(dateValue, DEFAULT_SAME_DAY_END_TIME),
  };
}

export function getReservationsForDate(dateValue, reservations = []) {
  if (!dateValue) return [];

  const dayStart = toDateTimeValue(dateValue, "00:00");
  const nextDayStart = toDateTimeValue(addDaysISO(dateValue, 1), "00:00");

  return reservations
    .filter((reservation) => {
      if (!reservationBlocksAvailability(reservation)) return false;
      const interval = getReservationInterval(reservation);
      return interval.start < nextDayStart && interval.end > dayStart;
    })
    .sort((first, second) =>
      toDateTimeValue(first.startDate, first.startTime).localeCompare(
        toDateTimeValue(second.startDate, second.startTime),
      ),
    );
}

export function getDayAvailabilityStatus(dateValue, reservations = []) {
  if (!dateValue) return "invalid";
  const today = toISODate(new Date());
  if (dateValue < today) return "past";

  const dayReservations = getReservationsForDate(dateValue, reservations);
  if (!dayReservations.length) return "available";

  const defaultSlot = getDateSlotInterval(dateValue);
  const blocksDefaultSlot = dayReservations.some((reservation) => {
    const interval = getReservationInterval(reservation);
    return interval.start < defaultSlot.end && interval.end > defaultSlot.start;
  });

  if (!blocksDefaultSlot) return "partial";

  if (dayReservations.some((reservation) => reservation.status === "bloqueada")) return "blocked";
  if (dayReservations.some((reservation) => reservation.status === "pre-reserva")) return "preReserved";
  return "reserved";
}

export function buildAvailabilityFromReservations(reservations, excludedReservationId = "") {
  const availability = {
    reserved: new Set(),
    preReserved: new Set(),
    blocked: new Set(),
    partial: new Set(),
  };
  const activeReservations = reservations.filter(
    (reservation) => reservation.id !== excludedReservationId && reservationBlocksAvailability(reservation),
  );
  const dates = new Set();

  activeReservations.forEach((reservation) => {
    getReservationDates(reservation).forEach((date) => dates.add(date));
  });

  dates.forEach((date) => {
    const status = getDayAvailabilityStatus(date, activeReservations);
    if (availability[status]) availability[status].add(date);
  });

  return {
    reserved: [...availability.reserved],
    preReserved: [...availability.preReserved],
    blocked: [...availability.blocked],
    partial: [...availability.partial],
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
  if (dates.length <= 1) return "1 dia";
  return `${dates.length} dias`;
}
