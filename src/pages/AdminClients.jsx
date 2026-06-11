import { useMemo, useState } from "react";
import { useAdminData } from "../admin/AdminDataProvider.jsx";
import { venues } from "../data/venues.js";
import { formatGuaranies } from "../utils/pricing.js";

function buildWhatsappUrl(phone, name) {
  const venue = venues[0];
  const normalizedPhone = phone.replace(/\D/g, "") || venue.whatsappNumber;
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
      `${client.name} ${client.phone}`.toLowerCase().includes(normalized),
    );
  }, [clients, query]);

  return (
    <section className="admin-section">
      <div className="admin-section-heading">
        <div>
          <h2>Clientes</h2>
          <p>Clientes generados automáticamente desde las reservas.</p>
        </div>
        <label className="admin-search-field">
          Buscar
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nombre o teléfono" />
        </label>
      </div>

      <div className="admin-reservations-table-wrap">
        <table className="admin-reservations-table">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Teléfono</th>
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
                <td>{client.phone || "Sin teléfono"}</td>
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
