import logoHorizontal from "../../assets/branding/logo-horizontal.svg";
import logoMark from "../../assets/branding/logo-mark.svg";
import logoStacked from "../../assets/branding/logo-stacked.svg";

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
      alt="El Paraiso Escondido"
      draggable="false"
    />
  );
}
