export const venueId = "paraiso-escondido";

export const venues = [
  {
    id: venueId,
    name: "Paraíso Escondido",
    slug: "paraiso-escondido",
    logoText: "PARAÍSO ESCONDIDO",
    logoStacked: "logo-official-stacked.png",
    logoHorizontal: "logo-official-horizontal.png",
    logoMark: "logo-official-mark.png",
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
      {
        title: "Piscina",
        description: "Área de agua para eventos de día, pool days y celebraciones familiares.",
        image:
          "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=900&q=84",
        alt: "Piscina al aire libre rodeada de naturaleza",
      },
      {
        title: "Quincho",
        description: "Espacio social cubierto para mesas, servicio y encuentros extendidos.",
        image:
          "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=900&q=84",
        alt: "Galería cubierta preparada para reuniones",
      },
      {
        title: "Parrilla",
        description: "Parrilla lista para asados, catering propio o apoyo gastronómico.",
        image:
          "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=900&q=84",
        alt: "Parrilla encendida para evento privado",
      },
      {
        title: "Cocina equipada",
        description: "Apoyo funcional para preparación, emplatado y conservación.",
        image:
          "https://images.unsplash.com/photo-1556912173-3bb406ef7e77?auto=format&fit=crop&w=900&q=84",
        alt: "Cocina luminosa equipada para eventos",
      },
      {
        title: "Baños",
        description: "Baños cuidados para invitados y eventos de larga duración.",
        image:
          "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=900&q=84",
        alt: "Baño moderno con terminaciones claras",
      },
      {
        title: "Estacionamiento",
        description: "Ingreso cómodo para invitados, proveedores y traslados especiales.",
        image:
          "https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=900&q=84",
        alt: "Acceso vehicular amplio para estacionamiento",
      },
      {
        title: "Área infantil",
        description: "Sector pensado para celebraciones familiares con niños.",
        image:
          "https://images.unsplash.com/photo-1596997000103-e59767e65504?auto=format&fit=crop&w=900&q=84",
        alt: "Área infantil al aire libre en jardín",
      },
      {
        title: "Seguridad",
        description: "Privacidad, control de ingreso y tranquilidad durante el evento.",
        image:
          "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=900&q=84",
        alt: "Entrada privada con portón de seguridad",
      },
      {
        title: "Espacio verde",
        description: "Jardín amplio para fotos, ceremonias y momentos al aire libre.",
        image:
          "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=84",
        alt: "Jardín amplio con árboles para celebraciones",
      },
      {
        title: "Salón climatizado",
        description: "Área interior confortable para encuentros más formales.",
        image:
          "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=900&q=84",
        alt: "Salón elegante preparado para evento privado",
      },
      {
        title: "Habitaciones",
        description: "Ambientes de apoyo para preparación, descanso o eventos extendidos.",
        image:
          "https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=900&q=84",
        alt: "Habitacion serena de apoyo para invitados",
      },
      {
        title: "Sonido y apoyo técnico",
        description: "Base preparada para música, ambientación y momentos clave del evento.",
        image:
          "https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?auto=format&fit=crop&w=900&q=84",
        alt: "Ambientación con luces y sonido para evento",
      },
    ],
    active: true,
  },
];

export const pricingRules = {
  id: "pricing-paraiso-escondido",
  venueId,
  weekdayBasePrice: 800000,
  fridayBasePrice: 1100000,
  saturdayBasePrice: 1500000,
  sundayBasePrice: 1200000,
  holidayBasePrice: 1700000,
  currency: "PYG",
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
  optionalExtras: [],
  depositType: "percentage",
  depositValue: 30,
  minimumDepositAmount: 0,
};

export const availabilityMock = {
  reserved: ["2026-05-03", "2026-05-18", "2026-06-06"],
  preReserved: ["2026-05-09", "2026-05-10", "2026-05-24"],
  blocked: ["2026-05-14", "2026-06-13"],
};

export const reservationStatuses = [
  "consulta",
  "cotizacion_enviada",
  "pre_reserva",
  "sena_pendiente",
  "confirmada",
  "finalizada",
  "cancelada",
];
