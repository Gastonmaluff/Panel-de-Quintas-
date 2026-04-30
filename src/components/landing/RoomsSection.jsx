import { useMemo, useState } from "react";

function RoomTabs({ rooms, activeRoomId, onChange }) {
  return (
    <div className="rooms-tabs" role="tablist" aria-label="Habitaciones disponibles">
      {rooms.map((room) => (
        <button
          type="button"
          role="tab"
          aria-selected={room.id === activeRoomId}
          className={room.id === activeRoomId ? "is-active" : ""}
          key={room.id}
          onClick={() => onChange(room.id)}
        >
          {room.name}
        </button>
      ))}
    </div>
  );
}

export default function RoomsSection({ section, rooms = [] }) {
  const visibleRooms = useMemo(() => rooms.filter(Boolean), [rooms]);
  const [activeRoomId, setActiveRoomId] = useState(visibleRooms[0]?.id || "");

  const activeRoom =
    visibleRooms.find((room) => room.id === activeRoomId) || visibleRooms[0];

  if (section?.visible === false || !activeRoom) return null;

  return (
    <section className="rooms-section section-shell" id="hospedaje">
      <div className="rooms-section__intro">
        <p className="eyebrow">{section?.eyebrow || "Hospedaje"}</p>
        <h2>{section?.title || "Nuestras habitaciones"}</h2>
        <p>
          {section?.description ||
            "Espacios pensados para un descanso cómodo y tranquilo, con equipamiento esencial y una experiencia acogedora."}
        </p>
        <span>Consultá disponibilidad para hospedaje al momento de reservar tu evento.</span>
      </div>

      <article className="rooms-panel">
        <RoomTabs
          rooms={visibleRooms}
          activeRoomId={activeRoom.id}
          onChange={setActiveRoomId}
        />

        <div className="rooms-panel__image">
          <img src={activeRoom.image} alt={activeRoom.alt || activeRoom.name} />
        </div>

        <div className="rooms-panel__content">
          <div>
            {activeRoom.subtitle && <p className="eyebrow">{activeRoom.subtitle}</p>}
            <h3>{activeRoom.name}</h3>
            <p>{activeRoom.description}</p>
          </div>

          <dl className="rooms-features">
            {activeRoom.features.map((feature) => (
              <div key={`${activeRoom.id}-${feature.label}`}>
                <dt>{feature.label}</dt>
                <dd>{feature.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </article>
    </section>
  );
}
