export function titleCaseName(value = "") {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function onlyDigits(value = "") {
  return String(value).replace(/\D/g, "");
}

export function formatParaguayPhone(value = "") {
  const digits = onlyDigits(value).slice(0, 10);
  if (digits.length <= 4) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 4)} ${digits.slice(4)}`;
  return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
}

export function cleanParaguayPhone(value = "") {
  return onlyDigits(value).slice(0, 10);
}

export function toWhatsappParaguay(value = "") {
  const digits = cleanParaguayPhone(value);
  if (digits.startsWith("0")) return `595${digits.slice(1)}`;
  if (digits.startsWith("595")) return digits;
  return digits;
}

export function parseAmountInput(value = "") {
  return Number(onlyDigits(value));
}

export function formatAmountInput(value) {
  const numericValue = Number(value || 0);
  if (!numericValue) return "";
  return new Intl.NumberFormat("es-PY", { maximumFractionDigits: 0 }).format(numericValue);
}

export function formatGuaraniesDisplay(value) {
  return `Gs. ${new Intl.NumberFormat("es-PY", { maximumFractionDigits: 0 }).format(Number(value || 0))}`;
}
