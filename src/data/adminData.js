import { venues } from "./venues.js";

export const publicContentMock = {
  hero: {
    title: "Una quinta boutique para celebrar con calma.",
    subtitle:
      "Un espacio privado para celebrar momentos inolvidables en un entorno natural, cuidado y elegante.",
    image: venues[0].coverImage,
    ctaText: "Consultar disponibilidad",
    visible: true,
  },
  experience: {
    eyebrow: "La experiencia",
    title: "Natural, privada y cómoda.",
    description:
      "Un entorno natural, privado y cómodo para cumpleaños, reuniones familiares, casamientos pequeños, eventos corporativos y celebraciones especiales.",
    image: venues[0].galleryImages[3].src,
    visible: true,
  },
  gallery: venues[0].galleryImages.map((image, index) => ({
    id: `gallery-${index + 1}`,
    image: image.src,
    alt: image.alt,
    order: index + 1,
    featured: index === 0,
  })),
  amenitiesSection: {
    eyebrow: "Servicios incluidos",
    title: "Todo lo esencial, resuelto con sobriedad.",
    description:
      "Espacios y comodidades pensados para que el evento fluya sin perder esa sensación de quinta privada.",
    visible: true,
  },
  amenities: venues[0].amenities.map((amenity, index) => ({
    id: `amenity-${index + 1}`,
    ...amenity,
    order: index + 1,
    active: true,
  })),
  cta: {
    title: "¿Listo para reservar tu fecha?",
    description: "Consultá disponibilidad y recibí una respuesta directa por WhatsApp.",
    image: venues[0].coverImage,
    buttonText: "Consultar disponibilidad",
    visible: true,
  },
  footer: {
    text: "Quinta & eventos",
    socialLinks: [
      { label: "Instagram", url: "https://instagram.com/" },
      { label: "Facebook", url: "https://facebook.com/" },
    ],
    location: venues[0].location,
  },
};

export const adminReservationsMock = [
  {
    id: "res-001",
    customerName: "Laura Benítez",
    customerPhone: "+595981111222",
    eventDate: "2026-05-03",
    timeSlot: "Día completo",
    eventType: "Casamiento",
    guestCount: 95,
    totalPrice: 2850000,
    depositAmount: 855000,
    balanceAmount: 1995000,
    status: "confirmada",
    notes: "Requiere ingreso para catering a las 10:00.",
  },
  {
    id: "res-002",
    customerName: "Martín Rojas",
    customerPhone: "+595981333444",
    eventDate: "2026-05-09",
    timeSlot: "Noche",
    eventType: "Cumpleaños",
    guestCount: 45,
    totalPrice: 1750000,
    depositAmount: 525000,
    balanceAmount: 1225000,
    status: "pre-reserva",
    notes: "Esperando confirmación de seña.",
  },
  {
    id: "res-003",
    customerName: "Andrea Duarte",
    customerPhone: "+595981555666",
    eventDate: "2026-05-18",
    timeSlot: "Medio día",
    eventType: "Evento corporativo",
    guestCount: 60,
    totalPrice: 2100000,
    depositAmount: 0,
    balanceAmount: 2100000,
    status: "seña pendiente",
    notes: "Pidió factura y propuesta final.",
  },
  {
    id: "res-004",
    customerName: "Fecha bloqueada",
    customerPhone: "",
    eventDate: "2026-05-14",
    timeSlot: "Día completo",
    eventType: "Mantenimiento",
    guestCount: 0,
    totalPrice: 0,
    depositAmount: 0,
    balanceAmount: 0,
    status: "bloqueada",
    notes: "Bloqueo interno por mantenimiento del espacio.",
  },
];

export const adminReservationStatuses = [
  "consulta",
  "cotización enviada",
  "pre-reserva",
  "seña pendiente",
  "confirmada",
  "finalizada",
  "cancelada",
  "bloqueada",
];

export const optionalExtrasMock = [];
