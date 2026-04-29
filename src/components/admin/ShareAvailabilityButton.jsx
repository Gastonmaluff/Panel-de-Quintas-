import { useMemo, useRef, useState } from "react";
import { Download, MessageCircle, Share2 } from "lucide-react";
import { toBlob } from "html-to-image";
import { useAdminData } from "../../admin/AdminDataProvider.jsx";
import { venues } from "../../data/venues.js";
import ShareableAvailabilityCalendar from "./ShareableAvailabilityCalendar.jsx";

function getExportMonth() {
  const today = new Date();
  return {
    year: today.getFullYear(),
    month: today.getMonth(),
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
    "Te comparto la disponibilidad actualizada de Paraiso Escondido. Te adjunto la imagen en este chat.";
  const url = `https://wa.me/${venue.whatsappNumber}?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

export default function ShareAvailabilityButton() {
  const { availability } = useAdminData();
  const exportRef = useRef(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [generatingAction, setGeneratingAction] = useState("");
  const [message, setMessage] = useState("");
  const exportMonth = useMemo(() => getExportMonth(), []);
  const fileName = getFileName(exportMonth);
  const venue = venues[0];
  const isGenerating = Boolean(generatingAction);

  const createPngBlob = async () => {
    if (!exportRef.current) throw new Error("Missing export node");

    const blob = await toBlob(exportRef.current, {
      cacheBust: true,
      backgroundColor: "#fbf8f1",
      width: 1080,
      height: 1350,
      pixelRatio: 1,
    });

    if (!blob) throw new Error("Empty image");
    return blob;
  };

  const createPngFile = async () => {
    const blob = await createPngBlob();
    return new File([blob], fileName, { type: "image/png" });
  };

  const runAction = async (action, callback) => {
    if (isGenerating) return;
    setGeneratingAction(action);
    setMessage("");

    try {
      await callback();
      setIsMenuOpen(false);
    } catch {
      setMessage("No se pudo compartir la imagen. Podes descargarla y enviarla manualmente.");
      setIsMenuOpen(false);
    } finally {
      setGeneratingAction("");
    }
  };

  const handleDownload = () =>
    runAction("download", async () => {
      const blob = await createPngBlob();
      downloadBlob(blob, fileName);
      setMessage("Imagen descargada correctamente.");
    });

  const handleNativeShare = () =>
    runAction("share", async () => {
      const file = await createPngFile();

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: "Disponibilidad Paraiso Escondido",
          text: "Te comparto la disponibilidad actualizada de Paraiso Escondido.",
          files: [file],
        });
        setMessage("Imagen lista para compartir.");
        return;
      }

      downloadBlob(file, fileName);
      setMessage(
        "Tu navegador no permite compartir la imagen directamente. Se descargo el archivo para que puedas adjuntarlo manualmente.",
      );
    });

  const handleWhatsapp = () =>
    runAction("whatsapp", async () => {
      const blob = await createPngBlob();
      downloadBlob(blob, fileName);
      openWhatsappText(venue);
      setMessage("Imagen descargada. Adjuntala en WhatsApp para enviarla.");
    });

  return (
    <div className="share-availability">
      <button
        type="button"
        onClick={() => setIsMenuOpen((current) => !current)}
        disabled={isGenerating}
        aria-expanded={isMenuOpen}
      >
        <Share2 size={16} strokeWidth={1.8} aria-hidden="true" />
        {isGenerating ? "Generando..." : "Compartir disponibilidad"}
      </button>

      {isMenuOpen ? (
        <div className="share-availability__menu">
          <button type="button" onClick={handleNativeShare} disabled={isGenerating}>
            <Share2 size={15} strokeWidth={1.8} aria-hidden="true" />
            Compartir imagen
          </button>
          <button type="button" onClick={handleDownload} disabled={isGenerating}>
            <Download size={15} strokeWidth={1.8} aria-hidden="true" />
            Descargar imagen
          </button>
          <button type="button" onClick={handleWhatsapp} disabled={isGenerating}>
            <MessageCircle size={15} strokeWidth={1.8} aria-hidden="true" />
            Compartir por WhatsApp
          </button>
        </div>
      ) : null}

      {message ? <small>{message}</small> : null}

      <div className="share-availability__stage" aria-hidden="true">
        <div ref={exportRef}>
          <ShareableAvailabilityCalendar availability={availability} month={exportMonth} />
        </div>
      </div>
    </div>
  );
}
