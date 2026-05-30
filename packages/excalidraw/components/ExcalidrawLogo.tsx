import "./ExcalidrawLogo.scss";

import logoImg from "./ribeiro-draw-logo.png";

type LogoSize = "xs" | "small" | "normal" | "large" | "custom" | "mobile";

interface LogoProps {
  size?: LogoSize;
  withText?: boolean;
  style?: React.CSSProperties;
  isNotLink?: boolean;
}

export const ExcalidrawLogo = ({
  style,
  size = "small",
}: LogoProps) => {
  return (
    <div className={`ExcalidrawLogo is-${size}`} style={style}>
      <img
        src={logoImg}
        alt="Ribeiro Draw!"
        className="ExcalidrawLogo-icon"
      />
    </div>
  );
};
