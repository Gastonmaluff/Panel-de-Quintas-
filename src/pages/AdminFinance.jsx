import { useMemo, useState } from "react";
import { useAdminData } from "../admin/AdminDataProvider.jsx";
import { formatGuaranies } from "../utils/pricing.js";

export default function AdminFinance() {
  const { reservations, expenses } = useAdminData();
  const [message, setMessage] = useState("");
  const finance = useMemo(() => {
    const payments = reservations.flatMap((reservation) =>
      reservation.payments.map((payment) => ({
        ...payment,
        reservationId: reservation.id,
        clientName: reservation.clientName,
        eventType: reservation.eventType,
      })),
    );
    const income = payments.reduce((total, payment) => total + Number(payment.amount || 0), 0);
    const expenseTotal = expenses.reduce((total, expense) => total + Number(expense.amount || 0), 0);
    const pending = reservations.reduce((total, reservation) => total + Number(reservation.balance || 0), 0);
    const paidReservations = reservations.filter((reservation) => reservation.paymentStatus === "Pagado").length;

    return {
      payments,
      income,
      expenseTotal,
      net: income - expenseTotal,
      pending,
      deposits: payments.filter((payment) => payment.type === "seña").reduce((total, payment) => total + payment.amount, 0),
      paidReservations,
    };
  }, [reservations, expenses]);

  return (
    <section className="admin-section">
      <div className="admin-section-heading">
        <div>
          <h2>Finanzas</h2>
          <p>Resumen de ingresos, gastos, resultado y saldos pendientes.</p>
        </div>
        <button type="button" onClick={() => setMessage("PDF en preparación")}>Exportar PDF</button>
      </div>
      {message ? <p className="admin-empty-note">{message}</p> : null}

      <div className="admin-grid">
        <article className="admin-card admin-card--compact-value"><span>Ingresos del mes</span><strong>{formatGuaranies(finance.income)}</strong></article>
        <article className="admin-card admin-card--compact-value"><span>Gastos del mes</span><strong>{formatGuaranies(finance.expenseTotal)}</strong></article>
        <article className="admin-card admin-card--compact-value"><span>Resultado neto</span><strong>{formatGuaranies(finance.net)}</strong></article>
        <article className="admin-card admin-card--compact-value"><span>Saldos por cobrar</span><strong>{formatGuaranies(finance.pending)}</strong></article>
        <article className="admin-card admin-card--compact-value"><span>Señas recibidas</span><strong>{formatGuaranies(finance.deposits)}</strong></article>
        <article className="admin-card"><span>Reservas pagadas</span><strong>{finance.paidReservations}</strong></article>
      </div>

      <details className="admin-editor-card admin-collapsible-card" open>
        <summary><span><strong>Ingresos</strong><small>Pagos recibidos por reservas.</small></span></summary>
        <div className="admin-collapsible-card__content">
          <div className="admin-reservations-table-wrap">
            <table className="admin-reservations-table">
              <thead><tr><th>Fecha</th><th>Cliente</th><th>Reserva</th><th>Método</th><th className="money-column">Monto</th><th>Comprobante</th></tr></thead>
              <tbody>
                {finance.payments.map((payment) => (
                  <tr key={payment.id}><td>{payment.paymentDate}</td><td>{payment.clientName}</td><td>{payment.eventType}</td><td>{payment.method}</td><td className="money-column">{formatGuaranies(payment.amount)}</td><td>{payment.receiptName || "Sin comprobante"}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </details>

      <details className="admin-editor-card admin-collapsible-card">
        <summary><span><strong>Gastos</strong><small>Egresos registrados.</small></span></summary>
        <div className="admin-collapsible-card__content">
          <div className="admin-reservations-table-wrap">
            <table className="admin-reservations-table">
              <thead><tr><th>Fecha</th><th>Categoría</th><th>Descripción</th><th>Método</th><th className="money-column">Monto</th><th>Comprobante</th></tr></thead>
              <tbody>
                {expenses.map((expense) => (
                  <tr key={expense.id}><td>{expense.date}</td><td>{expense.category}</td><td>{expense.description}</td><td>{expense.method}</td><td className="money-column">{formatGuaranies(expense.amount)}</td><td>{expense.receiptName || "Sin comprobante"}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </details>

      <details className="admin-editor-card admin-collapsible-card">
        <summary><span><strong>Resumen</strong><small>Resultado, saldos pendientes y próximos cobros.</small></span></summary>
        <div className="admin-collapsible-card__content">
          <p>Ingresos: {formatGuaranies(finance.income)}</p>
          <p>Gastos: {formatGuaranies(finance.expenseTotal)}</p>
          <p>Resultado: {formatGuaranies(finance.net)}</p>
          <p>Saldos pendientes: {formatGuaranies(finance.pending)}</p>
        </div>
      </details>
    </section>
  );
}
