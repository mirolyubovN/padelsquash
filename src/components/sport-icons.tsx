interface SportIconProps {
  size?: number;
  color?: string;
}

const BONE = "#f3ecdc";

export function TennisIcon({ size = 80, color = "#1a1411" }: SportIconProps) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} fill="none" aria-hidden="true">
      <ellipse cx="50" cy="36" rx="22" ry="26" stroke={color} strokeWidth="2" />
      {Array.from({ length: 7 }, (_, i) => (
        <line key={`v${i}`} x1={32 + i * 6} y1="14" x2={32 + i * 6} y2="58" stroke={color} strokeWidth="0.6" opacity="0.55" />
      ))}
      {Array.from({ length: 7 }, (_, i) => (
        <line key={`h${i}`} x1="29" y1={18 + i * 6} x2="71" y2={18 + i * 6} stroke={color} strokeWidth="0.6" opacity="0.55" />
      ))}
      <path d="M44 60 L50 66 L56 60 Z" fill={color} />
      <rect x="47.5" y="62" width="5" height="26" fill={color} rx="0.6" />
      {Array.from({ length: 4 }, (_, i) => (
        <line key={`g${i}`} x1="47" y1={70 + i * 4} x2="53" y2={71 + i * 4} stroke={BONE} strokeWidth="0.6" />
      ))}
    </svg>
  );
}

export function PadelIcon({ size = 80, color = "#1a1411" }: SportIconProps) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} fill="none" aria-hidden="true">
      <path d="M50 10 C72 10 78 28 78 42 C78 56 66 64 50 64 C34 64 22 56 22 42 C22 28 28 10 50 10 Z"
        stroke={color} strokeWidth="2" fill="none" />
      {([
        [40, 28], [50, 24], [60, 28],
        [34, 38], [44, 36], [54, 36], [64, 38],
        [38, 48], [48, 46], [58, 46], [62, 50],
      ] as [number, number][]).map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="1.4" fill={color} opacity="0.7" />
      ))}
      <rect x="47.5" y="64" width="5" height="24" fill={color} rx="0.6" />
      <path d="M47 86 q 3 6 6 0" stroke={color} strokeWidth="0.8" fill="none" />
    </svg>
  );
}

export function SquashIcon({ size = 80, color = "#1a1411" }: SportIconProps) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} fill="none" aria-hidden="true">
      <ellipse cx="50" cy="28" rx="16" ry="18" stroke={color} strokeWidth="2" />
      {Array.from({ length: 5 }, (_, i) => (
        <line key={`v${i}`} x1={38 + i * 6} y1="12" x2={38 + i * 6} y2="44" stroke={color} strokeWidth="0.5" opacity="0.55" />
      ))}
      {Array.from({ length: 5 }, (_, i) => (
        <line key={`h${i}`} x1="35" y1={16 + i * 6} x2="65" y2={16 + i * 6} stroke={color} strokeWidth="0.5" opacity="0.55" />
      ))}
      <path d="M46 46 L50 50 L54 46 Z" fill={color} />
      <rect x="48.5" y="48" width="3" height="34" fill={color} />
      <rect x="46" y="82" width="8" height="10" fill={color} rx="0.8" />
    </svg>
  );
}

export function SportIcon({ slug, size, color }: { slug: string; size?: number; color?: string }) {
  switch (slug) {
    case "tennis": return <TennisIcon size={size} color={color} />;
    case "padel":  return <PadelIcon  size={size} color={color} />;
    case "squash": return <SquashIcon size={size} color={color} />;
    default:       return null;
  }
}
