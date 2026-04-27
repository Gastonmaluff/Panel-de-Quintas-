export const eventTypeLabels = {
  cumpleanos: "Cumpleaños",
  casamiento: "Casamiento",
  bautismo: "Bautismo",
  reunion_familiar: "Reunión familiar",
  evento_corporativo: "Evento corporativo",
  pool_day: "Pool day",
  otro: "Otro",
};

export const timeSlotLabels = {
  dia_completo: "Día completo",
  medio_dia: "Medio día",
  noche: "Noche",
  fin_de_semana: "Fin de semana",
};

export const extraLabels = {
  limpieza: "Limpieza",
  mesas_sillas: "Mesas y sillas",
  seguridad: "Seguridad",
  decoracion: "Decoración",
  sonido: "Sonido",
  hora_extra: "Hora extra",
  habitaciones: "Uso de habitaciones",
};

export function formatGuaranies(value) {
  return new Intl.NumberFormat("es-PY", {
    style: "currency",
    currency: "PYG",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function getBasePrice(dateValue, rules) {
  if (!dateValue) return rules.weekdayBasePrice;
  const date = new Date(`${dateValue}T12:00:00`);
  const day = date.getDay();
  if (day === 6) return rules.saturdayBasePrice;
  if (day === 0) return rules.sundayBasePrice;
  return rules.weekdayBasePrice;
}

export function calculateQuote(values, rules) {
  const basePrice = getBasePrice(values.date, rules);
  const eventTypeAmount = rules.eventTypeRules[values.eventType] || 0;
  const guestRule = [...rules.guestCountRules]
    .sort((a, b) => b.min - a.min)
    .find((rule) => Number(values.guestCount || 0) >= rule.min);
  const guestAmount = guestRule?.amount || 0;
  const extrasAmount = values.extras.reduce(
    (total, extra) => total + (rules.extrasRules[extra] || 0),
    0,
  );
  const timeSlotMultiplier = values.timeSlot === "medio_dia" ? 0.72 : 1;
  const weekendExtra = values.timeSlot === "fin_de_semana" ? 900000 : 0;
  const subtotal =
    (basePrice + eventTypeAmount + guestAmount + extrasAmount + weekendExtra) *
    timeSlotMultiplier;
  const totalPrice = Math.round(subtotal / 10000) * 10000;
  const depositAmount =
    rules.depositType === "percentage"
      ? Math.round((totalPrice * rules.depositValue) / 100)
      : rules.depositValue;
  const balanceAmount = totalPrice - depositAmount;

  return {
    basePrice,
    eventTypeAmount,
    guestAmount,
    extrasAmount,
    weekendExtra,
    totalPrice,
    depositAmount,
    balanceAmount,
  };
}
