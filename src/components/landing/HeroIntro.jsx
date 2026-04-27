export default function HeroIntro({ venue }) {
  return (
    <section className="brand-stage section-shell" id="inicio">
      <p className="brand-stage__copy">{venue.description}</p>
      <div className="brand-stage__line" />
    </section>
  );
}
