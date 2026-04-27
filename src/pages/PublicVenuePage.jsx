import AnimatedBrandHeader from "../components/landing/AnimatedBrandHeader.jsx";
import HeroIntro from "../components/landing/HeroIntro.jsx";
import GallerySection from "../components/landing/GallerySection.jsx";
import AmenitiesSection from "../components/landing/AmenitiesSection.jsx";
import AvailabilityCalendar from "../components/calendar/AvailabilityCalendar.jsx";
import QuoteCalculator from "../components/quote/QuoteCalculator.jsx";
import FinalCta from "../components/landing/FinalCta.jsx";
import Footer from "../components/landing/Footer.jsx";
import { availabilityMock, pricingRules } from "../data/venues.js";

export default function PublicVenuePage({ venue }) {
  return (
    <div className="public-page">
      <AnimatedBrandHeader venue={venue} />
      <main>
        <HeroIntro venue={venue} />
        <GallerySection venue={venue} />
        <AmenitiesSection amenities={venue.amenities} />
        <AvailabilityCalendar availability={availabilityMock} />
        <QuoteCalculator venue={venue} rules={pricingRules} availability={availabilityMock} />
        <FinalCta venue={venue} />
      </main>
      <Footer venue={venue} />
    </div>
  );
}
