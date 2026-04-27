import { venues } from "../data/venues.js";

export default function AdminConfiguration() {
  const venue = venues[0];

  return (
    <section className="admin-section">
      <div className="admin-section-heading">
        <h2>Configuración de quinta</h2>
        <button type="button">Actualizar</button>
      </div>

      <form className="config-form">
        <label>
          Nombre
          <input defaultValue={venue.name} />
        </label>
        <label>
          Slug
          <input defaultValue={venue.slug} />
        </label>
        <label>
          WhatsApp
          <input defaultValue={venue.whatsappNumber} />
        </label>
        <label>
          Ubicación
          <input defaultValue={venue.location} />
        </label>
        <label>
          Descripción
          <textarea defaultValue={venue.description} />
        </label>
      </form>
    </section>
  );
}
