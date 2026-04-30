export default function HeroIntro({ venue, content }) {
  if (content?.visible === false) return null;

  return (
    <section className="brand-stage section-shell" id="inicio">
      <p className="brand-stage__copy">{content?.subtitle || venue.description}</p>
      <div className="brand-stage__line" />
    </section>
  );
}
