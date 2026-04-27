import { useEffect, useMemo, useRef, useState } from "react";
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
  const buttonRef = useRef(null);
  const [progress, setProgress] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [viewport, setViewport] = useState({
    width: 1280,
    brandWidth: 520,
    buttonWidth: 240,
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
          buttonWidth: buttonRef.current?.offsetWidth || 240,
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
    const scale = 1 - easeOutCubic(progress) * (isMobile ? 0.68 : 0.75);
    const topStart = isMobile ? 78 : 96;
    const topEnd = isMobile ? 15 : 18;
    const top = topStart + (topEnd - topStart) * easeOutCubic(progress);
    const leftShift = easeOutCubic(rangeProgress(progress, 0.34, 1));
    const leftEnd = isMobile ? 18 : 24;
    const centeredLeft = (viewport.width - viewport.brandWidth) / 2;
    const x = centeredLeft + (leftEnd - centeredLeft) * leftShift;
    const headerOpacity = easeOutCubic(rangeProgress(progress, 0.18, 0.95));
    const buttonOpacity = easeOutCubic(rangeProgress(progress, 0.62, 1));
    const buttonInset = isMobile ? 14 : 24;
    const buttonX = viewport.width - viewport.buttonWidth - buttonInset;

    return {
      "--brand-scale": scale,
      "--brand-top": `${top}px`,
      "--brand-x": `${x}px`,
      "--button-x": `${buttonX}px`,
      "--header-opacity": headerOpacity,
      "--button-opacity": buttonOpacity,
    };
  }, [isMobile, progress, viewport]);

  return (
    <>
      <header className="scroll-header" style={style} aria-hidden={progress < 0.1}>
        <div className="scroll-header__surface" />
        <a
          className="scroll-header__whatsapp"
          href={buildBaseWhatsappUrl(venue)}
          ref={buttonRef}
          target="_blank"
          rel="noreferrer"
        >
          Consultar por WhatsApp
        </a>
      </header>

      <div className="animated-brand" style={style} ref={brandRef}>
        <a className="animated-brand__content" href="#inicio" aria-label={venue.name}>
          <span className="animated-brand__title">{venue.logoText}</span>
          <span className="animated-brand__subtitle">{venue.subtitle}</span>
        </a>
      </div>
    </>
  );
}
