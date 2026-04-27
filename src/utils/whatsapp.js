import { formatDateLong } from "./date.js";
import {
  eventTypeLabels,
  extraLabels,
  formatGuaranies,
  timeSlotLabels,
} from "./pricing.js";

export function buildWhatsappUrl({ venue, quoteValues, quote }) {
  const extras = quoteValues.extras.length
    ? quoteValues.extras.map((extra) => extraLabels[extra]).join(", ")
    : "Sin extras";
  const message = [
    `Hola, quiero consultar disponibilidad para ${venue.name}.`,
    "",
    `Fecha: ${formatDateLong(quoteValues.date)}`,
    `Evento: ${eventTypeLabels[quoteValues.eventType]}`,
    `Cantidad de personas: ${quoteValues.guestCount}`,
    `Horario: ${timeSlotLabels[quoteValues.timeSlot]}`,
    `Extras: ${extras}`,
    `Precio estimado: ${formatGuaranies(quote.totalPrice)}`,
    `Seña sugerida: ${formatGuaranies(quote.depositAmount)}`,
    "",
    "¿Podemos confirmar disponibilidad?",
  ].join("\n");

  return `https://wa.me/${venue.whatsappNumber}?text=${encodeURIComponent(message)}`;
}

export function buildBaseWhatsappUrl(venue) {
  const message = `Hola, quiero consultar disponibilidad para ${venue.name}.`;
  return `https://wa.me/${venue.whatsappNumber}?text=${encodeURIComponent(message)}`;
}
