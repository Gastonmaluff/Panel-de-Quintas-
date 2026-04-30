import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { db, storage } from "../config/firebase.js";
import { publicContentMock } from "../data/adminData.js";
import { venues } from "../data/venues.js";

export const DEFAULT_VENUE_ID = "paraiso-escondido";
const CONTENT_DOC_PATH = ["sections", "publicContent"];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function sanitizeFileName(fileName) {
  return fileName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9.-]/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();
}

function imageFrom(item, fallback = "") {
  return item?.imageUrl || item?.image || fallback;
}

function normalizeVenue(venueData = {}, contentData = {}) {
  const baseVenue = venues.find((venue) => venue.id === DEFAULT_VENUE_ID) || venues[0];
  const branding = contentData.branding || {};

  return {
    ...baseVenue,
    ...venueData,
    name: branding.name || venueData.name || baseVenue.name,
    subtitle: branding.subtitle || venueData.subtitle || baseVenue.subtitle,
    whatsappNumber:
      branding.whatsapp || venueData.whatsappNumber || venueData.whatsapp || baseVenue.whatsappNumber,
    location: branding.location || venueData.location || baseVenue.location,
  };
}

export function normalizePublicContent(contentData = {}) {
  const defaults = clone(publicContentMock);

  return {
    ...defaults,
    ...contentData,
    hero: {
      ...defaults.hero,
      ...contentData.hero,
      image: imageFrom(contentData.hero, defaults.hero.image),
    },
    experience: {
      ...defaults.experience,
      ...contentData.experience,
      image: imageFrom(contentData.experience, defaults.experience.image),
    },
    gallery: (Array.isArray(contentData.gallery) ? contentData.gallery : defaults.gallery).map((item, index) => ({
      id: item.id || `gallery-${index + 1}`,
      image: imageFrom(item),
      alt: item.alt || "",
      order: Number(item.order || index + 1),
      featured: Boolean(item.featured),
      visible: item.visible ?? true,
    })),
    amenitiesSection: {
      ...defaults.amenitiesSection,
      ...contentData.amenitiesSection,
    },
    amenities: (Array.isArray(contentData.amenities) ? contentData.amenities : defaults.amenities).map(
      (item, index) => ({
        id: item.id || `amenity-${index + 1}`,
        title: item.title || "Servicio",
        description: item.description || "",
        image: imageFrom(item),
        alt: item.alt || item.title || "Servicio",
        order: Number(item.order || index + 1),
        active: item.active ?? item.visible ?? true,
      }),
    ),
    cta: {
      ...defaults.cta,
      ...contentData.cta,
      image: imageFrom(contentData.cta, defaults.cta.image),
    },
    footer: {
      ...defaults.footer,
      ...contentData.footer,
      text: contentData.footer?.text || contentData.footer?.legalText || defaults.footer.text,
      socialLinks:
        contentData.footer?.socialLinks ||
        [
          { label: "Instagram", url: contentData.footer?.instagram || "" },
          { label: "Facebook", url: contentData.footer?.facebook || "" },
        ],
    },
  };
}

function serializeContent(content, venue) {
  return {
    branding: {
      name: venue.name,
      subtitle: venue.subtitle,
      whatsapp: venue.whatsappNumber,
      location: venue.location,
    },
    hero: {
      visible: content.hero.visible,
      title: content.hero.title,
      subtitle: content.hero.subtitle,
      imageUrl: content.hero.image || "",
      ctaText: content.hero.ctaText,
    },
    experience: {
      visible: content.experience.visible,
      eyebrow: content.experience.eyebrow,
      title: content.experience.title,
      description: content.experience.description,
      imageUrl: content.experience.image || "",
    },
    gallery: [...content.gallery]
      .sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
      .map((item, index) => ({
        id: item.id,
        imageUrl: item.image || "",
        alt: item.alt || "",
        order: Number(item.order || index + 1),
        visible: item.visible ?? true,
      })),
    amenitiesSection: {
      visible: content.amenitiesSection.visible,
      eyebrow: content.amenitiesSection.eyebrow,
      title: content.amenitiesSection.title,
      description: content.amenitiesSection.description,
    },
    amenities: [...content.amenities]
      .sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
      .map((item, index) => ({
        id: item.id,
        title: item.title || "",
        description: item.description || "",
        imageUrl: item.image || "",
        alt: item.alt || item.title || "",
        order: Number(item.order || index + 1),
        visible: item.active ?? true,
      })),
    cta: {
      visible: content.cta.visible,
      title: content.cta.title,
      description: content.cta.description,
      imageUrl: content.cta.image || "",
      buttonText: content.cta.buttonText,
    },
    footer: {
      legalText: content.footer.text,
      text: content.footer.text,
      location: content.footer.location,
      socialLinks: content.footer.socialLinks || [],
      instagram: content.footer.socialLinks?.[0]?.url || "",
      facebook: content.footer.socialLinks?.[1]?.url || "",
    },
    updatedAt: serverTimestamp(),
  };
}

export async function getPublicContent(venueId = DEFAULT_VENUE_ID) {
  const venueRef = doc(db, "venues", venueId);
  const contentRef = doc(db, "venues", venueId, ...CONTENT_DOC_PATH);

  const [venueSnapshot, contentSnapshot] = await Promise.all([getDoc(venueRef), getDoc(contentRef)]);
  const venueData = venueSnapshot.exists() ? venueSnapshot.data() : {};
  const contentData = contentSnapshot.exists() ? contentSnapshot.data() : {};

  return {
    venue: normalizeVenue(venueData, contentData),
    content: normalizePublicContent(contentData),
    exists: contentSnapshot.exists(),
  };
}

export async function savePublicContent(venueId = DEFAULT_VENUE_ID, venue, content) {
  const venueRef = doc(db, "venues", venueId);
  const contentRef = doc(db, "venues", venueId, ...CONTENT_DOC_PATH);

  await Promise.all([
    setDoc(
      venueRef,
      {
        name: venue.name,
        slug: venue.slug || venueId,
        subtitle: venue.subtitle,
        whatsappNumber: venue.whatsappNumber,
        whatsapp: venue.whatsappNumber,
        location: venue.location,
        active: true,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    ),
    setDoc(contentRef, serializeContent(content, venue), { merge: true }),
  ]);
}

export async function uploadVenueImage(venueId = DEFAULT_VENUE_ID, section, file) {
  const safeName = sanitizeFileName(file.name || "imagen.png");
  const filePath = `venues/${venueId}/content/${section}/${Date.now()}-${safeName}`;
  const fileRef = ref(storage, filePath);

  await uploadBytes(fileRef, file, {
    contentType: file.type || "image/png",
  });

  return getDownloadURL(fileRef);
}
