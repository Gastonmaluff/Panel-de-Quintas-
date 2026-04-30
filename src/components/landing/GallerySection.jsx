export default function GallerySection({ venue, content }) {
  const hasManagedGallery = Array.isArray(content?.gallery);
  const galleryImages = (content?.gallery || [])
    .filter((image) => image.visible ?? true)
    .sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
    .map((image) => ({
      src: image.image,
      alt: image.alt,
    }));
  const [featured, ...images] = hasManagedGallery ? galleryImages : venue.galleryImages;
  const hero = content?.hero || {};
  const experience = content?.experience || {};

  if (!featured) return null;

  return (
    <section className="section-shell gallery-section" id="galeria">
      <div className="section-heading">
        <p className="eyebrow">Paraíso privado</p>
        <h1>{hero.title || "Una quinta boutique para celebrar con calma."}</h1>
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
        {experience.visible !== false && (
          <article className="gallery-note">
            <p className="eyebrow">{experience.eyebrow || "La experiencia"}</p>
            <h2>{experience.title || "Natural, privada y cómoda."}</h2>
            <p>
              {experience.description ||
                "Un entorno natural, privado y cómodo para cumpleaños, reuniones familiares, casamientos pequeños, eventos corporativos y celebraciones especiales."}
            </p>
          </article>
        )}
      </div>
    </section>
  );
}
