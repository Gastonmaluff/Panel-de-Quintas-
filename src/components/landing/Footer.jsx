import { buildBaseWhatsappUrl } from "../../utils/whatsapp.js";
import BrandLogo from "../branding/BrandLogo.jsx";

export default function Footer({ venue, content }) {
  const adminPath = `${import.meta.env.BASE_URL}admin`;
  const socialLinks = content?.socialLinks || [];

  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <div className="site-footer__brand">
          <BrandLogo variant="mark" className="site-footer__mark" alt="" ariaHidden />
          <div>
            <strong>{venue.name}</strong>
            <span>{venue.subtitle}</span>
          </div>
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

        <BrandLogo variant="stacked" className="site-footer__decor" alt="" ariaHidden />

        <div className="site-footer__bottom">
          <p>{content?.location || venue.location} · © 2026 {venue.name}</p>
        </div>
      </div>
    </footer>
  );
}
