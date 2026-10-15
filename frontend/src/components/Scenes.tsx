import type { CSSProperties } from 'react';

// Real photographs (in /public/assets/scene) brought to life with light, weather and traffic.
// Both day and night layers are always present and cross-fade on the html.dark class.

const DUST = Array.from({ length: 28 }, (_, i) => {
  const h = (n: number) => { const s = Math.sin(n * 91.7 + i * 12.9) * 43758.5; return s - Math.floor(s); };
  return { left: 6 + h(1) * 60, top: 20 + h(2) * 70, size: 1.5 + h(3) * 3, dur: 14 + h(4) * 16, delay: -h(5) * 30 };
});

// Sitting at the gate: a real terminal window, a 747 climbing out past the glass, and a coffee on the ledge.
// The window frame is its own layer, so the jet passes behind the mullions like it would in real life.
function Jet({ night }: { night?: boolean }) {
  return (
    <div className="gate-jet">
      <img src="/assets/scene/jet-747.webp" alt="" className="block w-full" />
      {night && (
        <>
          <span className="nav nav--beacon" style={{ left: '51%', top: '62%' }} />
          <span className="nav nav--strobe" style={{ left: '35%', top: '3%' }} />
          <span className="nav nav--red" style={{ left: '61%', top: '96%' }} />
          <span className="landing-light" style={{ left: '84%', top: '66%' }} />
        </>
      )}
    </div>
  );
}

export function GateScene() {
  return (
    <div className="scene pointer-events-none absolute inset-0 overflow-hidden bg-[#0b1426]" aria-hidden="true">
      {/* day */}
      <div className="absolute inset-0 transition-opacity duration-[1400ms] dark:opacity-0">
        <div className="scene-cover" style={{ '--ar': 1920 / 1238 } as CSSProperties}>
          <img src="/assets/scene/gate-day.webp" alt="" className="absolute inset-0 h-full w-full" />
          <Jet />
          <img src="/assets/scene/gate-day-frame.webp" alt="" className="absolute inset-0 h-full w-full" />
          <div className="sun-glare absolute -right-[10%] -top-[25%] h-[70%] w-[50%]" />
        </div>
        <div className="rays absolute inset-0">
          {[0, 1, 2, 3, 4, 5].map((i) => <span key={i} className="ray" style={{ '--i': i } as CSSProperties} />)}
        </div>
        <div className="absolute inset-0">
          {DUST.map((d, i) => (
            <span key={i} className="mote" style={{ left: `${d.left}%`, top: `${d.top}%`, width: d.size, height: d.size, animationDuration: `${d.dur}s`, animationDelay: `${d.delay}s` }} />
          ))}
        </div>
      </div>
      {/* night */}
      <div className="absolute inset-0 opacity-0 transition-opacity duration-[1400ms] dark:opacity-100">
        <div className="scene-cover" style={{ '--ar': 1920 / 1280 } as CSSProperties}>
          <img src="/assets/scene/gate-night.webp" alt="" className="absolute inset-0 h-full w-full" />
          <span className="beacon" style={{ left: '70.8%', top: '48.6%' }} />
          <span className="taxi-lights" style={{ top: '61%' }} />
          <span className="taxi-lights taxi-lights--slow" style={{ top: '64%' }} />
          <Jet night />
          <img src="/assets/scene/gate-night-frame.webp" alt="" className="absolute inset-0 h-full w-full" />
        </div>
        <div className="glass-sheen absolute inset-0" />
      </div>
      {/* the counter ledge by the window, with a coffee on it */}
      <div className="ledge" />
      <div className="coffee">
        <span className="steam" /><span className="steam steam--2" /><span className="steam steam--3" />
        <span className="cup-shadow" />
        <img src="/assets/scene/coffee.webp" alt="" className="relative block w-full dark:brightness-[.62] dark:saturate-[.85]" />
      </div>
    </div>
  );
}

// Open sky: the sun slipping between real clouds by day, a dark airliner crossing the full moon by night.
export function SkyScene() {
  return (
    <div className="scene pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {/* day */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#2f6fc4] via-[#6fa3dd] to-[#cfe2f5] transition-opacity duration-[1400ms] dark:opacity-0">
        <div className="sun"><span className="sun-core" /><span className="sun-streaks" /></div>
        <div className="cloud-band cloud-band--far" />
        {/* a real jet seen from below, climbing away after takeoff */}
        <img src="/assets/scene/jet-overhead.webp" alt="" className="flyover" />
        <div className="cloud-band cloud-band--near" />
      </div>
      {/* night */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_75%_30%,#13254a_0%,#060c1c_55%,#02040b_100%)] opacity-0 transition-opacity duration-[1400ms] dark:opacity-100">
        <div className="stars absolute inset-0" />
        <div className="moon-wrap">
          <img src="/assets/scene/moon.webp" alt="" className="moon" />
          <div className="crossing">
            <img src="/assets/scene/plane-silhouette.webp" alt="" className="block w-full" />
            <span className="nav nav--green" style={{ left: '11.2%', top: '0.4%' }} />
            <span className="nav nav--red" style={{ left: '37.8%', top: '95.9%' }} />
            <span className="nav nav--strobe" style={{ left: '5.5%', top: '61.4%' }} />
            <span className="nav nav--beacon" style={{ left: '51.4%', top: '54.1%' }} />
          </div>
        </div>
        <div className="cloud-band cloud-band--night" />
      </div>
    </div>
  );
}
