import { useMemo, useState } from "react";
import { Eye } from "lucide-react";
import { useAdminData } from "../admin/AdminDataProvider.jsx";
import PeriodFilter from "../components/admin/PeriodFilter.jsx";
import { exportFinancePdf } from "../utils/financePdf.js";
import { formatGuaranies } from "../utils/pricing.js";
import { getCurrentMonthRange, getDateRange, isDateInRange } from "../utils/periodFilters.js";

function ReceiptAction({ item }) {
  if (!item.receiptUrl) {
    return <span className="admin-empty-note">Sin comprobante</span>;
  }

  return (
    <a
      className="admin-receipt-link"
      href={item.receiptUrl}
      target="_blank"
      rel="noreferrer"
      title={item.receiptName ? `Abrir ${item.receiptName}` : "Ver comprobante"}
    >
      <Eye size={15} strokeWidth={1.9} aria-hidden="true" />
      Ver comprobante
    </a>
  );
}

export default function AdminFinance() {
  const { reservations, expenses } = useAdminData();
  const defaultCustomRange = useMemo(() => getCurrentMonthRange(), []);
  const [periodFilter, setPeriodFilter] = useState("month");
  const [customStartDate, setCustomStartDate] = useState(defaultCustomRange.startDate);
  const [customEndDate, setCustomEndDate] = useState(defaultCustomRange.endDate);
  const [message, setMessage] = useState("");
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const activeRange = useMemo(
    () => getDateRange(periodFilter, customStartDate, customEndDate),
    [periodFilter, customStartDate, customEndDate],
  );
  const finance = useMemo(() => {
    const payments = reservations.flatMap((reservation) =>
      reservation.payments.map((payment) => ({
        ...payment,
        reservationId: reservation.id,
        clientName: reservation.clientName,
        eventType: reservation.eventType,
      })),
    );
    const filteredPayments = payments.filter((payment) =>
      isDateInRange(payment.paymentDate || payment.paidAt || payment.createdAt, activeRange),
    );
    const filteredExpenses = expenses.filter((expense) =>
      isDateInRange(expense.date || expense.expenseDate || expense.createdAt, activeRange),
    );
    const periodReservations = reservations.filter((reservation) =>
      isDateInRange(reservation.startDate || reservation.eventDate || reservation.createdAt, activeRange),
    );
    const income = filteredPayments.reduce((total, payment) => total + Number(payment.amount || 0), 0);
    const expenseTotal = filteredExpenses.reduce((total, expense) => total + Number(expense.amount || 0), 0);
    const pending = periodReservations.reduce((total, reservation) => total + Number(reservation.balance || 0), 0);
    const paidReservations = periodReservations.filter((reservation) => reservation.paymentStatus === "Pagado").length;

    return {
      payments: filteredPayments,
      expenses: filteredExpenses,
      income,
      expenseTotal,
      net: income - expenseTotal,
      pending,
      deposits: filteredPayments
        .filter((payment) => payment.type === "seña")
        .reduce((total, payment) => total + Number(payment.amount || 0), 0),
      paidReservations,
    };
  }, [reservations, expenses, activeRange]);

  const handleExportPdf = async () => {
    if (!activeRange.isValid || isExportingPdf) return;
    setIsExportingPdf(true);
    setMessage("");

    try {
      await exportFinancePdf({
        range: activeRange,
        payments: finance.payments,
        expenses: finance.expenses,
        totals: finance,
      });
    } catch (error) {
      setMessage(`No se pudo exportar el PDF: ${error.message}`);
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <section className="admin-section">
      <div className="admin-section-heading">
        <div>
          <h2>Finanzas</h2>
          <p>Resumen de ingresos, gastos, resultado y saldos pendientes.</p>
        </div>
        <button type="button" onClick={handleExportPdf} disabled={!activeRange.isValid || isExportingPdf}>
          {isExportingPdf ? "Exportando..." : "Exportar PDF"}
        </button>
      </div>
      {message ? <p className="admin-empty-note">{message}</p> : null}

      <PeriodFilter
        value={periodFilter}
        onChange={setPeriodFilter}
        customStartDate={customStartDate}
        customEndDate={customEndDate}
        onCustomStartDateChange={setCustomStartDate}
        onCustomEndDateChange={setCustomEndDate}
        range={activeRange}
      />

      <div className="admin-grid">
        <article className="admin-card admin-card--compact-value"><span>Ingresos {activeRange.metricLabel}</span><strong>{formatGuaranies(finance.income)}</strong></article>
        <article className="admin-card admin-card--compact-value"><span>Gastos {activeRange.metricLabel}</span><strong>{formatGuaranies(finance.expenseTotal)}</strong></article>
        <article className="admin-card admin-card--compact-value"><span>Resultado {activeRange.metricLabel}</span><strong>{formatGuaranies(finance.net)}</strong></article>
        <article className="admin-card admin-card--compact-value"><span>Saldos pendientes {activeRange.metricLabel}</span><strong>{formatGuaranies(finance.pending)}</strong></article>
        <article className="admin-card admin-card--compact-value"><span>Señas recibidas {activeRange.metricLabel}</span><strong>{formatGuaranies(finance.deposits)}</strong></article>
        <article className="admin-card"><span>Reservas pagadas</span><strong>{finance.paidReservations}</strong></article>
      </div>

      <details className="admin-editor-card admin-collapsible-card" open>
        <summary><span><strong>Ingresos</strong><small>Pagos recibidos por reservas.</small></span></summary>
        <div className="admin-collapsible-card__content">
          <div className="admin-finance-card-list">
            {finance.payments.map((payment) => (
              <article key={`${payment.reservationId}-${payment.id}`}>
                <header><strong>{payment.clientName}</strong><span>{formatGuaranies(payment.amount)}</span></header>
                <p>{payment.eventType}</p>
                <dl>
                  <div><dt>Fecha</dt><dd>{payment.paymentDate}</dd></div>
                  <div><dt>Método</dt><dd>{payment.method}</dd></div>
                  <div><dt>Comprobante</dt><dd><ReceiptAction item={payment} /></dd></div>
                </dl>
              </article>
            ))}
          </div>
          <div className="admin-reservations-table-wrap">
            <table className="admin-reservations-table">
              <thead><tr><th>Fecha</th><th>Cliente</th><th>Reserva</th><th>Método</th><th className="money-column">Monto</th><th>Comprobante</th></tr></thead>
              <tbody>
                {finance.payments.map((payment) => (
                  <tr key={`${payment.reservationId}-${payment.id}`}><td>{payment.paymentDate}</td><td>{payment.clientName}</td><td>{payment.eventType}</td><td>{payment.method}</td><td className="money-column">{formatGuaranies(payment.amount)}</td><td><ReceiptAction item={payment} /></td></tr>
                ))}
              </tbody>
            </table>
          </div>
          {finance.payments.length === 0 ? <p className="admin-empty-state">No hay ingresos registrados en este período.</p> : null}
        </div>
      </details>

      <details className="admin-editor-card admin-collapsible-card">
        <summary><span><strong>Gastos</strong><small>Gastos registrados.</small></span></summary>
        <div className="admin-collapsible-card__content">
          <div className="admin-finance-card-list">
            {finance.expenses.map((expense) => (
              <article key={expense.id}>
                <header><strong>{expense.category}</strong><span>{formatGuaranies(expense.amount)}</span></header>
                <p>{expense.description}</p>
                <dl>
                  <div><dt>Fecha</dt><dd>{expense.date}</dd></div>
                  <div><dt>Método</dt><dd>{expense.method}</dd></div>
                  <div><dt>Comprobante</dt><dd><ReceiptAction item={expense} /></dd></div>
                </dl>
              </article>
            ))}
          </div>
          <div className="admin-reservations-table-wrap">
            <table className="admin-reservations-table">
              <thead><tr><th>Fecha</th><th>Categoría</th><th>Descripción</th><th>Método</th><th className="money-column">Monto</th><th>Comprobante</th></tr></thead>
              <tbody>
                {finance.expenses.map((expense) => (
                  <tr key={expense.id}><td>{expense.date}</td><td>{expense.category}</td><td>{expense.description}</td><td>{expense.method}</td><td className="money-column">{formatGuaranies(expense.amount)}</td><td><ReceiptAction item={expense} /></td></tr>
                ))}
              </tbody>
            </table>
          </div>
          {finance.expenses.length === 0 ? <p className="admin-empty-state">No hay gastos registrados en este período.</p> : null}
        </div>
      </details>

      <details className="admin-editor-card admin-collapsible-card">
        <summary><span><strong>Resumen</strong><small>Resultado, saldos pendientes y próximos cobros.</small></span></summary>
        <div className="admin-collapsible-card__content">
          <p>Ingresos {activeRange.metricLabel}: {formatGuaranies(finance.income)}</p>
          <p>Gastos {activeRange.metricLabel}: {formatGuaranies(finance.expenseTotal)}</p>
          <p>Resultado {activeRange.metricLabel}: {formatGuaranies(finance.net)}</p>
          <p>Saldos pendientes {activeRange.metricLabel}: {formatGuaranies(finance.pending)}</p>
        </div>
      </details>
    </section>
  );
}
