import { useEffect, useRef, useState, type ReactNode } from 'react';

const motionOK = () => typeof window !== 'undefined' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Elements marked data-reveal rise into place the first time they scroll into view.
// Everything stays visible when motion is reduced or JavaScript hasn't run.
export function useReveal(deps: unknown[] = []) {
  useEffect(() => {
    if (!motionOK() || !('IntersectionObserver' in window)) return;
    document.documentElement.classList.add('motion-ok');
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      }
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    document.querySelectorAll('[data-reveal]:not(.is-in)').forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
}

// Counts a stat up from zero the first time it is seen, keeping any suffix ("7+", "8.45").
export function CountUp({ value }: { value: string }) {
  const m = /^(\d+(?:\.\d+)?)(.*)$/.exec(value.trim());
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(m && motionOK() ? '0' : value);
  useEffect(() => {
    if (!m || !motionOK()) { setShown(value); return; }
    const target = parseFloat(m[1]);
    const decimals = (m[1].split('.')[1] || '').length;
    const node = ref.current;
    if (!node) return;
    let raf = 0;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const t0 = performance.now();
      const step = (now: number) => {
        const k = Math.min(1, (now - t0) / 1400);
        const eased = 1 - Math.pow(1 - k, 3);
        setShown((target * eased).toFixed(decimals) + (k === 1 ? m[2] : ''));
        if (k < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    }, { threshold: 0.6 });
    io.observe(node);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps
  return <span ref={ref} aria-label={value}>{shown}</span>;
}

// Card that tilts toward the pointer with a moving glare, like a glossy print under light.
export function Tilt({ children, className = '', max = 7 }: { children: ReactNode; className?: string; max?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const fine = typeof window !== 'undefined' && window.matchMedia('(pointer: fine)').matches && motionOK();
  const move = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el || !fine) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    el.style.setProperty('--rx', `${(0.5 - y) * max}deg`);
    el.style.setProperty('--ry', `${(x - 0.5) * max}deg`);
    el.style.setProperty('--gx', `${x * 100}%`);
    el.style.setProperty('--gy', `${y * 100}%`);
    el.style.setProperty('--glare', '1');
  };
  const leave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg'); el.style.setProperty('--glare', '0');
  };
  return (
    <div ref={ref} onPointerMove={move} onPointerLeave={leave} className={`tilt ${className}`}>
      {children}
      <span className="tilt-glare" aria-hidden="true" />
    </div>
  );
}

// A soft vapour trail behind the mouse pointer. Desktop only, off when motion is reduced.
export function Contrail({ night }: { night: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const nightRef = useRef(night);
  nightRef.current = night;
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !motionOK() || !window.matchMedia('(pointer: fine)').matches) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const pts: { x: number; y: number; t: number }[] = [];
    let raf = 0, idle = true, dpr = 1;
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = innerWidth * dpr; canvas.height = innerHeight * dpr;
    };
    const draw = () => {
      const now = performance.now();
      while (pts.length && now - pts[0].t > 650) pts.shift();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      const rgb = nightRef.current ? '235,242,255' : '255,255,255';
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1], b = pts[i];
        const life = 1 - (now - b.t) / 650;
        const spread = (1 - life) * 9;
        ctx.strokeStyle = `rgba(${rgb},${life * (nightRef.current ? 0.35 : 0.75)})`;
        ctx.lineWidth = 1.5 + spread;
        ctx.lineCap = 'round';
        ctx.shadowColor = nightRef.current ? 'rgba(156,195,240,.6)' : 'rgba(13,27,54,.18)';
        ctx.shadowBlur = 6 + spread;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
      if (pts.length) raf = requestAnimationFrame(draw);
      else { idle = true; ctx.clearRect(0, 0, innerWidth, innerHeight); }
    };
    const move = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      pts.push({ x: e.clientX, y: e.clientY, t: performance.now() });
      if (pts.length > 60) pts.shift();
      if (idle) { idle = false; raf = requestAnimationFrame(draw); }
    };
    resize();
    addEventListener('resize', resize);
    addEventListener('pointermove', move, { passive: true });
    return () => { cancelAnimationFrame(raf); removeEventListener('resize', resize); removeEventListener('pointermove', move); };
  }, []);
  return <canvas ref={ref} className="pointer-events-none fixed inset-0 z-[60] h-full w-full" aria-hidden="true" />;
}

const PHASES: [string, string][] = [
  ['top', 'Takeoff'], ['departures', 'Climb'], ['logbook', 'Cruise'], ['ratings', 'Cruise'], ['fleet', 'Descent'], ['atc', 'Approach'],
];

// In-flight map under the top bar: the aircraft travels from origin to destination as the page scrolls.
export function FlightProgress({ from, to }: { from: string; to: string }) {
  const [p, setP] = useState(0);
  const [phase, setPhase] = useState('Takeoff');
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const max = document.documentElement.scrollHeight - innerHeight;
      setP(max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0);
      const mid = innerHeight * 0.4;
      let current = PHASES[0][1];
      for (const [id, name] of PHASES) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top < mid) current = name;
      }
      setPhase(current);
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', onScroll);
    return () => { removeEventListener('scroll', onScroll); removeEventListener('resize', onScroll); cancelAnimationFrame(raf); };
  }, []);
  const climb = Math.sin(Math.min(1, p * 1.6) * Math.PI / 2);
  const fl = Math.round((p > 0.8 ? climb * (1 - (p - 0.8) / 0.2) : climb) * 370);
  const gs = Math.round(150 + Math.min(1, p * 3) * 340);
  return (
    <div className="border-t border-white/10 px-4 py-1.5 sm:px-8" aria-hidden="true">
      <div className="mx-auto flex max-w-[1320px] items-center gap-3 font-mono text-[10.5px] uppercase tracking-[.12em] text-steel">
        <span className="font-bold text-white">{from}</span>
        <div className="relative h-4 flex-1">
          <span className="absolute inset-x-0 top-1/2 border-t border-dashed border-white/25" />
          <span className="absolute left-0 top-1/2 h-px bg-gradient-to-r from-amber/30 to-amber" style={{ width: `${p * 100}%` }} />
          <svg viewBox="0 0 24 24" className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rotate-90 text-amber transition-[left] duration-150" style={{ left: `${p * 100}%` }}>
            <path fill="currentColor" d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z" />
          </svg>
        </div>
        <span className="font-bold text-white">{to}</span>
        <span className="hidden min-w-[250px] justify-end gap-3 sm:flex">
          <span className="text-amber">{phase}</span>
          <span>FL{String(fl).padStart(3, '0')}</span>
          <span>GS {gs} KT</span>
          <span>{Math.round(p * 100)}%</span>
        </span>
      </div>
    </div>
  );
}
