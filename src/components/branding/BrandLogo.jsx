import logoHorizontal from "../../assets/branding/logo-official-horizontal.png";
import logoMark from "../../assets/branding/logo-official-mark.png";
import logoStacked from "../../assets/branding/logo-official-stacked.png";

const logoSources = {
  stacked: logoStacked,
  horizontal: logoHorizontal,
  mark: logoMark,
};

export default function BrandLogo({ variant = "stacked", className = "" }) {
  const source = logoSources[variant] || logoSources.stacked;

  return (
    <img
      className={`brand-logo brand-logo--${variant} ${className}`.trim()}
      src={source}
      alt="El Paraíso Escondido"
      draggable="false"
    />
  );
}
