import { formatDateLong } from "./date.js";
import { eventTypeLabels, formatGuaranies, timeSlotLabels } from "./pricing.js";

export function buildWhatsappUrl({ venue, quoteValues, quote }) {
  const lines = [
    `Hola, quiero consultar disponibilidad para ${venue.name}.`,
    "",
    `Fecha: ${formatDateLong(quoteValues.date)}`,
    `Evento: ${eventTypeLabels[quoteValues.eventType]}`,
    `Cantidad de personas: ${quoteValues.guestCount}`,
    `Horario: ${timeSlotLabels[quoteValues.timeSlot]}`,
  ];

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
