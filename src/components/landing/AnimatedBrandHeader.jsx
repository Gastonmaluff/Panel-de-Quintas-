import { useEffect, useMemo, useRef, useState } from "react";
import { LayoutDashboard } from "lucide-react";
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
    brandWidth: 520,
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
          brandWidth: brandRef.current?.offsetWidth || 520,
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
    const scale = 1 - easeOutCubic(progress) * (isMobile ? 0.8 : 0.86);
    const topStart = isMobile ? 56 : 58;
    const topEnd = isMobile ? 6 : 5;
    const top = topStart + (topEnd - topStart) * easeOutCubic(progress);
    const leftShift = easeOutCubic(rangeProgress(progress, 0.34, 1));
    const leftEnd = isMobile ? 18 : 24;
    const centeredLeft = (viewport.width - viewport.brandWidth) / 2;
    const x = centeredLeft + (leftEnd - centeredLeft) * leftShift;
    const headerOpacity = easeOutCubic(rangeProgress(progress, 0.18, 0.95));
    const buttonOpacity = easeOutCubic(rangeProgress(progress, 0.62, 1));
    const buttonInset = isMobile ? 14 : 24;
    const buttonX = viewport.width - viewport.actionsWidth - buttonInset;

    return {
      "--brand-scale": scale,
      "--brand-top": `${top}px`,
      "--brand-x": `${x}px`,
      "--button-x": `${buttonX}px`,
      "--header-opacity": headerOpacity,
      "--button-opacity": buttonOpacity,
    };
  }, [isMobile, progress, viewport]);

  const logoSrc = `${import.meta.env.BASE_URL}${venue.logoImage}`;
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
          <img className="animated-brand__logo" src={logoSrc} alt={venue.name} />
        </a>
      </div>
    </>
  );
}
