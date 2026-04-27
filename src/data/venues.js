export const venueId = "paraiso-escondido";

export const venues = [
  {
    id: venueId,
    name: "Paraíso Escondido",
    slug: "paraiso-escondido",
    logoText: "PARAÍSO ESCONDIDO",
    subtitle: "quinta & eventos",
    description:
      "Un espacio privado para celebrar momentos inolvidables en un entorno natural, cuidado y elegante.",
    whatsappNumber: "595981000000",
    location: "Asunción, Paraguay",
    coverImage:
      "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1800&q=85",
    galleryImages: [
      {
        src: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1800&q=85",
        alt: "Casa premium rodeada de vegetación",
      },
      {
        src: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1200&q=85",
        alt: "Piscina elegante al aire libre",
      },
      {
        src: "https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=1200&q=85",
        alt: "Mesa preparada para evento íntimo",
      },
      {
        src: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=85",
        alt: "Jardín amplio para celebraciones",
      },
    ],
    amenities: [
      "Piscina",
      "Quincho",
      "Parrilla",
      "Cocina equipada",
      "Baños",
      "Estacionamiento",
      "Área infantil",
      "Seguridad",
      "Espacio verde",
      "Salón climatizado",
    ],
    active: true,
  },
];

export const pricingRules = {
  id: "pricing-paraiso-escondido",
  venueId,
  weekdayBasePrice: 800000,
  saturdayBasePrice: 1500000,
  sundayBasePrice: 1200000,
  holidayBasePrice: 1700000,
  eventTypeRules: {
    cumpleanos: 0,
    casamiento: 800000,
    bautismo: 150000,
    reunion_familiar: 0,
    evento_corporativo: 400000,
    pool_day: 200000,
    otro: 0,
  },
  guestCountRules: [
    { min: 51, amount: 300000 },
    { min: 101, amount: 700000 },
  ],
  extrasRules: {
    limpieza: 150000,
    mesas_sillas: 250000,
    seguridad: 300000,
    decoracion: 350000,
    sonido: 250000,
    hora_extra: 150000,
    habitaciones: 450000,
  },
  depositType: "percentage",
  depositValue: 30,
};

export const availabilityMock = [
  { venueId, date: "2026-05-03", status: "reserved", label: "Casamiento" },
  { venueId, date: "2026-05-09", status: "preReserved", label: "Pre-reserva" },
  { venueId, date: "2026-05-14", status: "blocked", label: "Mantenimiento" },
  { venueId, date: "2026-05-18", status: "reserved", label: "Cumpleaños" },
  { venueId, date: "2026-05-24", status: "preReserved", label: "Consulta" },
  { venueId, date: "2026-06-06", status: "reserved", label: "Corporativo" },
  { venueId, date: "2026-06-13", status: "blocked", label: "Bloqueado" },
];

export const reservationStatuses = [
  "consulta",
  "cotizacion_enviada",
  "pre_reserva",
  "sena_pendiente",
  "confirmada",
  "finalizada",
  "cancelada",
];
