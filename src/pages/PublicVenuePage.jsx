import { useEffect, useState } from "react";
import AnimatedBrandHeader from "../components/landing/AnimatedBrandHeader.jsx";
import HeroIntro from "../components/landing/HeroIntro.jsx";
import GallerySection from "../components/landing/GallerySection.jsx";
import AmenitiesSection from "../components/landing/AmenitiesSection.jsx";
import RoomsSection from "../components/landing/RoomsSection.jsx";
import AvailabilityCalendar from "../components/calendar/AvailabilityCalendar.jsx";
import QuoteCalculator from "../components/quote/QuoteCalculator.jsx";
import FinalCta from "../components/landing/FinalCta.jsx";
import Footer from "../components/landing/Footer.jsx";
import { availabilityMock, pricingRules } from "../data/venues.js";
import { publicContentMock } from "../data/adminData.js";
import { getPublicContent } from "../services/publicContent.js";
import BrandLogo from "../components/branding/BrandLogo.jsx";

function preloadImage(src) {
  return new Promise((resolve) => {
    if (!src) {
      resolve();
      return;
    }

    const image = new Image();
    image.onload = resolve;
    image.onerror = resolve;
    image.src = src;
  });
}

function getPriorityImages(content, venue) {
  return [
    content?.gallery?.[0]?.image,
    content?.gallery?.[1]?.image,
    content?.amenities?.[0]?.image,
    content?.rooms?.[0]?.image,
    content?.cta?.image,
    venue?.coverImage,
  ].filter(Boolean);
}

function PublicPageLoader() {
  return (
    <div className="public-page-loader">
      <BrandLogo variant="stacked" className="public-page-loader__logo" />
      <p>Cargando experiencia...</p>
      <div className="public-page-loader__skeleton">
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}

export default function PublicVenuePage({ venue }) {
  const [publicVenue, setPublicVenue] = useState(null);
  const [publicContent, setPublicContent] = useState(null);
  const [isLoadingContent, setIsLoadingContent] = useState(true);
  const [contentError, setContentError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function loadPublicContent() {
      setIsLoadingContent(true);
      setPublicContent(null);
      setContentError(null);

      try {
        const result = await getPublicContent(venue.id);
        if (!isMounted) return;
        const nextVenue = result.venue || venue;
        const nextContent = result.exists ? result.content : publicContentMock;

        await Promise.all(getPriorityImages(nextContent, nextVenue).slice(0, 5).map(preloadImage));

        if (!isMounted) return;
        setPublicVenue(nextVenue);
        setPublicContent(nextContent);
      } catch (error) {
        console.error("Error loading public venue content:", error);
        if (!isMounted) return;
        setContentError(error);
        await Promise.all(getPriorityImages(publicContentMock, venue).slice(0, 5).map(preloadImage));
        if (!isMounted) return;
        setPublicVenue(venue);
        setPublicContent(publicContentMock);
      } finally {
        if (isMounted) setIsLoadingContent(false);
      }
    }

    loadPublicContent();

    return () => {
      isMounted = false;
    };
  }, [venue.id]);

  if (isLoadingContent || !publicVenue || !publicContent) {
    return <PublicPageLoader />;
  }

  return (
    <div className="public-page" data-content-error={contentError ? "true" : "false"}>
      <AnimatedBrandHeader venue={publicVenue} />
      <main>
        <HeroIntro venue={publicVenue} content={publicContent.hero} />
        <GallerySection venue={publicVenue} content={publicContent} />
        <AmenitiesSection
          amenities={publicContent.amenities}
          section={publicContent.amenitiesSection}
        />
        <RoomsSection section={publicContent.roomsSection} rooms={publicContent.rooms} />
        <AvailabilityCalendar availability={availabilityMock} />
        <QuoteCalculator venue={publicVenue} rules={pricingRules} availability={availabilityMock} />
        <FinalCta venue={publicVenue} content={publicContent.cta} />
      </main>
      <Footer venue={publicVenue} content={publicContent.footer} />
    </div>
  );
}
