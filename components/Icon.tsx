"use client";

// BLACKOUT — temaya uygun ince (line) ikon seti. Emoji yerine kullanılır.
// currentColor ile boyanır; boyut `size` ile ayarlanır. Tek dosya, telifsiz.
import type { CSSProperties } from "react";

export type IconName =
  | "coin"
  | "shield"
  | "radar"
  | "trap"
  | "trophy"
  | "book"
  | "lock"
  | "lockOpen"
  | "crown"
  | "photo"
  | "cart"
  | "heart"
  | "people"
  | "target"
  | "infinity"
  | "swords"
  | "home"
  | "key"
  | "gear"
  | "music"
  | "mute"
  | "box"
  | "flame"
  | "map"
  | "drop"
  | "veil"
  | "skull"
  | "warn"
  | "bomb"
  | "handshake"
  | "check"
  | "moon"
  | "swarm"
  | "help"
  | "play"
  | "pause"
  | "sword"
  | "exit"
  | "chevronDown"
  | "chevronUp"
  | "ammo";

// Her ikon: viewBox 0 0 24 24 içinde stroke tabanlı yollar.
const PATHS: Record<IconName, React.ReactNode> = {
  // Altın sikke: dış kenar + iç kabartma halkası + tepede parıltı (yazı/simge yok — her boyutta okunur)
  coin: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="5.2" />
      <path d="M9.2 8.6a4.6 4.6 0 0 0-1.4 1.7" />
    </>
  ),
  shield: <path d="M12 3l7 2.5v5.5c0 4.4-3 7.6-7 9-4-1.4-7-4.6-7-9V5.5L12 3z" />,
  radar: (
    <>
      <circle cx="12" cy="14" r="2" />
      <path d="M12 14a6 6 0 0 1 6-6M12 14a10 10 0 0 1 10-10" />
    </>
  ),
  trap: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 4v16M4 12h16M6 6l12 12M18 6L6 18" />
    </>
  ),
  trophy: (
    <>
      <path d="M8 4h8v4a4 4 0 0 1-8 0V4z" />
      <path d="M8 6H5a2 2 0 0 0 0 4h1M16 6h3a2 2 0 0 1 0 4h-1M10 12v3M14 12v3M8 20h8M9 17h6l-1 3H10l-1-3z" />
    </>
  ),
  book: (
    <>
      <path d="M5 4h9a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2V4z" />
      <path d="M16 6h3v14h-3M8 8h5M8 11h5" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </>
  ),
  lockOpen: (
    <>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V7.6a4 4 0 0 1 7.6-1.6" />
    </>
  ),
  crown: <path d="M4 8l3 8h10l3-8-4 3-4-5-4 5-4-3zM6 19h12" />,
  photo: (
    <>
      <rect x="4" y="6" width="16" height="13" rx="2" />
      <circle cx="12" cy="12.5" r="3" />
      <path d="M8 6l1.5-2h5L16 6" />
    </>
  ),
  cart: (
    <>
      <circle cx="9" cy="20" r="1.3" />
      <circle cx="17" cy="20" r="1.3" />
      <path d="M3 4h2l2.2 11h10l2-7H6.5" />
    </>
  ),
  heart: <path d="M12 20C7 16.5 4 13.5 4 9.5A3.5 3.5 0 0 1 12 7a3.5 3.5 0 0 1 8 2.5c0 4-3 7-8 10.5z" />,
  people: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
      <circle cx="17" cy="8.5" r="2.4" />
      <path d="M15.5 14.2A4.6 4.6 0 0 1 20.5 18.5" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="0.6" fill="currentColor" />
    </>
  ),
  infinity: <path d="M8 12a3 3 0 1 1 3 3c-1.5 0-2-1.5-3-3s-1.5-3-3-3a3 3 0 0 0 0 6c1.5 0 2-1.5 3-3 1-1.5 1.5-3 3-3a3 3 0 0 1 0 6c-1.5 0-2-1.5-3-3z" />,
  swords: (
    <>
      <path d="M5 4l7 7-2 2-7-7V4h2zM19 4l-7 7 2 2 7-7V4h-2z" />
      <path d="M8 16l-3 3M16 16l3 3" />
    </>
  ),
  home: <path d="M4 11l8-7 8 7M6 10v9h12v-9" />,
  key: (
    <>
      <circle cx="8" cy="9" r="4" />
      <path d="M11 12l7 7M16 17l2-2M18 19l2-2" />
    </>
  ),
  gear: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" />
    </>
  ),
  music: (
    <>
      <circle cx="7" cy="18" r="2" />
      <circle cx="17" cy="16" r="2" />
      <path d="M9 18V6l10-2v12" />
    </>
  ),
  mute: (
    <>
      <path d="M4 9h3l4-3v12l-4-3H4z" />
      <path d="M16 9l4 6M20 9l-4 6" />
    </>
  ),
  box: (
    <>
      <path d="M4 8l8-4 8 4-8 4-8-4z" />
      <path d="M4 8v8l8 4 8-4V8M12 12v8" />
    </>
  ),
  flame: <path d="M12 3c1 4-3 5-3 9a3 3 0 0 0 6 0c0-1.5-1-2.5-1-4 2 1 3 3 3 5a5 5 0 0 1-10 0c0-4 4-6 5-10z" />,
  map: <path d="M9 4L4 6v14l5-2 6 2 5-2V4l-5 2-6-2zM9 4v14M15 6v14" />,
  drop: <path d="M12 3c3 5 5 7 5 10a5 5 0 0 1-10 0c0-3 2-5 5-10z" />,
  veil: (
    <>
      <path d="M6 20V9a6 6 0 0 1 12 0v11" />
      <path d="M6 20l3-2 3 2 3-2 3 2" />
    </>
  ),
  skull: (
    <>
      <path d="M5 11a7 7 0 0 1 14 0c0 2-1 3.5-2 4.5V18H7v-2.5C6 14.5 5 13 5 11z" />
      <circle cx="9.5" cy="11" r="1.3" fill="currentColor" />
      <circle cx="14.5" cy="11" r="1.3" fill="currentColor" />
    </>
  ),
  warn: (
    <>
      <path d="M12 4l9 16H3l9-16z" />
      <path d="M12 10v4M12 17v.5" />
    </>
  ),
  bomb: (
    <>
      <circle cx="11" cy="15" r="6" />
      <path d="M15 11l2-2M17 9h2M17 9V7" />
    </>
  ),
  handshake: <path d="M3 12l4-4 5 4 5-4 4 4-4 4-3-2-2 2-3-2-3 2-3-4z" />,
  check: <path d="M5 12l4 4 10-10" />,
  moon: <path d="M20 14.5A8 8 0 0 1 9.5 4a7 7 0 1 0 10.5 10.5z" />,
  swarm: (
    <>
      <circle cx="8" cy="8" r="2.4" />
      <circle cx="16" cy="9" r="2.1" />
      <circle cx="11" cy="15" r="2.6" />
      <circle cx="17.5" cy="16" r="1.7" />
    </>
  ),
  ammo: <path d="M10 4h4v6l1 3v5a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2v-5l1-3V4z" />,
  help: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.4 9.4a2.6 2.6 0 0 1 5 .9c0 1.7-2.4 2.2-2.4 3.7" />
      <circle cx="12" cy="17" r="0.6" fill="currentColor" />
    </>
  ),
  play: <path d="M8.5 5.5l10 6.5-10 6.5z" />,
  // Tek kılıç: namlu (sağ üstten sol alta) + balçak + sap
  sword: (
    <>
      <path d="M20.5 3.5l-9.5 9.5-2 4 4-2 9.5-9.5-2-2z" />
      <path d="M7.5 15.5l-3 3M5 14l5 5M4.2 17.2l2.6 2.6" />
    </>
  ),
  exit: (
    <>
      <path d="M14 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8" />
      <path d="M17 8l4 4-4 4M21 12h-9" />
    </>
  ),
  pause: (
    <>
      <rect x="8.2" y="5" width="2.8" height="14" rx="1.2" />
      <rect x="13" y="5" width="2.8" height="14" rx="1.2" />
    </>
  ),
  chevronDown: <path d="M6 9l6 6 6-6" />,
  chevronUp: <path d="M6 15l6-6 6 6" />,
};

export default function Icon({
  name,
  size = 18,
  stroke = 1.7,
  className,
  style,
  fill = false,
}: {
  name: IconName;
  size?: number;
  stroke?: number;
  className?: string;
  style?: CSSProperties;
  fill?: boolean;
}) {
  // Altın sikke: line-icon değil, GERÇEK altın renkli dolu sikke (her yerde altına benzesin).
  // currentColor'dan bağımsız sabit altın tonları (düz renk, gradyan yok).
  if (name === "coin") {
    return (
      <svg viewBox="0 0 24 24" width={size} height={size} className={className}
        style={{ flex: "none", verticalAlign: "middle", ...style }} aria-hidden="true">
        <circle cx="12" cy="12" r="9" fill="#e7b53f" stroke="#9c6d18" strokeWidth="1.3" />
        <circle cx="12" cy="12" r="5.7" fill="none" stroke="#f7dc8a" strokeWidth="1.4" />
        <path d="M8.6 8.4a4.9 4.9 0 0 1 2.1-1.6" fill="none" stroke="#fceeba" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill={fill ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={{ flex: "none", verticalAlign: "middle", ...style }}
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}
