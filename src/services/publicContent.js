import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { db, storage } from "../config/firebase.js";
import { publicContentMock } from "../data/adminData.js";
import { venues } from "../data/venues.js";

export const DEFAULT_VENUE_ID = "paraiso-escondido";
const PUBLIC_CONTENT_PATH = ["publicContent", "main"];
const LEGACY_CONTENT_PATH = ["sections", "publicContent"];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function sanitizeFileName(fileName) {
  return fileName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function imageFrom(item, fallback = "") {
  return item?.imageUrl || item?.image || fallback;
}

function isFileOrBlob(value) {
  const isFile = typeof File !== "undefined" && value instanceof File;
  const isBlob = typeof Blob !== "undefined" && value instanceof Blob;
  return isFile || isBlob;
}

function cleanImageUrl(value, fieldName) {
  if (!value) return "";
  if (typeof value !== "string") return "";

  if (value.startsWith("blob:")) {
    throw new Error(`La imagen "${fieldName}" sigue siendo una vista previa local y no se subió a Storage.`);
  }

  return value;
}

function cleanForFirestore(value) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (isFileOrBlob(value)) return undefined;

  if (Array.isArray(value)) {
    return value
      .map((item) => cleanForFirestore(item))
      .filter((item) => item !== undefined);
  }

  if (typeof value === "object") {
    return Object.entries(value).reduce((result, [key, item]) => {
      const cleaned = cleanForFirestore(item);
      if (cleaned !== undefined) {
        result[key] = cleaned;
      }
      return result;
    }, {});
  }

  return value;
}

function getVenuePath(venueId) {
  return `venues/${venueId}`;
}

function getPublicContentPath(venueId) {
  return `venues/${venueId}/${PUBLIC_CONTENT_PATH.join("/")}`;
}

function getLegacyContentPath(venueId) {
  return `venues/${venueId}/${LEGACY_CONTENT_PATH.join("/")}`;
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
    roomsSection: {
      ...defaults.roomsSection,
      ...contentData.roomsSection,
    },
    rooms: (Array.isArray(contentData.rooms) ? contentData.rooms : defaults.rooms).map((item, index) => ({
      id: item.id || `room-${index + 1}`,
      name: item.name || `Habitación ${index + 1}`,
      subtitle: item.subtitle || "",
      description: item.description || "",
      image: imageFrom(item),
      alt: item.alt || item.name || `Habitación ${index + 1}`,
      features: Array.isArray(item.features) ? item.features : [],
    })),
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
      imageUrl: cleanImageUrl(content.hero.image, "hero"),
      ctaText: content.hero.ctaText,
    },
    experience: {
      visible: content.experience.visible,
      eyebrow: content.experience.eyebrow,
      title: content.experience.title,
      description: content.experience.description,
      imageUrl: cleanImageUrl(content.experience.image, "experience"),
    },
    gallery: [...content.gallery]
      .sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
      .map((item, index) => ({
        id: item.id,
        imageUrl: cleanImageUrl(item.image, `gallery:${item.id}`),
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
        imageUrl: cleanImageUrl(item.image, `amenities:${item.id}`),
        alt: item.alt || item.title || "",
        order: Number(item.order || index + 1),
        visible: item.active ?? true,
      })),
    roomsSection: {
      visible: content.roomsSection?.visible ?? true,
      eyebrow: content.roomsSection?.eyebrow || "",
      title: content.roomsSection?.title || "",
      description: content.roomsSection?.description || "",
    },
    rooms: (content.rooms || []).map((item, index) => ({
      id: item.id || `room-${index + 1}`,
      name: item.name || "",
      subtitle: item.subtitle || "",
      description: item.description || "",
      imageUrl: cleanImageUrl(item.image, `rooms:${item.id || index + 1}`),
      alt: item.alt || item.name || "",
      features: item.features || [],
    })),
    cta: {
      visible: content.cta.visible,
      title: content.cta.title,
      description: content.cta.description,
      imageUrl: cleanImageUrl(content.cta.image, "cta"),
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
  };
}

export async function getPublicContent(venueId = DEFAULT_VENUE_ID) {
  const venueRef = doc(db, "venues", venueId);
  const contentRef = doc(db, "venues", venueId, ...PUBLIC_CONTENT_PATH);
  const legacyContentRef = doc(db, "venues", venueId, ...LEGACY_CONTENT_PATH);

  const [venueSnapshot, contentSnapshot, legacyContentSnapshot] = await Promise.all([
    getDoc(venueRef),
    getDoc(contentRef),
    getDoc(legacyContentRef),
  ]);
  const venueData = venueSnapshot.exists() ? venueSnapshot.data() : {};
  const activeContentSnapshot = contentSnapshot.exists() ? contentSnapshot : legacyContentSnapshot;
  const contentData = activeContentSnapshot.exists() ? activeContentSnapshot.data() : {};

  return {
    venue: normalizeVenue(venueData, contentData),
    content: normalizePublicContent(contentData),
    exists: activeContentSnapshot.exists(),
  };
}

export async function savePublicContent(venueId = DEFAULT_VENUE_ID, venue, content) {
  const venueRef = doc(db, "venues", venueId);
  const contentRef = doc(db, "venues", venueId, ...PUBLIC_CONTENT_PATH);
  const legacyContentRef = doc(db, "venues", venueId, ...LEGACY_CONTENT_PATH);
  const venuePath = getVenuePath(venueId);
  const contentPath = getPublicContentPath(venueId);
  const legacyContentPath = getLegacyContentPath(venueId);
  const venuePayload = {
    name: venue.name,
    slug: venue.slug || venueId,
    subtitle: venue.subtitle,
    whatsappNumber: venue.whatsappNumber,
    whatsapp: venue.whatsappNumber,
    location: venue.location,
    active: true,
    updatedAt: serverTimestamp(),
  };
  const contentPayload = {
    ...cleanForFirestore(serializeContent(content, venue)),
    updatedAt: serverTimestamp(),
  };

  console.log("Saving Firestore document...");
  console.log("Firestore path:", contentPath);
  console.log("Payload:", contentPayload);

  try {
    await setDoc(contentRef, contentPayload, { merge: true });
  } catch (error) {
    console.error("Error writing Firestore document:", error);
    console.error("Error code:", error?.code);
    console.error("Error message:", error?.message);
    console.error("Firestore path:", contentPath);
    console.error("Payload:", contentPayload);

    if (error?.code !== "permission-denied") {
      throw error;
    }

    console.error("Firebase rules are blocking this write. Trying legacy content path...");
    console.log("Saving Firestore document...");
    console.log("Firestore path:", legacyContentPath);
    console.log("Payload:", contentPayload);

    try {
      await setDoc(legacyContentRef, contentPayload, { merge: true });
    } catch (legacyError) {
      console.error("Error writing Firestore document:", legacyError);
      console.error("Error code:", legacyError?.code);
      console.error("Error message:", legacyError?.message);
      console.error("Firestore path:", legacyContentPath);
      console.error("Payload:", contentPayload);
      if (legacyError?.code === "permission-denied") {
        console.error("Firebase rules are blocking this write.");
      }
      throw legacyError;
    }
  }

  console.log("Saving Firestore document...");
  console.log("Firestore path:", venuePath);
  console.log("Payload:", venuePayload);

  try {
    await setDoc(venueRef, venuePayload, { merge: true });
  } catch (error) {
    console.error("Error writing Firestore document:", error);
    console.error("Error code:", error?.code);
    console.error("Error message:", error?.message);
    console.error("Firestore path:", venuePath);
    console.error("Payload:", venuePayload);
    console.warn("El contenido público ya fue guardado, pero no se pudo sincronizar el documento general de la quinta.");
  }
}

export async function uploadVenueImage(venueId = DEFAULT_VENUE_ID, section, file) {
  if (!isFileOrBlob(file)) {
    throw new Error("La imagen seleccionada no es un archivo válido.");
  }

  const safeName = sanitizeFileName(file.name || "imagen.png");
  const filePath = `venues/${venueId}/content/${section}/${Date.now()}-${safeName || "imagen.png"}`;
  const fileRef = ref(storage, filePath);

  console.log("Uploading image to Firebase Storage...");
  console.log("Image upload path:", filePath);
  console.log("File info:", file?.name, file?.type, file?.size);

  try {
    await uploadBytes(fileRef, file, {
      contentType: file.type || "image/png",
    });

    return await getDownloadURL(fileRef);
  } catch (error) {
    console.error("Error uploading image:", error);
    console.error("Error code:", error?.code);
    console.error("Error message:", error?.message);
    console.error("Image upload path:", filePath);
    console.error("File info:", file?.name, file?.type, file?.size);
    if (error?.code === "storage/unauthorized") {
      console.error("Firebase Storage rules are blocking this upload.");
    }
    throw error;
  }
}
