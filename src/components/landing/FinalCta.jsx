import { buildBaseWhatsappUrl } from "../../utils/whatsapp.js";

export default function FinalCta({ venue }) {
  return (
    <section className="section-shell final-cta">
      <img src={venue.coverImage} alt="Vista natural de Paraíso Escondido" />
      <div className="final-cta__overlay" />
      <div className="final-cta__content">
        <p className="eyebrow eyebrow--light">Reserva privada</p>
        <h2>¿Listo para reservar tu fecha?</h2>
        <a className="primary-button primary-button--light" href={buildBaseWhatsappUrl(venue)} target="_blank" rel="noreferrer">
          Consultar disponibilidad
        </a>
      </div>
    </section>
  );
}
