import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const AUTOPLAY_MS = 5000;
const INTERACTION_PAUSE_MS = 6500;

const fallbackImages = [
  "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=900&q=84",
  "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=84",
];

function chunkItems(items, size) {
  const chunks = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

function getCardsPerSlide() {
  if (typeof window === "undefined") return 4;
  if (window.matchMedia("(max-width: 760px)").matches) return 1;
  if (window.matchMedia("(max-width: 900px)").matches) return 2;
  return 4;
}

function normalizeAmenity(amenity, index) {
  if (typeof amenity === "string") {
    return {
      title: amenity,
      description: "Comodidad incluida para que el evento fluya con tranquilidad.",
      image: fallbackImages[index % fallbackImages.length],
      alt: amenity,
    };
  }

  return {
    title: amenity.title,
    description: amenity.description,
    image: amenity.image || fallbackImages[index % fallbackImages.length],
    alt: amenity.alt || amenity.title,
  };
}

function AmenityCard({ amenity }) {
  return (
    <article className="amenity-card">
      <div className="amenity-card__image">
        <img src={amenity.image} alt={amenity.alt} />
      </div>
      <div className="amenity-card__content">
        <span className="amenity-card__marker" />
        <h3>{amenity.title}</h3>
        <p>{amenity.description}</p>
      </div>
    </article>
  );
}

export default function AmenitiesSection({ amenities = [], section }) {
  const isHoveringRef = useRef(false);
  const pauseUntilRef = useRef(0);
  const [cardsPerSlide, setCardsPerSlide] = useState(getCardsPerSlide);
  const [activeSlide, setActiveSlide] = useState(0);

  const visibleAmenities = useMemo(
    () =>
      amenities
        .filter((amenity) => amenity.active ?? amenity.visible ?? true)
        .sort((a, b) => Number(a.order || 0) - Number(b.order || 0)),
    [amenities],
  );

  const normalizedAmenities = useMemo(
    () => visibleAmenities.map((amenity, index) => normalizeAmenity(amenity, index)),
    [visibleAmenities],
  );

  const slides = useMemo(
    () => chunkItems(normalizedAmenities, cardsPerSlide),
    [cardsPerSlide, normalizedAmenities],
  );

  useEffect(() => {
    const updateCardsPerSlide = () => setCardsPerSlide(getCardsPerSlide());
    updateCardsPerSlide();

    window.addEventListener("resize", updateCardsPerSlide);
    return () => window.removeEventListener("resize", updateCardsPerSlide);
  }, []);

  useEffect(() => {
    setActiveSlide((current) => (slides.length ? current % slides.length : 0));
  }, [slides.length]);

  useEffect(() => {
    if (slides.length <= 1) return undefined;

    const interval = window.setInterval(() => {
      if (isHoveringRef.current || Date.now() < pauseUntilRef.current) return;
      setActiveSlide((current) => (current + 1) % slides.length);
    }, AUTOPLAY_MS);

    return () => window.clearInterval(interval);
  }, [slides.length]);

  const navigate = (direction) => {
    if (!slides.length) return;
    pauseUntilRef.current = Date.now() + INTERACTION_PAUSE_MS;
    setActiveSlide((current) => (current + direction + slides.length) % slides.length);
  };

  const goToSlide = (index) => {
    pauseUntilRef.current = Date.now() + INTERACTION_PAUSE_MS;
    setActiveSlide(index);
  };

  const pauseOnHover = () => {
    isHoveringRef.current = true;
  };

  const resumeAfterHover = () => {
    isHoveringRef.current = false;
    pauseUntilRef.current = Date.now() + 1200;
  };

  if (section?.visible === false || !normalizedAmenities.length) return null;

  return (
    <section className="amenities-band" id="servicios">
      <div className="section-shell">
        <div className="section-heading section-heading--center">
          <p className="eyebrow">{section?.eyebrow || "Servicios incluidos"}</p>
          <h2>{section?.title || "Todo lo esencial, resuelto con sobriedad."}</h2>
          <p>
            {section?.description ||
              "Espacios y comodidades pensados para que el evento fluya sin perder esa sensación de quinta privada."}
          </p>
        </div>

        <div
          className="amenities-carousel"
          onMouseEnter={pauseOnHover}
          onMouseLeave={resumeAfterHover}
        >
          <button
            className="amenities-carousel__arrow amenities-carousel__arrow--prev"
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Ver servicios anteriores"
          >
            <ChevronLeft size={22} strokeWidth={1.7} aria-hidden="true" />
          </button>

          <div className="amenities-carousel__viewport" aria-live="polite">
            <div
              className="amenities-carousel__track"
              style={{ transform: `translate3d(${-activeSlide * 100}%, 0, 0)` }}
            >
              {slides.map((slide, slideIndex) => (
                <div
                  className="amenities-carousel__slide"
                  data-cards={cardsPerSlide}
                  key={slide.map((amenity) => amenity.title).join("-")}
                  aria-hidden={slideIndex !== activeSlide}
                >
                  {slide.map((amenity) => (
                    <AmenityCard amenity={amenity} key={amenity.title} />
                  ))}
                </div>
              ))}
            </div>
          </div>

          <button
            className="amenities-carousel__arrow amenities-carousel__arrow--next"
            type="button"
            onClick={() => navigate(1)}
            aria-label="Ver más servicios"
          >
            <ChevronRight size={22} strokeWidth={1.7} aria-hidden="true" />
          </button>
        </div>

        {slides.length > 1 && (
          <div className="amenities-carousel__dots" aria-label="Páginas de servicios">
            {slides.map((slide, index) => (
              <button
                className={index === activeSlide ? "is-active" : ""}
                type="button"
                key={slide.map((amenity) => amenity.title).join("-dot")}
                onClick={() => goToSlide(index)}
                aria-label={`Ir al bloque ${index + 1}`}
                aria-current={index === activeSlide}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
