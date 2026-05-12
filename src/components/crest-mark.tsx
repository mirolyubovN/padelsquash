export function RCSeal({ size = 48, color = "#c93f17", ring = true }: { size?: number; color?: string; ring?: boolean }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} fill="none" aria-hidden="true">
      {ring && <circle cx="24" cy="24" r="21" stroke={color} strokeWidth="1.2" fill="none" />}
      <text x="24" y="32" textAnchor="middle"
        fontFamily="'Cormorant Garamond', serif"
        fontSize="26" fontWeight="600" fontStyle="italic"
        fill={color} letterSpacing="-0.04em">RC</text>
    </svg>
  );
}

function RacketSilhouette({ length, color }: { length: number; color: string }) {
  const headR = length * 0.22;
  const headCy = -length * 0.32;
  return (
    <g>
      <rect x="-2.2" y={-length * 0.1} width="4.4" height={length * 0.42} fill={color} rx="1" />
      <path d={`M -3 ${-length * 0.1} L 0 ${-length * 0.18} L 3 ${-length * 0.1} Z`} fill={color} />
      <ellipse cx="0" cy={headCy} rx={headR * 0.86} ry={headR} stroke={color} strokeWidth="2.2" fill="none" />
      {Array.from({ length: 5 }, (_, i) => {
        const x = -headR * 0.7 + i * ((headR * 1.4) / 4);
        return (
          <line key={`v${i}`} x1={x} y1={headCy - headR * 0.92} x2={x} y2={headCy + headR * 0.92}
            stroke={color} strokeWidth="0.5" opacity="0.55" />
        );
      })}
      {Array.from({ length: 5 }, (_, i) => {
        const y = headCy - headR * 0.7 + i * ((headR * 1.4) / 4);
        return (
          <line key={`h${i}`} x1={-headR * 0.78} y1={y} x2={headR * 0.78} y2={y}
            stroke={color} strokeWidth="0.5" opacity="0.55" />
        );
      })}
      {Array.from({ length: 4 }, (_, i) => (
        <line key={`g${i}`} x1="-2.4" y1={length * 0.08 + i * 5} x2="2.4" y2={length * 0.1 + i * 5}
          stroke={color} strokeWidth="0.7" opacity="0.7" />
      ))}
    </g>
  );
}

interface CrestMarkProps {
  size?: number;
  color?: string;
}

export function CrestMark({ size = 280, color = "#c93f17" }: CrestMarkProps) {
  const brick = "#6f1d0a";
  const paper = "#faf6ee";
  return (
    <svg viewBox="0 0 200 240" width={size} height={size * 1.2} fill="none" aria-hidden="true">
      {/* Outer shield */}
      <path d="M100 8 L186 24 L186 96 C186 158 150 200 100 228 C50 200 14 158 14 96 L14 24 Z"
        stroke={color} strokeWidth="2.2" fill="none" />
      {/* Inner shield rule */}
      <path d="M100 16 L178 30 L178 96 C178 152 146 192 100 218 C54 192 22 152 22 96 L22 30 Z"
        stroke={color} strokeWidth="0.8" fill="none" opacity="0.55" />
      {/* Chief bar */}
      <path d="M22 56 L178 56" stroke={color} strokeWidth="0.8" opacity="0.55" />
      {/* R · C initials */}
      <text x="100" y="46" textAnchor="middle"
        fontFamily="'Cormorant Garamond', serif"
        fontSize="20" fontStyle="italic" fontWeight="500"
        fill={color} letterSpacing="0.05em">R · C</text>

      {/* Crossed rackets */}
      <g transform="translate(100 122) rotate(-26)">
        <RacketSilhouette length={92} color={color} />
      </g>
      <g transform="translate(100 122) rotate(26)">
        <RacketSilhouette length={92} color={color} />
      </g>

      {/* Center ball */}
      <circle cx="100" cy="122" r="9" fill={color} />
      <path d="M91.5 122 a 8.5 8.5 0 0 1 17 0" stroke={paper} strokeWidth="0.8" fill="none" opacity="0.7" />
      <path d="M91.5 122 a 8.5 8.5 0 0 0 17 0" stroke={paper} strokeWidth="0.8" fill="none" opacity="0.7" />

      {/* Three sport dots */}
      <circle cx="80" cy="190" r="2.2" fill={color} />
      <circle cx="100" cy="194" r="2.2" fill={color} />
      <circle cx="120" cy="190" r="2.2" fill={color} />

      {/* Ribbon banner */}
      <path d="M18 168 L42 162 L42 178 L18 184 Z" fill={brick} />
      <path d="M182 168 L158 162 L158 178 L182 184 Z" fill={brick} />
      <path d="M30 162 L170 162 L170 180 L30 180 Z" fill={color} />
      <text x="100" y="175" textAnchor="middle"
        fontFamily="'JetBrains Mono', monospace"
        fontSize="7.5" fontWeight="600" letterSpacing="0.28em"
        fill={paper}>RACKET · COMMUNITY</text>
    </svg>
  );
}
