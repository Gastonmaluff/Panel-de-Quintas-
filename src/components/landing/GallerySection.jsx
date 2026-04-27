export default function GallerySection({ venue }) {
  const [featured, ...images] = venue.galleryImages;

  return (
    <section className="section-shell gallery-section" id="galeria">
      <div className="section-heading">
        <p className="eyebrow">Paraíso privado</p>
        <h1>Una quinta boutique para celebrar con calma.</h1>
      </div>

      <div className="gallery-grid">
        <figure className="gallery-grid__featured">
          <img src={featured.src} alt={featured.alt} />
        </figure>
        {images.map((image) => (
          <figure key={image.src}>
            <img src={image.src} alt={image.alt} />
          </figure>
        ))}
        <article className="gallery-note">
          <p className="eyebrow">La experiencia</p>
          <h2>Natural, privada y cómoda.</h2>
          <p>
            Un entorno natural, privado y cómodo para cumpleaños, reuniones
            familiares, casamientos pequeños, eventos corporativos y
            celebraciones especiales.
          </p>
        </article>
      </div>
    </section>
  );
}
