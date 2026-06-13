import logoUrl from "../assets/branding/logo-official-horizontal.png";
import { formatGuaranies } from "./pricing.js";
import { formatDateShort } from "./periodFilters.js";

const GREEN = [6, 27, 14];
const SAGE = [95, 129, 114];
const LINE = [226, 232, 226];
const PAPER = [248, 251, 249];

async function imageUrlToDataUrl(url) {
  const response = await fetch(url);
  const blob = await response.blob();

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function normalizeText(value, fallback = "-") {
  return String(value || fallback);
}

function drawSectionTitle(doc, title, y) {
  doc.setTextColor(...GREEN);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(title, 16, y);
  doc.setDrawColor(...LINE);
  doc.line(16, y + 4, 194, y + 4);
}

function ensureSpace(doc, y, needed = 24) {
  if (y + needed <= 282) return y;
  doc.addPage();
  return 18;
}

function drawKeyValue(doc, label, value, x, y, width = 54) {
  doc.setFillColor(...PAPER);
  doc.roundedRect(x, y, width, 22, 4, 4, "F");
  doc.setTextColor(...SAGE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text(label.toUpperCase(), x + 4, y + 7);
  doc.setTextColor(...GREEN);
  doc.setFontSize(11);
  doc.text(value, x + 4, y + 16);
}

function drawRows(doc, rows, columns, y, emptyText) {
  y += 7;

  if (!rows.length) {
    doc.setTextColor(110, 116, 110);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(emptyText, 16, y + 4);
    return y + 16;
  }

  doc.setFillColor(...PAPER);
  doc.roundedRect(16, y, 178, 10, 3, 3, "F");
  doc.setTextColor(...SAGE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);

  columns.forEach((column) => {
    doc.text(column.label.toUpperCase(), column.x, y + 6);
  });

  y += 13;
  doc.setTextColor(...GREEN);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);

  rows.forEach((row) => {
    y = ensureSpace(doc, y, 18);

    columns.forEach((column) => {
      const rawText = normalizeText(row[column.key]);
      const text = doc.splitTextToSize(rawText, column.width || 28);
      doc.text(text.slice(0, 2), column.x, y);
    });

    doc.setDrawColor(...LINE);
    doc.line(16, y + 7, 194, y + 7);
    y += 12;
  });

  return y + 5;
}

export async function exportFinancePdf({ range, payments, expenses, totals }) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const generatedAt = formatDateShort(new Date());

  try {
    const logoData = await imageUrlToDataUrl(logoUrl);
    doc.addImage(logoData, "PNG", 16, 13, 48, 18);
  } catch {
    doc.setTextColor(...GREEN);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("El Paraiso Escondido", 16, 24);
  }

  doc.setTextColor(...GREEN);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Reporte financiero", 16, 42);
  doc.setTextColor(110, 116, 110);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Periodo: ${range.periodText}`, 16, 49);
  doc.text(`Generado el ${generatedAt}`, 16, 55);

  drawSectionTitle(doc, "Resumen", 70);
  drawKeyValue(doc, "Ingresos", formatGuaranies(totals.income), 16, 79);
  drawKeyValue(doc, "Gastos", formatGuaranies(totals.expenseTotal), 76, 79);
  drawKeyValue(doc, "Resultado neto", formatGuaranies(totals.net), 136, 79);
  drawKeyValue(doc, "Saldos pendientes", formatGuaranies(totals.pending), 16, 106, 82);

  let y = 143;
  drawSectionTitle(doc, "Ingresos", y);
  y = drawRows(
    doc,
    payments.map((payment) => ({
      date: formatDateShort(payment.paymentDate || payment.paidAt || payment.createdAt),
      clientName: payment.clientName,
      eventType: payment.eventType,
      method: payment.method,
      amount: formatGuaranies(payment.amount),
      receipt: payment.receiptUrl ? "Si" : "No",
    })),
    [
      { key: "date", label: "Fecha", x: 17, width: 21 },
      { key: "clientName", label: "Cliente", x: 39, width: 34 },
      { key: "eventType", label: "Reserva", x: 76, width: 34 },
      { key: "method", label: "Metodo", x: 113, width: 24 },
      { key: "amount", label: "Monto", x: 140, width: 29 },
      { key: "receipt", label: "Comp.", x: 174, width: 15 },
    ],
    y,
    "No hay ingresos registrados en este periodo.",
  );

  y = ensureSpace(doc, y, 38);
  drawSectionTitle(doc, "Gastos", y);
  y = drawRows(
    doc,
    expenses.map((expense) => ({
      date: formatDateShort(expense.date || expense.expenseDate || expense.createdAt),
      category: expense.category,
      description: expense.description,
      method: expense.method,
      amount: formatGuaranies(expense.amount),
      receipt: expense.receiptUrl ? "Si" : "No",
    })),
    [
      { key: "date", label: "Fecha", x: 17, width: 21 },
      { key: "category", label: "Categoria", x: 39, width: 28 },
      { key: "description", label: "Descripcion", x: 70, width: 44 },
      { key: "method", label: "Metodo", x: 117, width: 24 },
      { key: "amount", label: "Monto", x: 144, width: 29 },
      { key: "receipt", label: "Comp.", x: 177, width: 14 },
    ],
    y,
    "No hay gastos registrados en este periodo.",
  );

  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(...LINE);
    doc.line(16, 287, 194, 287);
    doc.setTextColor(110, 116, 110);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("Paraiso Escondido - Reporte generado desde el sistema interno", 16, 293);
    doc.text(`Pagina ${page} de ${pageCount}`, 174, 293);
  }

  doc.save(`paraiso-escondido-finanzas-${range.fileSegment}.pdf`);
}
