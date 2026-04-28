import { useEffect, useMemo, useRef, useState } from "react";
import { LayoutDashboard } from "lucide-react";
import BrandLogo from "../branding/BrandLogo.jsx";
import { buildBaseWhatsappUrl } from "../../utils/whatsapp.js";

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function easeOutCubic(value) {
  return 1 - Math.pow(1 - value, 3);
}

function rangeProgress(value, start, end) {
  return clamp((value - start) / (end - start), 0, 1);
}

export default function AnimatedBrandHeader({ venue }) {
  const brandRef = useRef(null);
  const actionsRef = useRef(null);
  const [progress, setProgress] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [viewport, setViewport] = useState({
    width: 1280,
    actionsWidth: 300,
  });

  useEffect(() => {
    let frame = 0;
    const updateProgress = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const visualWidth =
          window.visualViewport?.width || document.documentElement.clientWidth || window.innerWidth;
        setProgress(clamp(window.scrollY / 240, 0, 1));
        setIsMobile(visualWidth < 720);
        setViewport({
          width: visualWidth,
          actionsWidth: actionsRef.current?.offsetWidth || 300,
        });
      });
    };

    updateProgress();
    window.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", updateProgress);
      window.removeEventListener("resize", updateProgress);
    };
  }, []);

  const style = useMemo(() => {
    const eased = easeOutCubic(progress);
    const initialWidth = isMobile
      ? Math.min(viewport.width * 0.76, 300)
      : Math.min(viewport.width * 0.32, 420);
    const finalWidth = isMobile ? 150 : 190;
    const width = initialWidth + (finalWidth - initialWidth) * eased;
    const initialHeight = initialWidth * (716 / 676);
    const finalHeight = finalWidth * (210 / 640);
    const height = initialHeight + (finalHeight - initialHeight) * eased;
    const topStart = isMobile ? 56 : 58;
    const topEnd = isMobile ? 12 : 10;
    const top = topStart + (topEnd - topStart) * easeOutCubic(progress);
    const leftShift = easeOutCubic(rangeProgress(progress, 0.34, 1));
    const leftEnd = isMobile ? 18 : 24;
    const centeredLeft = (viewport.width - width) / 2;
    const x = centeredLeft + (leftEnd - centeredLeft) * leftShift;
    const headerOpacity = easeOutCubic(rangeProgress(progress, 0.18, 0.95));
    const buttonOpacity = easeOutCubic(rangeProgress(progress, 0.62, 1));
    const stackedOpacity = 1 - easeOutCubic(rangeProgress(progress, 0.28, 0.74));
    const horizontalOpacity = easeOutCubic(rangeProgress(progress, 0.48, 0.95));
    const buttonInset = isMobile ? 14 : 24;
    const buttonX = viewport.width - viewport.actionsWidth - buttonInset;

    return {
      "--brand-width": `${width}px`,
      "--brand-height": `${height}px`,
      "--brand-top": `${top}px`,
      "--brand-x": `${x}px`,
      "--button-x": `${buttonX}px`,
      "--header-opacity": headerOpacity,
      "--button-opacity": buttonOpacity,
      "--stacked-opacity": stackedOpacity,
      "--horizontal-opacity": horizontalOpacity,
    };
  }, [isMobile, progress, viewport]);

  const adminUrl = `${import.meta.env.BASE_URL}admin`;

  return (
    <>
      <header className="scroll-header" style={style} aria-hidden={progress < 0.1}>
        <div className="scroll-header__surface" />
        <div className="scroll-header__actions" ref={actionsRef}>
          <a
            className="admin-icon-button"
            href={adminUrl}
            aria-label="Abrir panel administrador"
            title="Panel administrador"
          >
            <LayoutDashboard size={18} strokeWidth={1.8} aria-hidden="true" />
          </a>
          <a
            className="scroll-header__whatsapp"
            href={buildBaseWhatsappUrl(venue)}
            target="_blank"
            rel="noreferrer"
          >
            Consultar por WhatsApp
          </a>
        </div>
      </header>

      <div className="animated-brand" style={style} ref={brandRef}>
        <a className="animated-brand__content" href="#inicio" aria-label={venue.name}>
          <BrandLogo variant="stacked" className="animated-brand__logo animated-brand__logo--stacked" />
          <BrandLogo
            variant="horizontal"
            className="animated-brand__logo animated-brand__logo--horizontal"
          />
        </a>
      </div>
    </>
  );
}
