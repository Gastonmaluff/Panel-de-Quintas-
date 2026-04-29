import { getDatesInRange } from "./booking.js";

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
  if (day === 5) return rules.fridayBasePrice || rules.weekdayBasePrice;
  return rules.weekdayBasePrice;
}

export function calculateQuote(values, rules) {
  const isRangeQuote = Boolean(values.startDate || values.endDate || values.bookingMode);
  const startDate = values.startDate || values.date;
  const endDate = values.endDate || startDate;
  const rangeDates = getDatesInRange(startDate, endDate);
  const pricedDates =
    isRangeQuote && values.bookingMode === "multi_day" ? rangeDates : [startDate].filter(Boolean);
  const basePrice =
    pricedDates.reduce((total, date) => total + getBasePrice(date, rules), 0) ||
    getBasePrice(startDate, rules);
  const eventTypeAmount = rules.eventTypeRules[values.eventType] || 0;
  const guestRule = [...rules.guestCountRules]
    .sort((a, b) => b.min - a.min)
    .find((rule) => Number(values.guestCount || 0) >= rule.min);
  const guestAmount = guestRule?.amount || 0;
  const timeSlotMultiplier = !isRangeQuote && values.timeSlot === "medio_dia" ? 0.72 : 1;
  const weekendExtra = !isRangeQuote && values.timeSlot === "fin_de_semana" ? 900000 : 0;
  const subtotal =
    (basePrice + eventTypeAmount + guestAmount + weekendExtra) * timeSlotMultiplier;
  const totalPrice = Math.round(subtotal / 10000) * 10000;
  const calculatedDeposit =
    rules.depositType === "percentage"
      ? Math.round((totalPrice * rules.depositValue) / 100)
      : rules.depositValue;
  const depositAmount = Math.max(calculatedDeposit, rules.minimumDepositAmount || 0);
  const balanceAmount = totalPrice - depositAmount;

  return {
    basePrice,
    eventTypeAmount,
    guestAmount,
    weekendExtra,
    daysCount: rangeDates.length || 1,
    totalPrice,
    depositAmount,
    balanceAmount,
  };
}
