import { useEffect, useId, useState } from "react";
import { Trash2 } from "lucide-react";
import { auth } from "../config/firebase.js";
import { publicContentMock } from "../data/adminData.js";
import { venueId, venues } from "../data/venues.js";
import {
  getPublicContent,
  savePublicContent,
  uploadVenueImage,
} from "../services/publicContent.js";

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

function VisibilityToggle({ checked, onChange, label = "Visible en la página" }) {
  return (
    <label className="admin-toggle">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}

function ImagePicker({ label, value, onChange, buttonText = "Cambiar imagen" }) {
  const inputId = useId();

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    onChange(URL.createObjectURL(file), file);
    event.target.value = "";
  };

  return (
    <div className="admin-image-picker">
      <span>{label}</span>
      <div className="admin-image-picker__preview">
        {value ? <img src={value} alt="" /> : <small>Sin imagen</small>}
      </div>
      <label className="admin-image-picker__button" htmlFor={inputId}>
        {value ? buttonText : "Agregar imagen"}
      </label>
      <input id={inputId} type="file" accept="image/*" onChange={handleFileChange} />
    </div>
  );
}

function CollapsibleCard({ title, children }) {
  return (
    <details className="admin-editor-card admin-collapsible-card">
      <summary>{title}</summary>
      <div className="admin-collapsible-card__content">{children}</div>
    </details>
  );
}

export default function AdminContent() {
  const [venue, setVenue] = useState(venues[0]);
  const [content, setContent] = useState(publicContentMock);
  const [pendingImages, setPendingImages] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isDirty, setIsDirty] = useState(false);
  const [saveState, setSaveState] = useState("idle");
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadContent() {
      setIsLoading(true);
      try {
        const result = await getPublicContent(venueId);
        if (!isMounted) return;
        setVenue(result.venue);
        setContent(result.content);
        setPendingImages({});
        setIsDirty(false);
        setFeedback(result.exists ? "" : "Usando contenido inicial. Guardá los cambios para publicarlo.");
      } catch (error) {
        console.error("Error loading public content:", error);
        if (!isMounted) return;
        setFeedback("No se pudo cargar el contenido guardado. Se muestra una versión inicial.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadContent();

    return () => {
      isMounted = false;
    };
  }, []);

  const markDirty = () => {
    setIsDirty(true);
    if (saveState !== "saving") {
      setSaveState("idle");
    }
  };

  const updateVenue = (key, value) => {
    markDirty();
    setVenue((current) => ({ ...current, [key]: value }));
  };

  const updateSection = (section, key, value) => {
    markDirty();
    setContent((current) => ({
      ...current,
      [section]: {
        ...current[section],
        [key]: value,
      },
    }));
  };

  const updateSocialLink = (index, value) => {
    markDirty();
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
    markDirty();
    setContent((current) => ({
      ...current,
      [section]: current[section].map((item) =>
        item.id === id ? { ...item, [key]: value } : item,
      ),
    }));
  };

  const removeArrayItem = (section, id) => {
    markDirty();
    setPendingImages((current) => {
      const next = { ...current };
      delete next[`${section}:${id}.image`];
      return next;
    });
    setContent((current) => ({
      ...current,
      [section]: current[section].filter((item) => item.id !== id),
    }));
  };

  const addGalleryImage = () => {
    markDirty();
    setContent((current) => ({
      ...current,
      gallery: [
        ...current.gallery,
        {
          id: `gallery-${Date.now()}`,
          image: "",
          alt: "",
          order: current.gallery.length + 1,
          visible: true,
        },
      ],
    }));
  };

  const addAmenity = () => {
    markDirty();
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

  const updateSectionImage = (section, value, file) => {
    updateSection(section, "image", value);
    if (!file) return;
    setPendingImages((current) => ({
      ...current,
      [`${section}.image`]: { file, storageSection: section },
    }));
  };

  const updateRoomFeature = (roomId, featureIndex, key, value) => {
    markDirty();
    setContent((current) => ({
      ...current,
      rooms: current.rooms.map((room) =>
        room.id === roomId
          ? {
              ...room,
              features: room.features.map((feature, index) =>
                index === featureIndex ? { ...feature, [key]: value } : feature,
              ),
            }
          : room,
      ),
    }));
  };

  const addRoomFeature = (roomId) => {
    markDirty();
    setContent((current) => ({
      ...current,
      rooms: current.rooms.map((room) =>
        room.id === roomId
          ? {
              ...room,
              features: [...room.features, { label: "Detalle", value: "" }],
            }
          : room,
      ),
    }));
  };

  const removeRoomFeature = (roomId, featureIndex) => {
    markDirty();
    setContent((current) => ({
      ...current,
      rooms: current.rooms.map((room) =>
        room.id === roomId
          ? {
              ...room,
              features: room.features.filter((_, index) => index !== featureIndex),
            }
          : room,
      ),
    }));
  };

  const updateArrayImage = (section, id, value, file) => {
    updateArrayItem(section, id, "image", value);
    if (!file) return;
    setPendingImages((current) => ({
      ...current,
      [`${section}:${id}.image`]: { file, storageSection: section },
    }));
  };

  const setUploadedImage = (draft, path, imageUrl) => {
    if (path.includes(":")) {
      const [collection, rest] = path.split(":");
      const [id] = rest.split(".");
      draft[collection] = draft[collection].map((item) =>
        item.id === id ? { ...item, image: imageUrl } : item,
      );
      return;
    }

    const [section] = path.split(".");
    draft[section] = {
      ...draft[section],
      image: imageUrl,
    };
  };

  const uploadPendingImages = async () => {
    const contentDraft = JSON.parse(JSON.stringify(content));
    const entries = Object.entries(pendingImages);

    console.log("Uploading pending images...");
    console.log("Pending image count:", entries.length);

    for (const [path, { file, storageSection }] of entries) {
      try {
        const imageUrl = await uploadVenueImage(venueId, storageSection, file);
        setUploadedImage(contentDraft, path, imageUrl);
      } catch (error) {
        console.error("Error uploading image:", error);
        console.error("Error code:", error?.code);
        console.error("Error message:", error?.message);
        console.error("Image upload path:", path);
        console.error("File info:", file?.name, file?.type, file?.size);
        throw error;
      }
    }

    return contentDraft;
  };

  const validateContent = () => {
    if (!venue.name.trim()) return "El nombre de la quinta no puede quedar vacío.";
    if (!venue.whatsappNumber.trim()) return "Agregá un número de WhatsApp para las consultas.";
    return "";
  };

  const handleSave = async () => {
    console.log("Starting savePublicContent...");

    const validationMessage = validateContent();
    if (validationMessage) {
      setSaveState("error");
      setFeedback(validationMessage);
      return;
    }

    if (!auth.currentUser) {
      console.error("No hay sesión activa para guardar cambios.");
      setSaveState("error");
      setFeedback("No hay sesión activa para guardar cambios.");
      return;
    }

    setSaveState("saving");
    setFeedback("");

    try {
      const contentToSave = await uploadPendingImages();
      console.log("Saving Firestore document...");
      await savePublicContent(venueId, venue, contentToSave);
      setContent(contentToSave);
      setPendingImages({});
      setIsDirty(false);
      setSaveState("success");
      setFeedback("Cambios guardados");
      console.log("Public content saved successfully.");
      window.setTimeout(() => {
        setSaveState((current) => (current === "success" ? "idle" : current));
      }, 2800);
    } catch (error) {
      console.error("Error saving public content:", error);
      console.error("Error code:", error?.code);
      console.error("Error message:", error?.message);
      if (error?.code === "permission-denied") {
        console.error("Firebase rules are blocking this write.");
      }
      setSaveState("error");
      setFeedback("No se pudieron guardar los cambios. Revisá la conexión o permisos de Firebase.");
    }
  };

  const saveButtonText = {
    idle: "Guardar cambios",
    saving: "Guardando...",
    success: "Cambios guardados",
    error: "Error al guardar",
  }[saveState];

  return (
    <section className="admin-section">
      <div className="admin-section-heading">
        <div>
          <h2>Contenido de la página pública</h2>
          <p>
            {isLoading
              ? "Cargando contenido guardado..."
              : "Actualizá textos, imágenes y secciones visibles para tus visitantes."}
          </p>
          {!isLoading && isDirty && <span className="admin-save-status">Cambios sin guardar</span>}
          {feedback && <span className={`admin-save-status admin-save-status--${saveState}`}>{feedback}</span>}
        </div>
        <button type="button" onClick={handleSave} disabled={isLoading || saveState === "saving"}>
          {saveButtonText}
        </button>
      </div>

      <div className="admin-editor-grid">
        <article className="admin-editor-card">
          <h3>Marca y datos generales</h3>
          <div className="config-form config-form--stacked">
            <TextField label="Nombre de la quinta" value={venue.name} onChange={(value) => updateVenue("name", value)} />
            <TextField label="Subtítulo" value={venue.subtitle} onChange={(value) => updateVenue("subtitle", value)} />
            <TextField label="WhatsApp" value={venue.whatsappNumber} onChange={(value) => updateVenue("whatsappNumber", value)} />
            <TextField label="Ubicación" value={venue.location} onChange={(value) => updateVenue("location", value)} />
          </div>
        </article>

        <article className="admin-editor-card">
          <h3>Portada</h3>
          <div className="config-form config-form--stacked">
            <VisibilityToggle
              checked={content.hero.visible}
              onChange={(value) => updateSection("hero", "visible", value)}
            />
            <TextField label="Frase principal" value={content.hero.title} onChange={(value) => updateSection("hero", "title", value)} />
            <TextAreaField label="Descripción corta" value={content.hero.subtitle} onChange={(value) => updateSection("hero", "subtitle", value)} />
            <TextField label="Texto del botón" value={content.hero.ctaText} onChange={(value) => updateSection("hero", "ctaText", value)} />
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
              <div className="admin-repeat-item admin-gallery-item" key={item.id}>
                <ImagePicker label="Foto" value={item.image} onChange={(value, file) => updateArrayImage("gallery", item.id, value, file)} />
                <TextField label="Texto alternativo" value={item.alt} onChange={(value) => updateArrayItem("gallery", item.id, "alt", value)} />
                <TextField label="Orden" type="number" value={item.order} onChange={(value) => updateArrayItem("gallery", item.id, "order", Number(value))} />
                <VisibilityToggle
                  checked={item.visible ?? true}
                  label="Visible"
                  onChange={(value) => updateArrayItem("gallery", item.id, "visible", value)}
                />
                <button
                  type="button"
                  className="admin-danger-button admin-icon-danger-button"
                  onClick={() => removeArrayItem("gallery", item.id)}
                  aria-label="Eliminar imagen"
                  title="Eliminar imagen"
                >
                  <Trash2 size={16} strokeWidth={1.8} aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        </article>

        <article className="admin-editor-card admin-editor-card--wide">
          <h3>Servicios incluidos</h3>
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
                <ImagePicker label="Imagen del servicio" value={amenity.image} onChange={(value, file) => updateArrayImage("amenities", amenity.id, value, file)} />
                <TextField label="Título" value={amenity.title} onChange={(value) => updateArrayItem("amenities", amenity.id, "title", value)} />
                <TextAreaField label="Descripción" value={amenity.description} onChange={(value) => updateArrayItem("amenities", amenity.id, "description", value)} />
                <TextField label="Texto alternativo" value={amenity.alt} onChange={(value) => updateArrayItem("amenities", amenity.id, "alt", value)} />
                <TextField label="Orden" type="number" value={amenity.order} onChange={(value) => updateArrayItem("amenities", amenity.id, "order", Number(value))} />
                <VisibilityToggle
                  checked={amenity.active}
                  label="Visible"
                  onChange={(value) => updateArrayItem("amenities", amenity.id, "active", value)}
                />
                <button type="button" className="admin-danger-button" onClick={() => removeArrayItem("amenities", amenity.id)}>
                  Eliminar servicio
                </button>
              </article>
            ))}
          </div>
        </article>

        <article className="admin-editor-card admin-editor-card--wide">
          <h3>Hospedaje y habitaciones</h3>
          <div className="config-form">
            <TextField label="Etiqueta" value={content.roomsSection.eyebrow} onChange={(value) => updateSection("roomsSection", "eyebrow", value)} />
            <TextField label="Título" value={content.roomsSection.title} onChange={(value) => updateSection("roomsSection", "title", value)} />
            <TextAreaField label="Descripción" value={content.roomsSection.description} onChange={(value) => updateSection("roomsSection", "description", value)} />
            <VisibilityToggle
              checked={content.roomsSection.visible}
              onChange={(value) => updateSection("roomsSection", "visible", value)}
            />
          </div>

          <div className="admin-room-editor">
            {content.rooms.map((room) => (
              <article key={room.id}>
                <ImagePicker label="Imagen de la habitación" value={room.image} onChange={(value, file) => updateArrayImage("rooms", room.id, value, file)} />
                <div className="config-form config-form--stacked">
                  <TextField label="Nombre" value={room.name} onChange={(value) => updateArrayItem("rooms", room.id, "name", value)} />
                  <TextField label="Subtítulo" value={room.subtitle} onChange={(value) => updateArrayItem("rooms", room.id, "subtitle", value)} />
                  <TextAreaField label="Descripción" value={room.description} onChange={(value) => updateArrayItem("rooms", room.id, "description", value)} />
                  <TextField label="Texto alternativo" value={room.alt} onChange={(value) => updateArrayItem("rooms", room.id, "alt", value)} />
                </div>

                <div className="admin-room-features">
                  <div className="admin-editor-card__heading">
                    <h4>Características</h4>
                    <button type="button" onClick={() => addRoomFeature(room.id)}>
                      Agregar detalle
                    </button>
                  </div>
                  {room.features.map((feature, index) => (
                    <div className="admin-room-feature-row" key={`${room.id}-${feature.label}-${index}`}>
                      <TextField label="Dato" value={feature.label} onChange={(value) => updateRoomFeature(room.id, index, "label", value)} />
                      <TextField label="Valor" value={feature.value} onChange={(value) => updateRoomFeature(room.id, index, "value", value)} />
                      <button
                        type="button"
                        className="admin-danger-button admin-icon-danger-button"
                        onClick={() => removeRoomFeature(room.id, index)}
                        aria-label="Eliminar característica"
                        title="Eliminar característica"
                      >
                        <Trash2 size={16} strokeWidth={1.8} aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </article>

        <CollapsibleCard title="Llamado final">
          <div className="config-form config-form--stacked">
            <VisibilityToggle
              checked={content.cta.visible}
              onChange={(value) => updateSection("cta", "visible", value)}
            />
            <TextField label="Título" value={content.cta.title} onChange={(value) => updateSection("cta", "title", value)} />
            <TextAreaField label="Descripción" value={content.cta.description} onChange={(value) => updateSection("cta", "description", value)} />
            <ImagePicker label="Imagen de fondo" value={content.cta.image} onChange={(value, file) => updateSectionImage("cta", value, file)} />
            <TextField label="Texto del botón" value={content.cta.buttonText} onChange={(value) => updateSection("cta", "buttonText", value)} />
          </div>
        </CollapsibleCard>

        <CollapsibleCard title="Pie de página">
          <div className="config-form config-form--stacked">
            <TextField label="Texto legal" value={content.footer.text} onChange={(value) => updateSection("footer", "text", value)} />
            <TextField label="Ubicación" value={content.footer.location} onChange={(value) => updateSection("footer", "location", value)} />
            <TextField label="Instagram" value={content.footer.socialLinks[0]?.url || ""} onChange={(value) => updateSocialLink(0, value)} />
            <TextField label="Facebook" value={content.footer.socialLinks[1]?.url || ""} onChange={(value) => updateSocialLink(1, value)} />
          </div>
        </CollapsibleCard>
      </div>
    </section>
  );
}
