import { formatDateLong } from "./date.js";
import {
  formatDateTimeShort,
  getBookingModeLabel,
} from "./booking.js";
import { eventTypeLabels, formatGuaranies, timeSlotLabels } from "./pricing.js";

export function buildWhatsappUrl({ venue, quoteValues, quote }) {
  const isRangeQuote = quoteValues.startDate || quoteValues.endDate || quoteValues.bookingMode;
  const lines = [`Hola, quiero consultar disponibilidad para ${venue.name}.`, ""];

  if (isRangeQuote) {
    lines.push(
      `Tipo de reserva: ${getBookingModeLabel(quoteValues.bookingMode)}`,
      `Ingreso: ${formatDateTimeShort(quoteValues.startDate, quoteValues.startTime)}`,
      `Egreso: ${formatDateTimeShort(quoteValues.endDate, quoteValues.endTime)}`,
    );
  } else {
    lines.push(
      `Fecha: ${formatDateLong(quoteValues.date)}`,
      `Horario: ${timeSlotLabels[quoteValues.timeSlot]}`,
    );
  }

  lines.push(
    `Evento: ${eventTypeLabels[quoteValues.eventType]}`,
    `Cantidad de personas: ${quoteValues.guestCount}`,
  );

  if (quoteValues.extras?.length) {
    lines.push(`Extras: ${quoteValues.extras.join(", ")}`);
  }

  lines.push(
    `Precio estimado: ${formatGuaranies(quote.totalPrice)}`,
    `Seña sugerida: ${formatGuaranies(quote.depositAmount)}`,
    "",
    "¿Podemos confirmar disponibilidad?",
  );

  return `https://wa.me/${venue.whatsappNumber}?text=${encodeURIComponent(lines.join("\n"))}`;
}

export function buildBaseWhatsappUrl(venue) {
  const message = `Hola, quiero consultar disponibilidad para ${venue.name}.`;
  return `https://wa.me/${venue.whatsappNumber}?text=${encodeURIComponent(message)}`;
}
