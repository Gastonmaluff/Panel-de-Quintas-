import { useMemo, useState } from "react";
import { useAdminData } from "../admin/AdminDataProvider.jsx";
import { venues } from "../data/venues.js";
import { formatGuaranies } from "../utils/pricing.js";
import { formatParaguayPhone, toWhatsappParaguay } from "../utils/formatters.js";

function buildWhatsappUrl(phone, name) {
  const venue = venues[0];
  const normalizedPhone = toWhatsappParaguay(phone) || venue.whatsappNumber;
  const message = `Hola ${name}, te escribo de ${venue.name}.`;
  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
}

export default function AdminClients() {
  const { clients } = useAdminData();
  const [query, setQuery] = useState("");
  const filteredClients = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return clients;
    return clients.filter((client) =>
      `${client.name} ${client.phone} ${client.cedula || ""}`.toLowerCase().includes(normalized),
    );
  }, [clients, query]);

  return (
    <section className="admin-section admin-clients-section">
      <div className="admin-section-heading">
        <div>
          <h2>Clientes</h2>
          <p>Clientes generados automáticamente desde las reservas activas.</p>
        </div>
        <label className="admin-search-field">
          Buscar
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nombre, teléfono o cédula" />
        </label>
      </div>

      <div className="admin-client-card-list">
        {filteredClients.map((client) => (
          <article className="admin-client-card" key={client.id}>
            <header>
              <div>
                <strong>{client.name}</strong>
                <span>{formatParaguayPhone(client.phone) || "Sin teléfono"}</span>
              </div>
              <a href={buildWhatsappUrl(client.phone, client.name)} target="_blank" rel="noreferrer">WhatsApp</a>
            </header>
            <dl>
              <div><dt>Cédula</dt><dd>{client.cedula || "Sin cédula"}</dd></div>
              <div><dt>Reservas</dt><dd>{client.reservationCount}</dd></div>
              <div><dt>Última reserva</dt><dd>{client.lastReservationDate || "Sin fecha"}</dd></div>
              <div><dt>Total facturado</dt><dd>{formatGuaranies(client.totalBilled)}</dd></div>
              <div><dt>Saldo pendiente</dt><dd>{formatGuaranies(client.totalBalance)}</dd></div>
            </dl>
            <details>
              <summary>Ver historial</summary>
              {client.reservations.map((reservation) => (
                <p key={reservation.id}>{reservation.startDate} · {reservation.eventType} · {formatGuaranies(reservation.totalAmount)}</p>
              ))}
            </details>
          </article>
        ))}
      </div>

      <div className="admin-reservations-table-wrap">
        <table className="admin-reservations-table">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Teléfono</th>
              <th>Cédula</th>
              <th>Reservas</th>
              <th>Última reserva</th>
              <th className="money-column">Facturado</th>
              <th className="money-column">Pagado</th>
              <th className="money-column">Saldo</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredClients.map((client) => (
              <tr key={client.id}>
                <td><strong>{client.name}</strong></td>
                <td>{formatParaguayPhone(client.phone) || "Sin teléfono"}</td>
                <td>{client.cedula || "Sin cédula"}</td>
                <td>{client.reservationCount}</td>
                <td>{client.lastReservationDate || "Sin fecha"}</td>
                <td className="money-column">{formatGuaranies(client.totalBilled)}</td>
                <td className="money-column">{formatGuaranies(client.totalPaid)}</td>
                <td className="money-column">{formatGuaranies(client.totalBalance)}</td>
                <td><a href={buildWhatsappUrl(client.phone, client.name)} target="_blank" rel="noreferrer">WhatsApp</a></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
