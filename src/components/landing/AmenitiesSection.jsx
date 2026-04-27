const amenityDescriptions = {
  Piscina: "Área de agua para eventos de día, pool days y celebraciones familiares.",
  Quincho: "Espacio social cubierto para mesas, servicio y encuentros extendidos.",
  Parrilla: "Parrilla lista para asados, catering propio o apoyo gastronómico.",
  "Cocina equipada": "Apoyo funcional para preparación, emplatado y conservación.",
  Baños: "Baños cuidados para invitados y eventos de larga duración.",
  Estacionamiento: "Ingreso cómodo para invitados y proveedores.",
  "Área infantil": "Sector pensado para celebraciones familiares con niños.",
  Seguridad: "Privacidad, control de ingreso y tranquilidad durante el evento.",
  "Espacio verde": "Jardín amplio para fotos, ceremonias y momentos al aire libre.",
  "Salón climatizado": "Área interior confortable para encuentros más formales.",
};

export default function AmenitiesSection({ amenities }) {
  return (
    <section className="amenities-band" id="servicios">
      <div className="section-shell">
        <div className="section-heading section-heading--center">
          <p className="eyebrow">Servicios incluidos</p>
          <h2>Todo lo esencial, resuelto con sobriedad.</h2>
          <p>
            Espacios y comodidades pensados para que el evento fluya sin perder
            esa sensación de quinta privada.
          </p>
        </div>

        <div className="amenities-grid">
          {amenities.map((amenity) => (
            <article className="amenity-card" key={amenity}>
              <span className="amenity-card__marker" />
              <h3>{amenity}</h3>
              <p>{amenityDescriptions[amenity]}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
