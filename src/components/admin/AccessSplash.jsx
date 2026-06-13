import { useEffect, useMemo, useState } from "react";
import BrandLogo from "../branding/BrandLogo.jsx";

function getStageLabel(progress, isReady) {
  if (isReady && progress >= 92) return "Abriendo panel...";
  if (progress >= 72) return "Cargando datos...";
  if (progress >= 36) return "Verificando sesión...";
  return "Preparando acceso...";
}

export default function AccessSplash({ isReady = false, onComplete }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setProgress((current) => {
        if (isReady) return Math.min(current + 12, 100);
        if (current < 25) return current + 4;
        if (current < 72) return current + 2;
        if (current < 88) return current + 1;
        return current;
      });
    }, 120);

    return () => window.clearInterval(interval);
  }, [isReady]);

  useEffect(() => {
    if (progress < 100) return undefined;
    const timeout = window.setTimeout(() => onComplete?.(), 260);
    return () => window.clearTimeout(timeout);
  }, [onComplete, progress]);

  const stageLabel = useMemo(() => getStageLabel(progress, isReady), [isReady, progress]);

  return (
    <main className="access-splash" aria-live="polite" aria-busy={progress < 100}>
      <section className="access-splash__card">
        <BrandLogo variant="horizontal" className="access-splash__logo" />
        <p className="access-splash__brand">Paraíso Escondido</p>
        <h1>Cargando panel</h1>
        <p className="access-splash__copy">Estamos preparando tu acceso al sistema.</p>

        <div className="access-splash__progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={progress}>
          <span style={{ width: `${progress}%` }} />
        </div>

        <div className="access-splash__status">
          <strong>{progress}%</strong>
          <span>{stageLabel}</span>
        </div>
      </section>
    </main>
  );
}
