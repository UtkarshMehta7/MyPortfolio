import { useEffect, useRef } from 'react';
import type { Theme } from '../hooks/useTheme';

// Cockpit view down runway 27: a real perspective projection of the runway, its markings and lights,
// with the camera running a takeoff roll — lined up, accelerate, V1, rotate, lift off, climb — on a loop.

const L = 3200;          // runway length (m)
const HALF_W = 22.5;     // half of a 45 m wide runway
const LOOP = 26;         // seconds per takeoff
const START_Z = -45;     // lined up just behind the threshold

type Rect = [x1: number, x2: number, z1: number, z2: number];

const SEG: Record<string, string> = { '2': 'abged', '7': 'abc' };
function digit(ch: string, x0: number, zb: number, w = 6, h = 18, t = 1.6): Rect[] {
  const m = zb + h / 2;
  const s: Record<string, Rect> = {
    a: [x0, x0 + w, zb + h - t, zb + h], b: [x0 + w - t, x0 + w, m, zb + h], c: [x0 + w - t, x0 + w, zb, m],
    d: [x0, x0 + w, zb, zb + t], e: [x0, x0 + t, zb, m], f: [x0, x0 + t, m, zb + h], g: [x0, x0 + w, m - t / 2, m + t / 2],
  };
  return [...SEG[ch]].map((k) => s[k]);
}

function buildMarkings(): Rect[] {
  const r: Rect[] = [];
  for (let i = 0; i < 8; i++) {                       // threshold "piano keys"
    const x = 3 + i * 2.4;
    r.push([x, x + 1.8, 6, 36], [-x - 1.8, -x, 6, 36]);
  }
  r.push(...digit('2', -8, 48), ...digit('7', 2, 48)); // designation
  for (let z = 90; z < L - 90; z += 60) r.push([-0.45, 0.45, z, z + 36]); // centreline
  const tdz = (z: number, bars: number) => {
    for (let b = 0; b < bars; b++) {
      const x = 4.5 + b * 3;
      r.push([x, x + 1.8, z, z + 22.5], [-x - 1.8, -x, z, z + 22.5]);
    }
  };
  tdz(150, 3); tdz(300, 3); tdz(600, 2); tdz(750, 2); tdz(900, 1); tdz(1050, 1);
  r.push([5.5, 15.5, 400, 445], [-15.5, -5.5, 400, 445]); // aiming point
  for (const end of [L - 36, L - 6]) r.push([-HALF_W + 1, HALF_W - 1, end - 0.5, end]);
  return r;
}
const MARKINGS = buildMarkings();

type Light = { x: number; z: number; c: 'w' | 'a' | 'g' | 'r' };
function buildLights(): Light[] {
  const l: Light[] = [];
  for (let z = 0; z <= L; z += 60) {
    const c = z > L - 600 ? 'a' : 'w';
    l.push({ x: -HALF_W - 1.2, z, c }, { x: HALF_W + 1.2, z, c });
  }
  for (let z = 15; z < L; z += 15) l.push({ x: 0.7, z, c: z > L - 300 ? 'r' : z > L - 900 && (z / 15) % 2 ? 'r' : 'w' });
  for (let x = -HALF_W; x <= HALF_W; x += 3) { l.push({ x, z: -1, c: 'g' }); l.push({ x, z: L + 1, c: 'r' }); }
  return l;
}
const LIGHTS = buildLights();

const hash = (n: number) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (a: number, b: number, t: number) => { const x = clamp((t - a) / (b - a)); return x * x * (3 - 2 * x); };

function flight(t: number) {
  const a1 = 5, t1 = 14, v1 = a1 * t1, z1 = 0.5 * a1 * t1 * t1;
  let z = 0, v = 0;
  if (t > 2 && t <= 16) { const d = t - 2; v = a1 * d; z = 0.5 * a1 * d * d; }
  else if (t > 16) { const d = t - 16; v = v1 + 1.5 * d; z = z1 + v1 * d + 0.75 * d * d; }
  const pitch = 0.15 * smooth(16, 19, t) + 0.025 * smooth(19, 23, t);
  const lift = Math.max(0, t - 17.6);
  const h = 5 + 1.1 * lift * lift;
  const fade = t > 24.6 ? smooth(24.6, 25.5, t) : t < 0.9 ? 1 - smooth(0, 0.9, t) : 0;
  return { z: START_Z + z, v, pitch, h, fade, airborne: lift > 0 };
}

const PALETTE = {
  day: {
    sky: ['#3d6db5', '#86afdf', '#dbe6ef'], haze: [214, 226, 236], horizonGlow: 'rgba(255,236,205,.35)',
    grassNear: [86, 112, 58], grassFar: [150, 168, 140], asphaltNear: [72, 75, 80], asphaltFar: [150, 158, 168],
    treeline: '#5c6f6e', paint: 1,
  },
  night: {
    sky: ['#02060f', '#081530', '#1d2c50'], haze: [32, 42, 70], horizonGlow: 'rgba(242,160,90,.22)',
    grassNear: [10, 16, 26], grassFar: [18, 26, 44], asphaltNear: [52, 56, 66], asphaltFar: [18, 24, 40],
    treeline: '#050a16', paint: 0,
  },
};

function sprite(color: string) {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, '#ffffff');
  grd.addColorStop(0.12, color);
  grd.addColorStop(0.4, color.replace(/[\d.]+\)$/, '0.25)'));
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  return c;
}

const mix = (a: number[], b: number[], t: number) => `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(',')})`;

export default function RunwayView({ theme, hud = true, className = '' }: { theme: Theme; hud?: boolean; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const themeRef = useRef(theme);
  themeRef.current = theme;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const sprites = { w: sprite('rgba(255,244,220,1)'), a: sprite('rgba(255,190,80,1)'), g: sprite('rgba(80,255,150,1)'), r: sprite('rgba(255,70,70,1)') };
    const stars = Array.from({ length: 140 }, (_, i) => ({ x: hash(i), y: hash(i + 500), s: hash(i + 900) }));
    const skyline = Array.from({ length: 160 }, (_, i) => hash(i + 77));
    let W = 0, H = 0, dpr = 1, raf = 0, running = false, t0 = performance.now();
    // the viewer's head follows the pointer a little, like leaning in a cockpit seat
    let camX = 0, look = 0, leanX = 0, leanY = 0;
    const lean = (e: PointerEvent) => { leanX = (e.clientX / innerWidth - 0.5) * 7; leanY = e.clientY / innerHeight - 0.5; };
    addEventListener('pointermove', lean, { passive: true });
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      W = canvas.clientWidth; H = canvas.clientHeight;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      if (!running) draw(reduce ? 7 : ((performance.now() - t0) / 1000) % LOOP);
    };

    function draw(t: number) {
      if (!ctx || !W || !H) return;
      const P = PALETTE[themeRef.current];
      const night = themeRef.current === 'night';
      const s = flight(t);
      const f = Math.max(W, H * 1.15) / 1.35;
      const shake = s.airborne ? 0 : (s.v / 70) * 1.3;
      const jx = (hash(t * 60) - 0.5) * shake, jy = (hash(t * 60 + 3) - 0.5) * shake * 1.6;
      camX += (leanX - camX) * 0.05; look += (leanY - look) * 0.05;
      const hy = H * 0.55 + s.pitch * f + jy - look * H * 0.05;
      const cx = W / 2 + jx;
      const near = Math.max(0.6, (f * s.h) / Math.max(1, H - hy) * 0.95);
      const zNear = s.z + near;
      const proj = (x: number, z: number) => { const dz = z - s.z; return [cx + (f * (x - camX)) / dz, hy + (f * s.h) / dz] as const; };
      const fog = (dz: number) => clamp(dz / 2200);

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;

      // sky
      const sky = ctx.createLinearGradient(0, 0, 0, hy);
      sky.addColorStop(0, P.sky[0]); sky.addColorStop(0.65, P.sky[1]); sky.addColorStop(1, P.sky[2]);
      ctx.fillStyle = sky; ctx.fillRect(0, 0, W, hy + 1);
      if (night) {
        for (const st of stars) {
          const y = st.y * hy * 0.92;
          ctx.globalAlpha = (0.25 + st.s * 0.75) * clamp(1 - y / hy + 0.2) * (0.75 + 0.25 * Math.sin(t * 2 + st.s * 20));
          ctx.fillStyle = '#fff';
          ctx.fillRect(st.x * W, y, st.s > 0.9 ? 2 : 1.2, st.s > 0.9 ? 2 : 1.2);
        }
        ctx.globalAlpha = 1;
      } else {
        const sx = W * 0.8, sy = hy * 0.28;
        const sun = ctx.createRadialGradient(sx, sy, 0, sx, sy, W * 0.35);
        sun.addColorStop(0, 'rgba(255,250,235,.95)'); sun.addColorStop(0.06, 'rgba(255,244,214,.55)'); sun.addColorStop(1, 'rgba(255,244,214,0)');
        ctx.fillStyle = sun; ctx.fillRect(0, 0, W, hy);
      }
      const glow = ctx.createLinearGradient(0, hy - H * 0.18, 0, hy);
      glow.addColorStop(0, 'rgba(0,0,0,0)'); glow.addColorStop(1, P.horizonGlow);
      ctx.fillStyle = glow; ctx.fillRect(0, hy - H * 0.18, W, H * 0.18);

      // horizon: tree line, terminal and tower; city lights at night
      ctx.fillStyle = P.treeline;
      ctx.beginPath(); ctx.moveTo(0, hy);
      for (let i = 0; i <= 160; i++) ctx.lineTo((i / 160) * W, hy - 2 - skyline[i] * 5 - (i % 7 === 0 ? 3 : 0));
      ctx.lineTo(W, hy); ctx.closePath(); ctx.fill();
      const tx = W * 0.74;
      ctx.fillRect(tx - W * 0.09, hy - 9, W * 0.08, 9);
      ctx.fillRect(tx + 6, hy - 34, 5, 34); ctx.fillRect(tx + 2, hy - 40, 13, 7);
      if (night) {
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 160; i++) {
          if (skyline[i] < 0.45) continue;
          const x = (i / 160) * W + skyline[(i * 7) % 160] * 6;
          ctx.drawImage(sprites[skyline[(i * 3) % 160] > 0.7 ? 'w' : 'a'], x - 3, hy - 3 - skyline[(i * 5) % 160] * 4, 6, 6);
        }
        ctx.drawImage(sprites.r, tx + 5.5, hy - 47, 6 + 4 * (Math.sin(t * 5) > 0 ? 1 : 0), 6 + 4 * (Math.sin(t * 5) > 0 ? 1 : 0));
        ctx.globalCompositeOperation = 'source-over';
      }

      // ground
      const ground = ctx.createLinearGradient(0, hy, 0, H);
      ground.addColorStop(0, mix(P.grassFar, P.haze, 0.5)); ground.addColorStop(0.25, mix(P.grassFar, P.grassNear, 0.5)); ground.addColorStop(1, mix(P.grassNear, P.grassNear, 0));
      ctx.fillStyle = ground; ctx.fillRect(0, hy, W, H - hy);
      // mown grass bands — these stream past and sell the speed
      const step = 9;
      for (let z = Math.floor(zNear / step) * step; z < s.z + 700; z += step) {
        if (Math.round(z / step) % 2) continue;
        const z1 = Math.max(z, zNear), dz = z1 - s.z;
        const [, y1] = proj(0, z1); const [, y2] = proj(0, z + step);
        ctx.globalAlpha = (night ? 0.18 : 0.12) * (1 - fog(dz));
        ctx.fillStyle = night ? '#000' : '#2f4220';
        ctx.fillRect(0, y2, W, y1 - y2);
      }
      ctx.globalAlpha = 1;

      // runway surface
      const zFar = Math.min(L, s.z + 6000);
      if (zFar > zNear) {
        const [ax, ay] = proj(-HALF_W, zNear), [bx] = proj(HALF_W, zNear), [cx2, cy] = proj(HALF_W, zFar), [dx] = proj(-HALF_W, zFar);
        const asphalt = ctx.createLinearGradient(0, cy, 0, ay);
        asphalt.addColorStop(0, mix(P.asphaltFar, P.haze, night ? 0 : 0.35)); asphalt.addColorStop(0.35, mix(P.asphaltFar, P.asphaltNear, 0.6)); asphalt.addColorStop(1, mix(P.asphaltNear, P.asphaltNear, 0));
        ctx.fillStyle = asphalt;
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, ay); ctx.lineTo(cx2, cy); ctx.lineTo(dx, cy); ctx.closePath(); ctx.fill();

        // patches, joints and rubber deposits on the asphalt
        for (let z = Math.floor(zNear / 4) * 4; z < Math.min(zFar, s.z + 500); z += 4) {
          const k = hash(z);
          if (k < 0.55) continue;
          const z1 = Math.max(z, zNear), z2 = z + 1 + k * 3;
          const [p1x, p1y] = proj(-HALF_W, z1), [p2x] = proj(HALF_W, z1), [p3x, p3y] = proj(HALF_W, z2), [p4x] = proj(-HALF_W, z2);
          ctx.globalAlpha = (k - 0.55) * (night ? 0.25 : 0.35) * (1 - fog(z1 - s.z));
          ctx.fillStyle = k > 0.8 ? '#1b1d21' : '#8b9096';
          ctx.beginPath(); ctx.moveTo(p1x, p1y); ctx.lineTo(p2x, p1y); ctx.lineTo(p3x, p3y); ctx.lineTo(p4x, p3y); ctx.closePath(); ctx.fill();
        }
        for (const side of [-1, 1]) {
          const x1 = side * 2.5, x2 = side * 9;
          const z1 = Math.max(250, zNear), z2 = 1100;
          if (z2 > z1) {
            const [q1x, q1y] = proj(x1, z1), [q2x] = proj(x2, z1), [q3x, q3y] = proj(x2, z2), [q4x] = proj(x1, z2);
            ctx.globalAlpha = night ? 0.3 : 0.22; ctx.fillStyle = '#16181b';
            ctx.beginPath(); ctx.moveTo(q1x, q1y); ctx.lineTo(q2x, q1y); ctx.lineTo(q3x, q3y); ctx.lineTo(q4x, q3y); ctx.closePath(); ctx.fill();
          }
        }

        // paint
        const paint = (r: Rect) => {
          const z1 = Math.max(r[2], zNear), z2 = Math.min(r[3], zFar);
          if (z2 <= z1) return;
          const dz = z1 - s.z;
          const lit = night ? 0.18 + 0.8 * clamp(1 - dz / 420) : 0.92 * (1 - fog(dz) * 0.8);
          if (lit < 0.02) return;
          const [p1x, p1y] = proj(r[0], z1), [p2x] = proj(r[1], z1), [p3x, p3y] = proj(r[1], z2), [p4x] = proj(r[0], z2);
          ctx.globalAlpha = lit;
          ctx.beginPath(); ctx.moveTo(p1x, p1y); ctx.lineTo(p2x, p1y); ctx.lineTo(p3x, p3y); ctx.lineTo(p4x, p3y); ctx.closePath(); ctx.fill();
        };
        ctx.fillStyle = '#eef0ee';
        MARKINGS.forEach(paint);
        paint([-HALF_W + 0.2, -HALF_W + 1.1, 0, L]);
        paint([HALF_W - 1.1, HALF_W - 0.2, 0, L]);
        ctx.globalAlpha = 1;
      }

      // landing lights washing the runway ahead
      if (night && !s.airborne) {
        const lx = W / 2, ly = hy + (H - hy) * 0.55;
        const wash = ctx.createRadialGradient(lx, ly, 0, lx, ly, (H - hy) * 1.1);
        wash.addColorStop(0, 'rgba(255,240,210,.24)'); wash.addColorStop(1, 'rgba(255,240,210,0)');
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = wash; ctx.fillRect(0, hy, W, H - hy);
        ctx.globalCompositeOperation = 'source-over';
      }

      // runway lights
      ctx.globalCompositeOperation = night ? 'lighter' : 'source-over';
      for (const lt of LIGHTS) {
        const dz = lt.z - s.z;
        if (dz < near || dz > 4500) continue;
        const [x, y] = proj(lt.x, lt.z);
        if (x < -40 || x > W + 40 || y > H + 40) continue;
        const r = Math.min(night ? 4.5 : 4, Math.max(night ? 1.5 : 0.6, (f * (night ? 0.45 : 0.28)) / dz));
        if (night) {
          ctx.globalAlpha = clamp(1.15 - fog(dz) * 0.5);
          const g = r * (lt.c === 'w' || lt.c === 'a' ? 9 : 10);
          ctx.drawImage(sprites[lt.c], x - g / 2, y - g / 2 - r, g, g);
        } else {
          ctx.globalAlpha = 0.85 * (1 - fog(dz));
          ctx.fillStyle = '#c9ccd0';
          ctx.fillRect(x - r * 0.5, y - r * 2.2, r, r * 2.2);
        }
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';

      // atmospheric haze at the horizon
      const hz = ctx.createLinearGradient(0, hy - 30, 0, hy + 50);
      const hc = `${P.haze[0]},${P.haze[1]},${P.haze[2]}`;
      hz.addColorStop(0, `rgba(${hc},0)`); hz.addColorStop(0.4, `rgba(${hc},${night ? 0.25 : 0.55})`); hz.addColorStop(1, `rgba(${hc},0)`);
      ctx.fillStyle = hz; ctx.fillRect(0, hy - 30, W, 80);

      // vignette
      const vg = ctx.createRadialGradient(W / 2, H * 0.55, Math.min(W, H) * 0.35, W / 2, H * 0.55, Math.max(W, H) * 0.85);
      vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, `rgba(0,0,0,${night ? 0.55 : 0.22})`);
      ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);

      // flight readout
      if (hud) {
        const kt = Math.round(s.v * 1.944);
        const call = t > 14.6 && t < 16 ? 'V1' : t >= 16 && t < 17.8 ? 'ROTATE' : t >= 18.4 && t < 21 ? 'POSITIVE RATE' : t > 2 && t < 4 ? 'TAKEOFF THRUST' : t <= 2 ? 'LINED UP' : '';
        ctx.font = '600 11px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = night ? 'rgba(242,184,75,.85)' : 'rgba(13,27,54,.7)';
        ctx.fillText(`RWY 27  ·  IAS ${String(kt).padStart(3, '0')} KT  ·  ALT ${String(Math.round((s.h - 5) * 3.28)).padStart(4, '0')} FT${call ? `  ·  ${call}` : ''}`, W / 2, H - 18);
      }

      if (s.fade > 0) {
        ctx.globalAlpha = s.fade;
        ctx.fillStyle = night ? '#02060f' : '#dbe6ef';
        ctx.fillRect(0, 0, W, H);
        ctx.globalAlpha = 1;
      }
    }

    const frame = (now: number) => {
      draw(((now - t0) / 1000) % LOOP);
      raf = requestAnimationFrame(frame);
    };
    const start = () => { if (running || reduce) return; running = true; raf = requestAnimationFrame(frame); };
    const stop = () => { running = false; cancelAnimationFrame(raf); };

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();
    const io = new IntersectionObserver(([e]) => (e.isIntersecting && !document.hidden ? start() : stop()));
    io.observe(canvas);
    const vis = () => (document.hidden ? stop() : start());
    document.addEventListener('visibilitychange', vis);
    const still = () => { if (!running) draw(reduce ? 7 : ((performance.now() - t0) / 1000) % LOOP); };
    canvas.addEventListener('themechange', still);
    t0 = performance.now();
    return () => { stop(); ro.disconnect(); io.disconnect(); document.removeEventListener('visibilitychange', vis); canvas.removeEventListener('themechange', still); removeEventListener('pointermove', lean); };
  }, [hud]);

  // redraw the still frame when the theme flips while paused (reduced motion or off-screen)
  useEffect(() => { ref.current?.dispatchEvent(new Event('themechange')); }, [theme]);

  return <canvas ref={ref} className={`block h-full w-full ${className}`} aria-hidden="true" />;
}
