import { useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Download, MessageCircle, Share2 } from "lucide-react";
import { toBlob } from "html-to-image";
import { useAdminData } from "../../admin/AdminDataProvider.jsx";
import { venues } from "../../data/venues.js";
import ShareableAvailabilityCalendar from "./ShareableAvailabilityCalendar.jsx";

function getMonthOffset(offset = 0) {
  const today = new Date();
  const date = new Date(today.getFullYear(), today.getMonth() + offset, 1);

  return {
    year: date.getFullYear(),
    month: date.getMonth(),
  };
}

function getFileName(month) {
  const monthNumber = String(month.month + 1).padStart(2, "0");
  return `disponibilidad-paraiso-escondido-${month.year}-${monthNumber}.png`;
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.download = fileName;
  link.href = url;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function openWhatsappText(venue) {
  const message =
    "Te comparto la disponibilidad actualizada de Paraíso Escondido. Te adjunto la imagen en este chat.";
  const url = `https://wa.me/${venue.whatsappNumber}?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

export default function ShareAvailabilityButton() {
  const { availability } = useAdminData();
  const buttonRef = useRef(null);
  const exportRefs = useRef({});
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 0 });
  const [generatingAction, setGeneratingAction] = useState("");
  const [message, setMessage] = useState("");
  const months = useMemo(
    () => ({
      current: getMonthOffset(0),
      next: getMonthOffset(1),
    }),
    [],
  );
  const venue = venues[0];
  const isGenerating = Boolean(generatingAction);

  const openMenu = () => {
    const rect = buttonRef.current?.getBoundingClientRect();

    if (rect) {
      setMenuPosition({
        top: rect.bottom + 10,
        right: Math.max(window.innerWidth - rect.right, 14),
      });
    }

    setMessage("");
    setIsMenuOpen((current) => !current);
  };

  const createPngBlob = async (monthKey) => {
    const node = exportRefs.current[monthKey];
    if (!node) throw new Error("Missing export node");

    const blob = await toBlob(node, {
      cacheBust: true,
      backgroundColor: "#fbf8f1",
      width: 1080,
      height: 1350,
      pixelRatio: 1,
    });

    if (!blob) throw new Error("Empty image");
    return blob;
  };

  const createPngFile = async (monthKey) => {
    const blob = await createPngBlob(monthKey);
    return new File([blob], getFileName(months[monthKey]), { type: "image/png" });
  };

  const runAction = async (action, callback) => {
    if (isGenerating) return;
    setGeneratingAction(action);
    setMessage("");

    try {
      await callback();
      setIsMenuOpen(false);
    } catch {
      setMessage("No se pudo compartir la imagen. Podés descargarla y enviarla manualmente.");
      setIsMenuOpen(false);
    } finally {
      setGeneratingAction("");
    }
  };

  const handleDownload = (monthKey) =>
    runAction(`download-${monthKey}`, async () => {
      const blob = await createPngBlob(monthKey);
      downloadBlob(blob, getFileName(months[monthKey]));
    });

  const handleNativeShare = (monthKey) =>
    runAction(`share-${monthKey}`, async () => {
      const file = await createPngFile(monthKey);

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: "Disponibilidad Paraíso Escondido",
          text: "Te comparto la disponibilidad actualizada de Paraíso Escondido.",
          files: [file],
        });
        return;
      }

      downloadBlob(file, getFileName(months[monthKey]));
      setMessage(
        "Tu navegador no permite compartir la imagen directamente. Se descargó el archivo para que puedas adjuntarlo manualmente.",
      );
    });

  const handleWhatsapp = (monthKey) =>
    runAction(`whatsapp-${monthKey}`, async () => {
      const blob = await createPngBlob(monthKey);
      downloadBlob(blob, getFileName(months[monthKey]));
      openWhatsappText(venue);
    });

  const menu = isMenuOpen ? (
    <div
      className="share-availability__menu"
      style={{ top: menuPosition.top, right: menuPosition.right }}
    >
      <div>
        <strong>Compartir imagen</strong>
        <button type="button" onClick={() => handleNativeShare("current")} disabled={isGenerating}>
          <Share2 size={15} strokeWidth={1.8} aria-hidden="true" />
          Este mes
        </button>
        <button type="button" onClick={() => handleNativeShare("next")} disabled={isGenerating}>
          <Share2 size={15} strokeWidth={1.8} aria-hidden="true" />
          Mes que viene
        </button>
      </div>
      <div>
        <strong>Descargar imagen</strong>
        <button type="button" onClick={() => handleDownload("current")} disabled={isGenerating}>
          <Download size={15} strokeWidth={1.8} aria-hidden="true" />
          Mes actual
        </button>
        <button type="button" onClick={() => handleDownload("next")} disabled={isGenerating}>
          <Download size={15} strokeWidth={1.8} aria-hidden="true" />
          Mes siguiente
        </button>
      </div>
      <div>
        <strong>Compartir por WhatsApp</strong>
        <button type="button" onClick={() => handleWhatsapp("current")} disabled={isGenerating}>
          <MessageCircle size={15} strokeWidth={1.8} aria-hidden="true" />
          Este mes
        </button>
        <button type="button" onClick={() => handleWhatsapp("next")} disabled={isGenerating}>
          <MessageCircle size={15} strokeWidth={1.8} aria-hidden="true" />
          Mes que viene
        </button>
      </div>
    </div>
  ) : null;

  return (
    <div className="share-availability">
      <button
        type="button"
        ref={buttonRef}
        onClick={openMenu}
        disabled={isGenerating}
        aria-expanded={isMenuOpen}
      >
        <Share2 size={16} strokeWidth={1.8} aria-hidden="true" />
        {isGenerating ? "Generando..." : "Compartir disponibilidad"}
      </button>

      {message ? <small>{message}</small> : null}
      {typeof document !== "undefined" ? createPortal(menu, document.body) : null}

      <div className="share-availability__stage" aria-hidden="true">
        {Object.entries(months).map(([key, month]) => (
          <div key={key} ref={(node) => { exportRefs.current[key] = node; }}>
            <ShareableAvailabilityCalendar availability={availability} month={month} />
          </div>
        ))}
      </div>
    </div>
  );
}
