const metrics = [
  ["Reservas del mes", "12"],
  ["Ingresos estimados", "Gs. 18.400.000"],
  ["Fechas ocupadas", "9"],
  ["Consultas pendientes", "6"],
];

const nextEvents = [
  ["03 may", "Casamiento", "confirmada"],
  ["09 may", "Reunión familiar", "pre-reserva"],
  ["18 may", "Cumpleaños", "cotización enviada"],
];

export default function AdminDashboard() {
  return (
    <section className="admin-section">
      <div className="admin-grid">
        {metrics.map(([label, value]) => (
          <article className="admin-card" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </div>

      <article className="admin-table-card">
        <div className="admin-section-heading">
          <h2>Próximos eventos</h2>
          <p>Seguimiento comercial inicial con datos mock.</p>
        </div>
        <div className="admin-list">
          {nextEvents.map(([date, event, status]) => (
            <div key={`${date}-${event}`}>
              <strong>{date}</strong>
              <span>{event}</span>
              <em>{status}</em>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}
