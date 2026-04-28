import { useState } from "react";
import { publicContentMock } from "../data/adminData.js";
import { venues } from "../data/venues.js";

function TextField({ label, value, onChange, type = "text" }) {
  return (
    <label>
      {label}
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function TextAreaField({ label, value, onChange }) {
  return (
    <label>
      {label}
      <textarea value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function VisibilityToggle({ checked, onChange }) {
  return (
    <label className="admin-toggle">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>Sección visible</span>
    </label>
  );
}

export default function AdminContent() {
  const [venue, setVenue] = useState(venues[0]);
  const [content, setContent] = useState(publicContentMock);

  const updateVenue = (key, value) => {
    setVenue((current) => ({ ...current, [key]: value }));
  };

  const updateSection = (section, key, value) => {
    setContent((current) => ({
      ...current,
      [section]: {
        ...current[section],
        [key]: value,
      },
    }));
  };

  const updateSocialLink = (index, value) => {
    setContent((current) => {
      const socialLinks = [...current.footer.socialLinks];
      socialLinks[index] = {
        label: socialLinks[index]?.label || (index === 0 ? "Instagram" : "Facebook"),
        url: value,
      };

      return {
        ...current,
        footer: {
          ...current.footer,
          socialLinks,
        },
      };
    });
  };

  const updateArrayItem = (section, id, key, value) => {
    setContent((current) => ({
      ...current,
      [section]: current[section].map((item) =>
        item.id === id ? { ...item, [key]: value } : item,
      ),
    }));
  };

  const addGalleryImage = () => {
    setContent((current) => ({
      ...current,
      gallery: [
        ...current.gallery,
        {
          id: `gallery-${Date.now()}`,
          image: "",
          alt: "",
          order: current.gallery.length + 1,
          featured: false,
        },
      ],
    }));
  };

  const addAmenity = () => {
    setContent((current) => ({
      ...current,
      amenities: [
        ...current.amenities,
        {
          id: `amenity-${Date.now()}`,
          title: "Nuevo servicio",
          description: "",
          image: "",
          alt: "",
          order: current.amenities.length + 1,
          active: true,
        },
      ],
    }));
  };

  return (
    <section className="admin-section">
      <div className="admin-section-heading">
        <div>
          <h2>Contenido de la página pública</h2>
          <p>Mock editable listo para migrar a Firestore y Firebase Storage.</p>
        </div>
        <button type="button">Guardar borrador</button>
      </div>

      <div className="admin-editor-grid">
        <article className="admin-editor-card">
          <h3>Branding / datos generales</h3>
          <div className="config-form config-form--stacked">
            <TextField label="Nombre de la quinta" value={venue.name} onChange={(value) => updateVenue("name", value)} />
            <TextField label="Subtítulo" value={venue.subtitle} onChange={(value) => updateVenue("subtitle", value)} />
            <TextField label="WhatsApp" value={venue.whatsappNumber} onChange={(value) => updateVenue("whatsappNumber", value)} />
            <TextField label="Ubicación" value={venue.location} onChange={(value) => updateVenue("location", value)} />
            <TextField label="Logo principal" value={venue.logoStacked} onChange={(value) => updateVenue("logoStacked", value)} />
            <TextField label="Logo horizontal" value={venue.logoHorizontal} onChange={(value) => updateVenue("logoHorizontal", value)} />
            <TextField label="Isotipo" value={venue.logoMark} onChange={(value) => updateVenue("logoMark", value)} />
          </div>
        </article>

        <article className="admin-editor-card">
          <h3>Hero / portada</h3>
          <div className="config-form config-form--stacked">
            <VisibilityToggle
              checked={content.hero.visible}
              onChange={(value) => updateSection("hero", "visible", value)}
            />
            <TextField label="Frase principal" value={content.hero.title} onChange={(value) => updateSection("hero", "title", value)} />
            <TextAreaField label="Bajada" value={content.hero.subtitle} onChange={(value) => updateSection("hero", "subtitle", value)} />
            <TextField label="Imagen principal" value={content.hero.image} onChange={(value) => updateSection("hero", "image", value)} />
            <TextField label="Texto CTA" value={content.hero.ctaText} onChange={(value) => updateSection("hero", "ctaText", value)} />
          </div>
        </article>

        <article className="admin-editor-card">
          <h3>La experiencia</h3>
          <div className="config-form config-form--stacked">
            <VisibilityToggle
              checked={content.experience.visible}
              onChange={(value) => updateSection("experience", "visible", value)}
            />
            <TextField label="Etiqueta superior" value={content.experience.eyebrow} onChange={(value) => updateSection("experience", "eyebrow", value)} />
            <TextField label="Título" value={content.experience.title} onChange={(value) => updateSection("experience", "title", value)} />
            <TextAreaField label="Descripción" value={content.experience.description} onChange={(value) => updateSection("experience", "description", value)} />
            <TextField label="Imagen" value={content.experience.image} onChange={(value) => updateSection("experience", "image", value)} />
          </div>
        </article>

        <article className="admin-editor-card">
          <div className="admin-editor-card__heading">
            <h3>Galería</h3>
            <button type="button" onClick={addGalleryImage}>
              Agregar imagen
            </button>
          </div>
          <div className="admin-repeat-list">
            {content.gallery.map((item) => (
              <div className="admin-repeat-item" key={item.id}>
                <TextField label="Imagen" value={item.image} onChange={(value) => updateArrayItem("gallery", item.id, "image", value)} />
                <TextField label="Texto alternativo" value={item.alt} onChange={(value) => updateArrayItem("gallery", item.id, "alt", value)} />
                <TextField label="Orden" type="number" value={item.order} onChange={(value) => updateArrayItem("gallery", item.id, "order", Number(value))} />
                <VisibilityToggle
                  checked={item.featured}
                  onChange={(value) => updateArrayItem("gallery", item.id, "featured", value)}
                />
              </div>
            ))}
          </div>
        </article>

        <article className="admin-editor-card admin-editor-card--wide">
          <h3>Servicios incluidos / amenities</h3>
          <div className="config-form">
            <TextField label="Etiqueta" value={content.amenitiesSection.eyebrow} onChange={(value) => updateSection("amenitiesSection", "eyebrow", value)} />
            <TextField label="Título" value={content.amenitiesSection.title} onChange={(value) => updateSection("amenitiesSection", "title", value)} />
            <TextAreaField label="Descripción" value={content.amenitiesSection.description} onChange={(value) => updateSection("amenitiesSection", "description", value)} />
            <VisibilityToggle
              checked={content.amenitiesSection.visible}
              onChange={(value) => updateSection("amenitiesSection", "visible", value)}
            />
          </div>
          <button type="button" onClick={addAmenity}>
            Agregar servicio
          </button>
          <div className="admin-amenity-editor">
            {content.amenities.map((amenity) => (
              <article key={amenity.id}>
                <img src={amenity.image} alt={amenity.alt} />
                <TextField label="Título" value={amenity.title} onChange={(value) => updateArrayItem("amenities", amenity.id, "title", value)} />
                <TextAreaField label="Descripción" value={amenity.description} onChange={(value) => updateArrayItem("amenities", amenity.id, "description", value)} />
                <TextField label="Imagen" value={amenity.image} onChange={(value) => updateArrayItem("amenities", amenity.id, "image", value)} />
                <TextField label="Alt" value={amenity.alt} onChange={(value) => updateArrayItem("amenities", amenity.id, "alt", value)} />
                <TextField label="Orden" type="number" value={amenity.order} onChange={(value) => updateArrayItem("amenities", amenity.id, "order", Number(value))} />
                <VisibilityToggle
                  checked={amenity.active}
                  onChange={(value) => updateArrayItem("amenities", amenity.id, "active", value)}
                />
              </article>
            ))}
          </div>
        </article>

        <article className="admin-editor-card">
          <h3>CTA final</h3>
          <div className="config-form config-form--stacked">
            <VisibilityToggle
              checked={content.cta.visible}
              onChange={(value) => updateSection("cta", "visible", value)}
            />
            <TextField label="Título" value={content.cta.title} onChange={(value) => updateSection("cta", "title", value)} />
            <TextAreaField label="Descripción" value={content.cta.description} onChange={(value) => updateSection("cta", "description", value)} />
            <TextField label="Imagen de fondo" value={content.cta.image} onChange={(value) => updateSection("cta", "image", value)} />
            <TextField label="Texto botón" value={content.cta.buttonText} onChange={(value) => updateSection("cta", "buttonText", value)} />
          </div>
        </article>

        <article className="admin-editor-card">
          <h3>Footer</h3>
          <div className="config-form config-form--stacked">
            <TextField label="Texto legal" value={content.footer.text} onChange={(value) => updateSection("footer", "text", value)} />
            <TextField label="Ubicación" value={content.footer.location} onChange={(value) => updateSection("footer", "location", value)} />
            <TextField label="Instagram" value={content.footer.socialLinks[0]?.url || ""} onChange={(value) => updateSocialLink(0, value)} />
            <TextField label="Facebook" value={content.footer.socialLinks[1]?.url || ""} onChange={(value) => updateSocialLink(1, value)} />
          </div>
        </article>
      </div>
    </section>
  );
}
