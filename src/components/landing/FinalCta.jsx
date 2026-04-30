import { buildBaseWhatsappUrl } from "../../utils/whatsapp.js";

export default function FinalCta({ venue, content }) {
  if (content?.visible === false) return null;

  return (
    <section className="section-shell final-cta">
      <img src={content?.image || venue.coverImage} alt="Vista natural de Paraíso Escondido" />
      <div className="final-cta__overlay" />
      <div className="final-cta__content">
        <p className="eyebrow eyebrow--light">Reserva privada</p>
        <h2>{content?.title || "¿Listo para reservar tu fecha?"}</h2>
        {content?.description && <p>{content.description}</p>}
        <a className="primary-button primary-button--light" href={buildBaseWhatsappUrl(venue)} target="_blank" rel="noreferrer">
          {content?.buttonText || "Consultar disponibilidad"}
        </a>
      </div>
    </section>
  );
}
