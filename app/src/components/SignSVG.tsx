import type { SignSpec } from '../content/types';

interface Props {
  sign: SignSpec;
  size?: number;
  /** Decorative when the label is already provided by surrounding text. */
  title?: string;
}

const VIEW = 100;

function points(list: [number, number][]): string {
  return list.map(([x, y]) => `${x},${y}`).join(' ');
}

function octagon(): string {
  const a = 29.3;
  const b = 100 - a;
  return points([
    [a, 2],
    [b, 2],
    [98, a],
    [98, b],
    [b, 98],
    [a, 98],
    [2, b],
    [2, a],
  ]);
}

function shapeElement(sign: SignSpec) {
  const stroke = sign.fg;
  const common = { fill: sign.bg, stroke, strokeWidth: 3 } as const;
  switch (sign.shape) {
    case 'octagon':
      return <polygon points={octagon()} {...common} />;
    case 'triangle-down':
      return <polygon points={points([[3, 6], [97, 6], [50, 96]])} {...common} />;
    case 'diamond':
      return <polygon points={points([[50, 3], [97, 50], [50, 97], [3, 50]])} {...common} />;
    case 'pennant':
      return <polygon points={points([[4, 8], [96, 40], [4, 72]])} {...common} />;
    case 'circle':
      return <circle cx={50} cy={50} r={47} {...common} />;
    case 'pentagon':
      return <polygon points={points([[50, 3], [95, 38], [78, 96], [22, 96], [5, 38]])} {...common} />;
    case 'rectangle-v':
      return <rect x={16} y={3} width={68} height={94} rx={5} {...common} />;
    case 'rectangle-h':
      return <rect x={3} y={20} width={94} height={60} rx={5} {...common} />;
    case 'crossbuck':
      return (
        <g>
          <rect x={3} y={20} width={94} height={60} rx={5} fill={sign.bg} stroke="none" />
          <rect
            x={44}
            y={6}
            width={12}
            height={88}
            fill={sign.bg}
            stroke={sign.fg}
            strokeWidth={3}
            transform="rotate(45 50 50)"
          />
          <rect
            x={44}
            y={6}
            width={12}
            height={88}
            fill={sign.bg}
            stroke={sign.fg}
            strokeWidth={3}
            transform="rotate(-45 50 50)"
          />
        </g>
      );
  }
}

function legendLines(legend: string): string[] {
  const words = legend.split(/\s+/).filter(Boolean);
  if (words.length <= 1) return words;
  const lines: string[] = [];
  let current = '';
  const target = Math.ceil(legend.length / Math.min(3, Math.ceil(legend.length / 8) || 1));
  for (const word of words) {
    if (current.length === 0) current = word;
    else if ((current + ' ' + word).length <= Math.max(target, 7)) current += ' ' + word;
    else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 4);
}

/** Signs are drawn locally from the spec — no external imagery, no official seals. */
export function SignSVG({ sign, size = 120, title }: Props) {
  const lines = sign.legend ? legendLines(sign.legend) : [];
  const fontSize = lines.length === 0 ? 0 : Math.max(9, 26 - lines.length * 4 - Math.max(0, (lines[0]?.length ?? 0) - 6) * 1.1);
  const startY = 50 - ((lines.length - 1) * fontSize * 1.15) / 2 + fontSize * 0.35;
  const label = title ?? sign.name;
  return (
    <svg
      viewBox={`0 0 ${VIEW} ${VIEW}`}
      width={size}
      height={size}
      role="img"
      aria-label={label}
      className="sign-svg"
    >
      <title>{label}</title>
      {shapeElement(sign)}
      {lines.map((line, index) => (
        <text
          key={`${line}-${index}`}
          x={50}
          y={startY + index * fontSize * 1.15}
          textAnchor="middle"
          fontSize={fontSize}
          fontFamily="system-ui, sans-serif"
          fontWeight="700"
          fill={sign.fg}
        >
          {line}
        </text>
      ))}
    </svg>
  );
}
