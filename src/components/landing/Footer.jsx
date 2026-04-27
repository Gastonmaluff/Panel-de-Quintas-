import { buildBaseWhatsappUrl } from "../../utils/whatsapp.js";

export default function Footer({ venue }) {
  const adminPath = `${import.meta.env.BASE_URL}admin`;

  return (
    <footer className="site-footer">
      <div>
        <strong>{venue.name}</strong>
        <span>{venue.subtitle}</span>
      </div>
      <nav aria-label="Footer">
        <a href={buildBaseWhatsappUrl(venue)} target="_blank" rel="noreferrer">
          WhatsApp
        </a>
        <a href="#disponibilidad">Disponibilidad</a>
        <a href="#cotizador">Cotizador</a>
        <a href={adminPath}>Admin</a>
      </nav>
      <p>{venue.location} · © 2026 QuintaFlow</p>
    </footer>
  );
}
