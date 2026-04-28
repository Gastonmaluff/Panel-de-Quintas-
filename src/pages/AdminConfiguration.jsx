import { useState } from "react";
import { venues } from "../data/venues.js";

export default function AdminConfiguration() {
  const [venue, setVenue] = useState(venues[0]);

  const updateVenue = (key, value) => {
    setVenue((current) => ({ ...current, [key]: value }));
  };

  return (
    <section className="admin-section">
      <div className="admin-section-heading">
        <div>
          <h2>Configuración de quinta</h2>
          <p>Datos base del venue y estructura multi-quinta.</p>
        </div>
        <button type="button">Actualizar</button>
      </div>

      <form className="config-form">
        <label>
          Nombre
          <input value={venue.name} onChange={(event) => updateVenue("name", event.target.value)} />
        </label>
        <label>
          Slug
          <input value={venue.slug} onChange={(event) => updateVenue("slug", event.target.value)} />
        </label>
        <label>
          WhatsApp
          <input
            value={venue.whatsappNumber}
            onChange={(event) => updateVenue("whatsappNumber", event.target.value)}
          />
        </label>
        <label>
          Ubicación
          <input
            value={venue.location}
            onChange={(event) => updateVenue("location", event.target.value)}
          />
        </label>
        <label>
          Descripción
          <textarea
            value={venue.description}
            onChange={(event) => updateVenue("description", event.target.value)}
          />
        </label>
      </form>
    </section>
  );
}
