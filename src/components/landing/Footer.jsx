import { buildBaseWhatsappUrl } from "../../utils/whatsapp.js";

export default function Footer({ venue, content }) {
  const adminPath = `${import.meta.env.BASE_URL}admin`;
  const socialLinks = content?.socialLinks || [];

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
        {socialLinks
          .filter((link) => link.url)
          .map((link) => (
            <a href={link.url} target="_blank" rel="noreferrer" key={link.label}>
              {link.label}
            </a>
          ))}
        <a href={adminPath}>Admin</a>
      </nav>
      <p>{content?.location || venue.location} · © 2026 {venue.name}</p>
    </footer>
  );
}
