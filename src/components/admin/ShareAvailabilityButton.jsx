import { useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Download, Share2 } from "lucide-react";
import { toBlob } from "html-to-image";
import { useAdminData } from "../../admin/AdminDataProvider.jsx";
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

async function waitForImages(container) {
  const images = Array.from(container.querySelectorAll("img"));
  await Promise.all(
    images.map(async (image) => {
      if (image.decode) {
        try {
          await image.decode();
          return;
        } catch {
          // Continue with load/error handlers below.
        }
      }

      if (image.complete && image.naturalWidth > 0) return Promise.resolve();

      return new Promise((resolve) => {
        image.onload = resolve;
        image.onerror = resolve;
      });
    }),
  );
}

export default function ShareAvailabilityButton({ iconOnly = false }) {
  const { availability } = useAdminData();
  const buttonRef = useRef(null);
  const exportRef = useRef(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 0 });
  const [generatingAction, setGeneratingAction] = useState("");
  const [message, setMessage] = useState("");
  const [exportMonthKey, setExportMonthKey] = useState("current");
  const months = useMemo(
    () => ({
      current: getMonthOffset(0),
      next: getMonthOffset(1),
    }),
    [],
  );
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
    setExportMonthKey(monthKey);
    await new Promise((resolve) => window.requestAnimationFrame(resolve));
    await new Promise((resolve) => window.requestAnimationFrame(resolve));

    const node = exportRef.current;
    if (!node) throw new Error("Missing export node");

    await waitForImages(node);

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
        aria-label="Compartir disponibilidad"
        title="Compartir disponibilidad"
        className={iconOnly ? "share-availability__trigger share-availability__trigger--icon" : "share-availability__trigger"}
      >
        <span className="share-availability__icon" aria-hidden="true">
          <Share2 size={16} strokeWidth={1.8} />
        </span>
        <span className={iconOnly ? "share-availability__label share-availability__label--responsive" : "share-availability__label"}>
          {isGenerating ? "Generando..." : "Compartir disponibilidad"}
        </span>
      </button>

      {message ? <small>{message}</small> : null}
      {typeof document !== "undefined" ? createPortal(menu, document.body) : null}

      <div className="share-availability__stage" aria-hidden="true">
        <div ref={exportRef}>
          <ShareableAvailabilityCalendar
            availability={availability}
            month={months[exportMonthKey]}
            exportKey={exportMonthKey}
          />
        </div>
      </div>
    </div>
  );
}
