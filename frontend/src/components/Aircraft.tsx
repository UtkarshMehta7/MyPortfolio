// Side-view airliner silhouettes (nose to the right), drawn from a few parameters per type.

export interface AircraftSpec {
  model: string;        // short id used in content, e.g. "A380-800"
  name: string;         // full marketing name
  maker: string;
  engines: number;
  range: string;
  seats: string;        // typical seating
  length: string;
  reg: string;          // tail number painted on the card
}

export const FLEET: AircraftSpec[] = [
  { model: 'A380-800', name: 'Airbus A380-800', maker: 'Airbus', engines: 4, range: '15,000 km', seats: '525', length: '72.7 m', reg: 'VT-UTK' },
  { model: '777-300ER', name: 'Boeing 777-300ER', maker: 'Boeing', engines: 2, range: '13,650 km', seats: '396', length: '73.9 m', reg: 'VT-UMA' },
  { model: 'A350-1000', name: 'Airbus A350-1000', maker: 'Airbus', engines: 2, range: '16,100 km', seats: '350', length: '73.8 m', reg: 'VT-CLD' },
  { model: '787-9', name: 'Boeing 787-9 Dreamliner', maker: 'Boeing', engines: 2, range: '14,010 km', seats: '296', length: '62.8 m', reg: 'VT-DEV' },
  { model: '747-8', name: 'Boeing 747-8 Intercontinental', maker: 'Boeing', engines: 4, range: '14,320 km', seats: '410', length: '76.3 m', reg: 'VT-SYS' },
  { model: 'A321neo', name: 'Airbus A321neo', maker: 'Airbus', engines: 2, range: '7,400 km', seats: '206', length: '44.5 m', reg: 'VT-CSE' },
];

export const fleetSpec = (model: string | undefined, index = 0): AircraftSpec =>
  FLEET.find((f) => f.model === model) ?? FLEET[index % FLEET.length];

type Winglet = 'none' | 'sharklet' | 'curved' | 'fence';

interface Shape {
  nose: number;        // x of the nose tip
  top: number;         // y of the main deck roof
  hump?: boolean;      // 747 upper-deck hump
  doubleDeck?: boolean;// A380 full-length upper deck
  engineH: number;     // engine nacelle height
  engineL: number;     // engine nacelle length
  fin: number;         // tail fin height
  winglet: Winglet;
  mask?: boolean;      // A350 dark cockpit "raccoon mask"
  chevrons?: boolean;  // 787 serrated nacelle exhaust
}

const SHAPES: Record<string, Shape> = {
  'A380-800': { nose: 372, top: 24, doubleDeck: true, engineH: 15, engineL: 44, fin: 40, winglet: 'fence' },
  '777-300ER': { nose: 392, top: 42, engineH: 20, engineL: 56, fin: 36, winglet: 'none' },
  'A350-1000': { nose: 384, top: 42, engineH: 17, engineL: 50, fin: 36, winglet: 'curved', mask: true },
  '787-9': { nose: 352, top: 44, engineH: 16, engineL: 48, fin: 34, winglet: 'none', chevrons: true },
  '747-8': { nose: 396, top: 42, hump: true, engineH: 14, engineL: 42, fin: 42, winglet: 'none' },
  'A321neo': { nose: 300, top: 46, engineH: 14, engineL: 40, fin: 32, winglet: 'sharklet' },
};

import { useId } from 'react';

interface Props {
  model?: string;
  className?: string;
  mono?: boolean;   // flat single-colour silhouette
  gear?: boolean;   // landing gear down (takeoff roll)
  lights?: boolean; // beacon, strobes and landing light (night)
}

export default function Aircraft({ model, className = '', mono = false, gear = false, lights = false }: Props) {
  const gid = `livery-${useId().replace(/:/g, '')}`;
  const spec = fleetSpec(model);
  const s = SHAPES[spec.model] ?? SHAPES['A350-1000'];
  const x0 = 26;
  const bot = 72;
  const x1 = s.nose;
  const mid = (x0 + x1) / 2 + 8;
  const four = spec.engines === 4;

  // Fuselage: upswept tail cone, straight cabin, rounded nose (747 hump, A380 blunt double-deck nose).
  const nose = (xr: number, yr: number) =>
    s.doubleDeck
      ? `L ${xr} ${yr} C ${x1 - 6} ${yr} ${x1 + 2} ${bot - 30} ${x1} ${bot - 14} Q ${x1 - 3} ${bot} ${x1 - 30} ${bot}`
      : `L ${xr} ${yr} C ${x1 - 12} ${yr} ${x1 + 2} ${bot - 22} ${x1} ${bot - 11} Q ${x1 - 3} ${bot} ${x1 - 30} ${bot}`;
  const roof = s.hump
    ? `L ${x1 - 178} ${s.top} C ${x1 - 160} ${s.top} ${x1 - 150} ${s.top - 12} ${x1 - 124} ${s.top - 12} L ${x1 - 84} ${s.top - 12} C ${x1 - 40} ${s.top - 12} ${x1 - 6} ${s.top + 6} ${x1} ${bot - 11} Q ${x1 - 3} ${bot} ${x1 - 30} ${bot}`
    : nose(x1 - 44, s.top);
  const fuselage = `M ${x0} ${s.top + 9} L ${x0 + 44} ${s.top} ${roof} L ${x0 + 118} ${bot} Q ${x0 + 56} ${bot} ${x0 + 3} ${s.top + 15} Z`;
  const fin = `M ${x0 + 12} ${s.top + 4} L ${x0 - 4} ${s.top - s.fin} L ${x0 + 20} ${s.top - s.fin} L ${x0 + 74} ${s.top + 2} Z`;
  const stab = `M ${x0 + 14} ${s.top + 13} L ${x0 - 10} ${s.top + 22} L ${x0 + 4} ${s.top + 22} L ${x0 + 56} ${s.top + 15} Z`;

  // Near wing, swept back and seen slightly from below.
  const tipY = bot + 22;
  const wing = `M ${mid + 40} ${bot - 3} L ${mid - 62} ${tipY} L ${mid - 88} ${tipY + 2} L ${mid - 30} ${bot} Z`;
  const winglet = {
    none: '',
    sharklet: `M ${mid - 64} ${tipY} L ${mid - 78} ${tipY - 15} L ${mid - 84} ${tipY - 15} L ${mid - 82} ${tipY + 1} Z`,
    curved: `M ${mid - 64} ${tipY} Q ${mid - 78} ${tipY - 2} ${mid - 86} ${tipY - 16} L ${mid - 90} ${tipY - 15} Q ${mid - 86} ${tipY} ${mid - 82} ${tipY + 2} Z`,
    fence: `M ${mid - 70} ${tipY - 7} L ${mid - 80} ${tipY - 7} L ${mid - 82} ${tipY + 9} L ${mid - 72} ${tipY + 9} Z`,
  }[s.winglet];

  // Engines hang ahead of the leading edge; a four-engine type shows its outboard pair further back and lower.
  const engine = (front: number, y: number, k: number) => {
    const L = s.engineL * k;
    const H = s.engineH * k;
    const back = front - L;
    return { front, back, y, H, L };
  };
  const engines = four
    ? [engine(mid + 34, bot + 1, 1), engine(mid - 12, bot + 10, 0.92)]
    : [engine(mid + 36, bot + 1, 1)];

  const windows = [] as number[];
  const winStart = x0 + 62;
  const winEnd = x1 - 58;
  for (let x = winStart; x < winEnd; x += 7) windows.push(x);
  const winY = s.doubleDeck ? s.top + 31 : s.top + (bot - s.top) * 0.38;
  const upperWindows = s.doubleDeck ? windows.filter((x) => x > winStart + 6 && x < winEnd - 10) : s.hump ? windows.filter((x) => x > x1 - 148 && x < x1 - 82) : [];
  const upperY = s.doubleDeck ? s.top + 13 : s.top - 4;
  const doors = [x1 - 64, mid + 20, x0 + 74];
  const cockpitY = s.hump ? s.top - 2 : s.doubleDeck ? bot - 30 : s.top + 8;

  const body = mono ? '#2a4378' : '#fbfdff';
  const line = mono ? 'none' : '#9fb0c8';
  const wingFill = mono ? body : '#dfe7f2';
  const nacelle = mono ? body : '#c4d1e3';

  return (
    <svg viewBox="0 0 420 110" className={className} role="img" aria-label={`${spec.name} silhouette`}>
      <g opacity={mono ? 0.55 : 1}>
        {!mono && (
          <defs>
            <linearGradient id={gid} x1="0" y1="1" x2="1" y2="0">
              <stop offset="0" stopColor="#3d6fd6" />
              <stop offset=".62" stopColor="#3d6fd6" />
              <stop offset=".62" stopColor="#e7795d" />
              <stop offset="1" stopColor="#f2b84b" />
            </linearGradient>
            <linearGradient id={`${gid}-b`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#ffffff" />
              <stop offset=".72" stopColor="#f4f7fb" />
              <stop offset="1" stopColor="#d8e1ee" />
            </linearGradient>
          </defs>
        )}

        {gear && (
          <g stroke={mono ? body : '#5a6b84'} strokeWidth="2.4" strokeLinecap="round">
            <line x1={mid - 14} y1={bot - 2} x2={mid - 14} y2={bot + 22} />
            <line x1={x1 - 44} y1={bot - 2} x2={x1 - 44} y2={bot + 21} />
          </g>
        )}

        <path d={stab} fill={wingFill} stroke={line} strokeWidth=".8" />
        <path d={fuselage} fill={mono ? body : `url(#${gid}-b)`} stroke={line} strokeWidth="1.2" />
        <path d={fin} fill={mono ? body : `url(#${gid})`} />

        {!mono && (
          <>
            <path d={`M ${x0 + 40} ${bot - 9} L ${x1 - 36} ${bot - 9}`} stroke="#3d6fd6" strokeWidth="2.2" strokeLinecap="round" opacity=".85" />
            {windows.map((x) => <rect key={`w${x}`} x={x - 1.4} y={winY - 1.9} width="2.8" height="3.8" rx="1.3" fill="#5a6b84" />)}
            {upperWindows.map((x) => <rect key={`u${x}`} x={x - 1.3} y={upperY - 1.8} width="2.6" height="3.6" rx="1.2" fill="#5a6b84" />)}
            {doors.map((x) => (
              <rect key={`d${x}`} x={x} y={(s.doubleDeck ? s.top + 25 : winY - 5)} width="6" height="12" rx="2" fill="none" stroke="#b6c4d8" strokeWidth=".8" />
            ))}
            <path d={`M ${x1 - 26} ${cockpitY} L ${x1 - 12} ${cockpitY + 2} L ${x1 - 8} ${cockpitY + 7} L ${x1 - 26} ${cockpitY + 7} Z`} fill="#132447" />
            {s.mask && <path d={`M ${x1 - 32} ${cockpitY - 2} L ${x1 - 8} ${cockpitY + 3} L ${x1 - 5} ${cockpitY + 10} L ${x1 - 32} ${cockpitY + 9} Z`} fill="#132447" opacity=".85" />}
            <text x={x0 + 30} y={s.top - 8} fontFamily="JetBrains Mono, monospace" fontSize="8" fontWeight="700" fill="#fff" opacity=".95" transform={`rotate(-40 ${x0 + 30} ${s.top - 8})`}>UM</text>
          </>
        )}

        <path d={wing} fill={wingFill} stroke={line} strokeWidth="1" />
        {winglet && <path d={winglet} fill={mono ? body : '#3d6fd6'} />}

        {engines.map((e, i) => (
          <g key={i}>
            <path d={`M ${e.back + e.L * 0.3} ${e.y + 1} L ${e.back + e.L * 0.25} ${bot - 3 + i * 9} L ${e.back + e.L * 0.7} ${bot - 4 + i * 9} L ${e.back + e.L * 0.75} ${e.y + 1} Z`} fill={wingFill} />
            <path
              d={`M ${e.back} ${e.y + e.H * 0.22} L ${e.front - 6} ${e.y} Q ${e.front} ${e.y} ${e.front} ${e.y + e.H / 2} Q ${e.front} ${e.y + e.H} ${e.front - 6} ${e.y + e.H} L ${e.back} ${e.y + e.H * 0.78} Z`}
              fill={nacelle} stroke={line} strokeWidth="1"
            />
            {!mono && (
              <>
                <ellipse cx={e.front - 1.5} cy={e.y + e.H / 2} rx="2.6" ry={e.H / 2 - 1.4} fill="#2a3a55" />
                <path d={`M ${e.back} ${e.y + e.H * 0.3} L ${e.back - 7} ${e.y + e.H / 2} L ${e.back} ${e.y + e.H * 0.7} Z`} fill="#8a9bb5" />
                {s.chevrons && <path d={`M ${e.back} ${e.y + e.H * 0.22} l -2.5 ${e.H * 0.14} l 2.5 ${e.H * 0.14} l -2.5 ${e.H * 0.14} l 2.5 ${e.H * 0.14}`} fill="none" stroke="#8a9bb5" strokeWidth="1" />}
                <path d={`M ${e.back + 4} ${e.y + e.H * 0.36} L ${e.front - 8} ${e.y + 2.5}`} stroke="#fff" strokeWidth="1.4" opacity=".6" strokeLinecap="round" />
              </>
            )}
          </g>
        ))}

        {gear && (
          <g fill={mono ? body : '#1d2a40'}>
            <circle cx={mid - 19} cy={bot + 24} r="5" />
            <circle cx={mid - 9} cy={bot + 24} r="5" />
            <circle cx={x1 - 44} cy={bot + 24} r="3.8" />
          </g>
        )}

        {lights && (
          <g>
            <circle cx={mid} cy={s.doubleDeck ? s.top - 1 : s.hump ? s.top - 1 : s.top - 1} r="2.4" fill="#ff5b5b" className="motion-safe:animate-blink" style={{ filter: 'drop-shadow(0 0 4px #ff5b5b)' }} />
            <circle cx={mid - 80} cy={tipY + 1} r="2" fill="#ffffff" className="motion-safe:animate-strobe" style={{ filter: 'drop-shadow(0 0 5px #fff)' }} />
            <circle cx={x0 + 1} cy={s.top + 11} r="1.8" fill="#ffffff" className="motion-safe:animate-strobe" style={{ filter: 'drop-shadow(0 0 4px #fff)', animationDelay: '.15s' }} />
            <circle cx={x1 - 46} cy={bot + 6} r="2.4" fill="#fff6d8" style={{ filter: 'drop-shadow(0 0 6px #fff6d8)' }} />
          </g>
        )}
      </g>
    </svg>
  );
}
