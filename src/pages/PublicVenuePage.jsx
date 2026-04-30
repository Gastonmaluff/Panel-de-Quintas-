import { useEffect, useState } from "react";
import AnimatedBrandHeader from "../components/landing/AnimatedBrandHeader.jsx";
import HeroIntro from "../components/landing/HeroIntro.jsx";
import GallerySection from "../components/landing/GallerySection.jsx";
import AmenitiesSection from "../components/landing/AmenitiesSection.jsx";
import AvailabilityCalendar from "../components/calendar/AvailabilityCalendar.jsx";
import QuoteCalculator from "../components/quote/QuoteCalculator.jsx";
import FinalCta from "../components/landing/FinalCta.jsx";
import Footer from "../components/landing/Footer.jsx";
import { availabilityMock, pricingRules } from "../data/venues.js";
import { publicContentMock } from "../data/adminData.js";
import { getPublicContent } from "../services/publicContent.js";

export default function PublicVenuePage({ venue }) {
  const [publicVenue, setPublicVenue] = useState(venue);
  const [publicContent, setPublicContent] = useState(publicContentMock);

  useEffect(() => {
    let isMounted = true;

    async function loadPublicContent() {
      try {
        const result = await getPublicContent(venue.id);
        if (!isMounted) return;
        setPublicVenue(result.venue);
        setPublicContent(result.content);
      } catch (error) {
        console.error("Error loading public venue content:", error);
      }
    }

    loadPublicContent();

    return () => {
      isMounted = false;
    };
  }, [venue.id]);

  return (
    <div className="public-page">
      <AnimatedBrandHeader venue={publicVenue} />
      <main>
        <HeroIntro venue={publicVenue} content={publicContent.hero} />
        <GallerySection venue={publicVenue} content={publicContent} />
        <AmenitiesSection
          amenities={publicContent.amenities}
          section={publicContent.amenitiesSection}
        />
        <AvailabilityCalendar availability={availabilityMock} />
        <QuoteCalculator venue={publicVenue} rules={pricingRules} availability={availabilityMock} />
        <FinalCta venue={publicVenue} content={publicContent.cta} />
      </main>
      <Footer venue={publicVenue} content={publicContent.footer} />
    </div>
  );
}
