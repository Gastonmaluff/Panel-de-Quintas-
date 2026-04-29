import { useMemo, useRef, useState } from "react";
import { Download } from "lucide-react";
import { toPng } from "html-to-image";
import { useAdminData } from "../../admin/AdminDataProvider.jsx";
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

export default function ShareAvailabilityButton() {
  const { availability } = useAdminData();
  const exportRef = useRef(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  const exportMonth = useMemo(() => getExportMonth(), []);

  const handleDownload = async () => {
    if (!exportRef.current || isGenerating) return;

    setIsGenerating(true);
    setError("");

    try {
      const dataUrl = await toPng(exportRef.current, {
        cacheBust: true,
        backgroundColor: "#fbf8f1",
        width: 1080,
        height: 1350,
        pixelRatio: 1,
      });
      const link = document.createElement("a");
      link.download = getFileName(exportMonth);
      link.href = dataUrl;
      link.click();
    } catch {
      setError("No se pudo generar la imagen de disponibilidad.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="share-availability">
      <button type="button" onClick={handleDownload} disabled={isGenerating}>
        <Download size={16} strokeWidth={1.8} aria-hidden="true" />
        {isGenerating ? "Generando..." : "Compartir disponibilidad"}
      </button>
      {error ? <small>{error}</small> : null}
      <div className="share-availability__stage" aria-hidden="true">
        <div ref={exportRef}>
          <ShareableAvailabilityCalendar availability={availability} month={exportMonth} />
        </div>
      </div>
    </div>
  );
}
