import { Fragment, useEffect, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import Aircraft, { fleetSpec } from '../components/Aircraft';
import RunwayView from '../components/RunwayView';
import { GateScene, SkyScene } from '../components/Scenes';
import { Contrail, CountUp, FlightProgress, Tilt, useReveal } from '../components/Motion';
import FLEET_PHOTOS from '../data/fleet-photos.json';
import SplitFlap from '../components/SplitFlap';
import ThemeToggle from '../components/ThemeToggle';
import { useContent } from '../hooks/useContent';
import { useTheme, type Theme } from '../hooks/useTheme';
import { isExternal, safeUrl } from '../lib/safeUrl';
import type { Certification, Content, LogEntry, Project, SkillGroup } from '../types';

function ExtLink({ href, className, style, children }: { href?: string; className?: string; style?: CSSProperties; children: React.ReactNode }) {
  const url = safeUrl(href);
  return (
    <a href={url} className={className} style={style} {...(isExternal(url) ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
      {children}
    </a>
  );
}

function Clock({ zone }: { zone: string }) {
  const fmt = () => new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: zone }).format(new Date());
  const [t, setT] = useState(fmt);
  useEffect(() => { const id = setInterval(() => setT(fmt()), 15000); return () => clearInterval(id); }, [zone]); // eslint-disable-line react-hooks/exhaustive-deps
  return <time>{t}</time>;
}

const NAV = [
  ['#departures', 'Departures'],
  ['#logbook', 'Logbook'],
  ['#ratings', 'Ratings'],
  ['#fleet', 'Skill fleet'],
  ['#atc', 'Contact'],
] as const;

function Signage({ theme, onToggle, from, to }: { theme: Theme; onToggle: () => void; from: string; to: string }) {
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-ink/85 text-white backdrop-blur-md">
      <div className="mx-auto flex max-w-[1320px] items-center gap-3 px-4 py-2.5 sm:px-8">
        <a href="#top" className="flex items-baseline gap-2.5 no-underline">
          <span className="font-display text-[26px] font-black tracking-wider text-amber">UTK</span>
          <span className="hidden font-display text-lg font-semibold uppercase tracking-[.08em] text-[#cfdcee] lg:inline">Terminal Utkarsh</span>
        </a>
        <nav className="ml-auto hidden items-center gap-1 md:flex">
          {NAV.map(([href, label]) => (
            <a key={href} href={href} className="rounded-md px-2.5 py-1.5 font-display text-[15px] font-semibold uppercase tracking-[.08em] text-[#e4ecf7] no-underline transition-colors hover:bg-white/10 hover:text-amber">
              {label}
            </a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2.5 md:ml-3">
          <span className="hidden items-center gap-3 whitespace-nowrap font-mono text-sm text-amber lg:flex">
            <span aria-label="Local time in India"><span className="text-steel">IST</span> <Clock zone="Asia/Kolkata" /></span>
            <span className="h-3.5 w-px bg-white/20" aria-hidden="true" />
            <span aria-label="Coordinated Universal Time"><span className="text-steel">UTC</span> <Clock zone="UTC" /></span>
          </span>
          <ThemeToggle theme={theme} onToggle={onToggle} />
          <Link to="/admin" className="inline-flex items-center gap-1.5 rounded-full border border-amber/60 px-3 py-1.5 font-display text-sm font-semibold uppercase tracking-[.08em] text-amber no-underline transition-colors hover:bg-amber hover:text-ink" title="Crew login">
            <span aria-hidden="true">✈</span><span className="hidden sm:inline">Crew</span>
          </Link>
        </div>
      </div>
      <nav className="flex justify-center gap-1 overflow-x-auto border-t border-white/10 px-2 py-1 md:hidden" aria-label="Sections">
        {NAV.map(([href, label]) => (
          <a key={href} href={href} className="whitespace-nowrap rounded px-2 py-1 font-display text-[13px] font-semibold uppercase tracking-[.08em] text-[#e4ecf7] no-underline">{label}</a>
        ))}
      </nav>
      <FlightProgress from={from} to={to} />
    </header>
  );
}

function Hero({ c }: { c: Content }) {
  const p = c.profile;
  const passFields: [string, string, boolean?][] = [
    ['Passenger', p.passenger], ['Flight', p.flight], ['Gate', p.gate],
    ['Seat', p.seat], ['Class of', p.class_of], ['Status', p.status, true],
  ];
  return (
    <section id="top" className="relative isolate overflow-hidden" aria-labelledby="hero-title">
      <div className="absolute inset-0 -z-10">
        <GateScene />
        {/* scrim so the copy stays readable over the scene */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#f5f8fc]/70 via-[#f5f8fc]/30 to-transparent dark:from-[#030816]/80 dark:via-[#030816]/40 lg:bg-gradient-to-r lg:from-[#f5f8fc]/90 lg:via-[#f5f8fc]/55 lg:via-40% lg:to-transparent lg:to-60% lg:dark:from-[#030816]/80 lg:dark:via-[#030816]/25" />
      </div>
      <div className="relative z-10 mx-auto grid max-w-wrap items-center gap-10 px-4 pb-32 pt-14 sm:px-8 md:pt-24 lg:grid-cols-[1fr_1.1fr] lg:gap-14 lg:px-10 lg:pb-40">
        <div className="min-w-0">
          <p className="eyebrow !text-tail dark:!text-amber">{p.eyebrow}</p>
          <h1 id="hero-title" className="text-[clamp(44px,6vw,84px)] font-black uppercase text-ink dark:text-white">
            {p.headline.split(' ').map((w, i) => <Fragment key={i}><span className="word" style={{ '--i': i } as CSSProperties}>{w}</span>{' '}</Fragment>)}
            <em style={{ '--i': p.headline.split(' ').length } as CSSProperties} className="word relative not-italic text-sky dark:text-sky-soft after:absolute after:inset-x-0 after:bottom-[.06em] after:h-[.1em] after:-skew-x-[20deg] after:bg-tail/80 after:content-['']">{p.headline_emphasis}</em>.
          </h1>
          <p className="hero-fade mt-6 max-w-[54ch] text-[19px] text-[#2c3e5c] dark:text-[#c8d6ea]">{p.lede}</p>
          <div className="hero-fade mt-8 grid max-w-[560px] grid-cols-3 gap-3" role="list">
            {c.stats.map((s, i) => (
              <div key={i} role="listitem" className="min-w-0 rounded-2xl border border-white/60 bg-white/55 px-3 py-3 sm:px-5 shadow-[0_8px_30px_-18px_rgba(13,27,54,.5)] backdrop-blur-md dark:border-white/10 dark:bg-white/5">
                <strong className="block font-display text-[clamp(30px,4vw,40px)] font-black leading-none text-ink dark:text-white"><CountUp value={s.value} /></strong>
                <span className="block text-[10px] uppercase leading-snug tracking-[.03em] sm:text-[12px] sm:tracking-[.08em] text-muted dark:text-steel">{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="pass-enter min-w-0">
        <article aria-label="Boarding pass" className="pass-sheen group relative grid min-w-0 overflow-hidden rounded-[24px] bg-white/90 shadow-[0_40px_80px_-30px_rgba(13,27,54,.55)] ring-1 ring-white/70 backdrop-blur-xl transition-transform duration-500 dark:bg-[#0f1f3f]/90 dark:ring-white/10 md:grid-cols-[1fr_200px] lg:rotate-[1.2deg] lg:hover:-translate-y-1 lg:hover:rotate-0 motion-safe:lg:animate-bob">
          <div className="pass-stripe relative min-w-0 px-6 pb-6 pt-6">
            <div className="mt-1.5 flex flex-wrap items-baseline justify-between gap-3">
              <span className="font-display text-2xl font-black tracking-wider text-sky dark:text-sky-soft">UM AIR</span>
              <span className="font-mono text-[10.5px] uppercase tracking-[.08em] text-muted dark:text-steel">Boarding pass · Economy of effort, first-class output</span>
            </div>
            <div className="my-6 grid grid-cols-[auto_1fr_auto] items-center gap-3">
              <div>
                <span className="label">From</span>
                <span className="block font-display text-[clamp(46px,5.6vw,70px)] font-black leading-[.9] text-ink dark:text-white">{p.from_code}</span>
                <span className="text-[13px] text-muted dark:text-steel">{p.from_city}</span>
              </div>
              <div className="relative h-8">
                <span className="absolute inset-x-0 top-1/2 border-t-2 border-dashed border-sky/40" />
                <svg viewBox="0 0 24 24" className="route-plane absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rotate-90 text-sky dark:text-sky-soft" aria-hidden="true"><path fill="currentColor" d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z" /></svg>
              </div>
              <div className="text-right">
                <span className="label">To</span>
                <span className="block font-display text-[clamp(46px,5.6vw,70px)] font-black leading-[.9] text-ink dark:text-white">{p.to_code}</span>
                <span className="text-[13px] text-muted dark:text-steel">{p.to_city}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-5 gap-y-3.5 border-t-2 border-dashed border-paper-line pt-5 dark:border-white/15 sm:grid-cols-3">
              {passFields.map(([label, val, ok], i) => (
                <div key={label} className="pass-field" style={{ '--i': i } as CSSProperties}>
                  <span className="label">{label}</span>
                  <span className={`block break-words font-mono text-sm font-bold ${ok ? 'text-go' : 'text-ink dark:text-white'}`}>{val}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="notch stub relative flex flex-wrap items-center gap-3 border-t-2 border-dashed border-paper-line bg-sky-mist px-5 py-5 dark:border-white/15 dark:bg-[#132a52] md:flex-col md:flex-nowrap md:items-start md:border-l-2 md:border-t-0">
            {/* aircraft window porthole */}
            <div className="relative rounded-[46%/40%] bg-gradient-to-b from-[#e8eff8] to-[#c9d7ea] p-[7px] shadow-[inset_0_2px_6px_rgba(13,27,54,.25)] dark:from-[#2a4378] dark:to-[#132447]">
              <img src={safeUrl(p.photo_url) ?? '/assets/utkarsh.webp'} alt="Portrait of Utkarsh Mehta" width={120} height={150}
                className="h-[104px] w-[84px] rounded-[44%/38%] object-cover md:h-[150px] md:w-[120px]" />
              <span className="pointer-events-none absolute inset-[7px] rounded-[44%/38%] bg-gradient-to-br from-white/35 via-transparent to-transparent" />
            </div>
            <div>
              <span className="label">Boarding group</span>
              <span className="block font-mono text-sm font-bold text-ink dark:text-white">{p.boarding_group}</span>
            </div>
            <div className="scan relative h-[42px] w-full overflow-hidden md:mt-auto" aria-hidden="true"><div className="barcode h-full w-full" /></div>
            <a href="#atc" className="btn btn-dark w-full justify-center whitespace-nowrap px-3 text-sm dark:border-amber dark:bg-amber dark:text-ink">Request clearance →</a>
          </div>
        </article>
        </div>
      </div>
    </section>
  );
}

const CYCLE = ['BOARDING', 'GATE OPEN', 'FINAL CALL', 'BOARDING'];
const STATUS_TONE: Record<string, string> = { 'FINAL CALL': 'text-[#ff6b5b] motion-safe:animate-blink', 'GATE OPEN': 'text-amber', DEPARTED: 'text-steel', DELAYED: 'text-[#ff6b5b]' };

function FlightRow({ p, status }: { p: Project; status: string }) {
  return (
    <details className="group border-b border-white/5" role="row">
      <summary className="grid cursor-pointer list-none grid-cols-[auto_1fr_auto] items-center gap-x-2.5 gap-y-1.5 px-4 py-3.5 transition-colors hover:bg-white/[.04] group-open:bg-white/[.05] lg:grid-cols-[112px_124px_minmax(0,1.3fr)_minmax(0,1.5fr)_130px] lg:gap-3.5 [grid-template-areas:'t_f_s''d_d_d''g_g_g'] lg:[grid-template-areas:'t_f_d_g_s']">
        <span role="cell" className="whitespace-nowrap font-mono text-[17px] font-bold tracking-wider text-amber [grid-area:t]"><SplitFlap text={p.date} /></span>
        <span role="cell" className="whitespace-nowrap font-mono text-[17px] font-bold tracking-wider text-amber [grid-area:f]"><SplitFlap text={p.code} delay={120} /></span>
        <span role="cell" className="font-mono text-xl font-bold tracking-wider text-amber [grid-area:d]"><SplitFlap text={p.board_name} delay={240} /></span>
        <span role="cell" className="text-sm text-[#b9c8dd] [grid-area:g]">{p.stack}</span>
        <span role="cell" className={`whitespace-nowrap font-mono text-[15px] font-bold tracking-wider [grid-area:s] ${STATUS_TONE[status] ?? 'text-go'}`}><SplitFlap text={status} /></span>
      </summary>
      <div className="grid max-w-[80ch] gap-3 px-4 pb-6 pt-1.5">
        <h3 className="text-[30px] uppercase text-white">{p.title}</h3>
        <p className="m-0 text-[#c9d6e8]">{p.description}</p>
        <div className="flex flex-wrap gap-2.5">
          {p.live_url && <ExtLink href={p.live_url} className="btn">Live site ↗</ExtLink>}
          {p.source_url && <ExtLink href={p.source_url} className="btn btn-ghost">Source ↗</ExtLink>}
        </div>
      </div>
    </details>
  );
}

function Departures({ c }: { c: Content }) {
  // Boards at real airports never sit still: statuses roll over every few seconds.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = setInterval(() => setTick((t) => t + 1), 6000);
    return () => clearInterval(id);
  }, []);
  const statusOf = (p: Project, i: number) => {
    const set = (p.status || '').toUpperCase();
    return set && set !== 'BOARDING' ? set : CYCLE[(tick + i) % CYCLE.length];
  };
  return (
    <section id="departures" className="section-pad relative overflow-hidden bg-gradient-to-b from-ink to-ink-deep text-white" aria-labelledby="dep-title">
      {/* terminal window mullions with the apron outside */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-[.07] [background-image:linear-gradient(90deg,#fff_1px,transparent_1px)] [background-size:180px_100%]" />
      <div className="relative mx-auto max-w-wrap">
        <p data-reveal className="eyebrow !text-amber">Section 01</p>
        <h2 data-reveal id="dep-title" className="h-section text-white">Departures</h2>
        <p data-reveal className="mb-10 mt-3.5 max-w-[60ch] text-[#9fb0c8]">Every project here is deployed. Tap a flight for the details, or board it live.</p>
        <div data-reveal className="rounded-[16px] bg-[#071027]/90 p-2.5 shadow-[inset_0_0_0_1px_#22345c,0_40px_80px_-40px_#000] backdrop-blur" role="table" aria-label="Projects departures board">
          <div className="flex items-center justify-between gap-3 border-b border-[#22345c] px-4 py-3" aria-hidden="true">
            <span className="flex items-baseline gap-3 font-display text-2xl font-black uppercase tracking-[.08em] text-amber">Departures <span className="font-body text-lg font-semibold tracking-normal text-[#8a9bb5]">प्रस्थान</span></span>
            <span className="font-mono text-sm text-[#8a9bb5]">LOCAL <span className="text-amber"><Clock zone="Asia/Kolkata" /></span></span>
          </div>
          <div role="row" className="hidden grid-cols-[112px_124px_minmax(0,1.3fr)_minmax(0,1.5fr)_130px] gap-3.5 border-b border-[#22345c] px-4 py-3.5 font-mono text-xs uppercase tracking-[.14em] text-[#8a9bb5] lg:grid">
            {['Time', 'Flight', 'Destination', 'Gate · Stack', 'Status'].map((h) => <span key={h} role="columnheader">{h}</span>)}
          </div>
          {c.projects.map((p, i) => <FlightRow key={i + p.code} p={p} status={statusOf(p, i)} />)}
          <div role="row" className="flex flex-wrap gap-2 px-4 py-3.5 text-sm text-[#8a9bb5]">
            <span role="cell">More flights being scheduled at</span>
            <ExtLink href={c.contact.github_url} className="font-mono text-amber">{c.contact.github_url?.replace(/^https?:\/\//, '')} ↗</ExtLink>
          </div>
        </div>
      </div>
    </section>
  );
}

function LogRow({ e }: { e: LogEntry }) {
  const bullets = (e.bullets || []).filter(Boolean);
  return (
    <li className="log-row grid border-b border-paper-line last:border-b-0 dark:border-white/10 md:grid-cols-[150px_1fr]">
      <div className="flex gap-2 border-b-2 border-ink/80 px-5 py-3.5 font-display text-[22px] font-extrabold leading-[1.05] text-sky dark:border-white/20 dark:text-sky-soft md:flex-col md:gap-0 md:border-b-0 md:border-r-2 md:p-5 md:text-[26px]">
        <span>{e.date_top}</span><span>{e.date_bottom}</span>
      </div>
      <div className="min-w-0 px-6 py-5">
        <p className="mb-1.5 font-mono text-xs uppercase tracking-[.12em] text-tail dark:text-amber">{e.type}</p>
        <h3 className="mb-2.5 text-[30px] uppercase text-ink dark:text-white">{e.title}</h3>
        {bullets.length > 0 && <ul className="m-0 list-disc pl-5 text-[#2c3e5c] dark:text-[#c8d6ea]">{bullets.map((b, i) => <li key={i}>{b}</li>)}</ul>}
        {e.text && <p className="m-0 text-[#2c3e5c] dark:text-[#c8d6ea]">{e.text}</p>}
        {e.link_url && <ExtLink href={e.link_url} className="mt-2.5 inline-block font-semibold text-sky dark:text-sky-soft">{e.link_label || 'Link'} ↗</ExtLink>}
      </div>
    </li>
  );
}

const STAMP: Record<string, string> = { aws: '#e08a2e', gcp: '#3d6fd6', oci: '#e7795d' };

function Stamp({ x, i }: { x: Certification; i: number }) {
  const color = STAMP[x.color] ?? '#5a6b84';
  return (
    <ExtLink href={x.url} style={{ '--i': i } as CSSProperties} className="stamp relative flex min-h-[156px] flex-col gap-1.5 rounded-2xl bg-white/80 p-5 no-underline backdrop-blur transition-all hover:shadow-[0_18px_34px_-18px_rgba(13,27,54,.45)] dark:bg-white/5">
      <span style={{ borderColor: color }} className="pointer-events-none absolute inset-0 rounded-2xl border-[3px] border-double opacity-80" aria-hidden="true" />
      <span style={{ color }} className="font-mono text-xs font-bold uppercase tracking-[.14em]">{x.issuer}</span>
      <span style={{ color }} className="stamp-ink pointer-events-none absolute right-3 top-3 grid h-14 w-14 place-items-center rounded-full border-2 font-mono text-[8px] font-bold uppercase leading-tight tracking-widest" aria-hidden="true"><span className="text-center">Cleared<br />✓<br />{(x.date || '').slice(-4)}</span></span>
      <span className="font-display text-[25px] font-extrabold uppercase leading-[1.05] text-ink dark:text-white">{x.name}</span>
      <span className="mt-auto font-mono text-xs text-muted dark:text-steel">{x.date}{x.url ? ' · Verify ↗' : ''}</span>
    </ExtLink>
  );
}

type Photo = { src: string };
// Each aircraft is photographed in a scene that mirrors its skill group.
const SCENE_NOTE: Record<string, string> = {
  'A380-800': 'Sunrise departure · first words in code',
  '777-300ER': 'Cruising above the clouds',
  'A350-1000': 'Blue hour over a connected city',
  '787-9': 'Night watch under a full moon',
  '747-8': 'Leaving a long data trail',
  'A321neo': 'First light · strong fundamentals',
};
const PHOTOS = FLEET_PHOTOS as Record<string, Photo>;

// A real photo of the type (stored in the repo), bled to the card edges and faded into it; drawing as a fallback.
function FleetPhoto({ model, override }: { model: string; override?: string }) {
  const photo: Photo | undefined = safeUrl(override) ? { src: safeUrl(override)! } : PHOTOS[model];
  const [failed, setFailed] = useState(false);
  if (!photo || failed) {
    return (
      <div className="relative -mx-2 my-2">
        <Aircraft model={model} className="relative w-full" />
      </div>
    );
  }
  return (
    <div className="fleet-photo relative -mx-5 -mt-5 mb-3 overflow-hidden">
      <img src={photo.src} alt={`${fleetSpec(model).name} in flight`} loading="lazy" decoding="async" onError={() => setFailed(true)}
        className="kenburns aspect-[16/10] w-full object-cover" />
      <span className="sweep" aria-hidden="true" />
      {SCENE_NOTE[model] && !override && (
        <span className="absolute bottom-[24%] left-5 rounded-full border border-white/25 bg-ink/45 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[.14em] text-white backdrop-blur-md">{SCENE_NOTE[model]}</span>
      )}
    </div>
  );
}

function FleetCard({ s, i }: { s: SkillGroup; i: number }) {
  const spec = fleetSpec(s.aircraft, i);
  return (
    <article className="group relative h-full overflow-hidden rounded-3xl border border-white/70 bg-gradient-to-b from-white/90 to-sky-mist/90 p-5 shadow-[0_24px_50px_-30px_rgba(13,27,54,.45)] backdrop-blur transition-shadow duration-500 hover:shadow-[0_40px_70px_-30px_rgba(13,27,54,.55)] dark:border-white/10 dark:from-[#14284f]/90 dark:to-[#0d1b36]/90">
      <FleetPhoto model={spec.model} override={s.photo_url} />
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[.16em] text-muted dark:text-steel">{spec.model} · {spec.reg}</p>
          <h3 className="mt-1 text-[28px] uppercase text-ink dark:text-white">{s.title}</h3>
        </div>
        <span className="mt-0.5 flex items-center gap-1.5 rounded-full bg-go/15 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-go">
          <span className="h-1.5 w-1.5 rounded-full bg-go motion-safe:animate-blink" />Ready
        </span>
      </div>
      <dl className="mt-3 grid grid-cols-3 gap-2 border-y border-paper-line py-2 font-mono text-[11px] dark:border-white/10">
        <div><dt className="text-muted dark:text-steel">Range</dt><dd className="m-0 font-bold text-ink dark:text-white">{spec.range}</dd></div>
        <div><dt className="text-muted dark:text-steel">Seats</dt><dd className="m-0 font-bold text-ink dark:text-white">{spec.seats}</dd></div>
        <div><dt className="text-muted dark:text-steel">Engines</dt><dd className="m-0 font-bold text-ink dark:text-white">{spec.engines}</dd></div>
      </dl>
      <ul className="mb-0 mt-3 flex list-none flex-wrap gap-1.5 p-0">
        {s.items.split('·').map((t) => t.trim()).filter(Boolean).map((t, k) => (
          <li key={k} className="chip rounded-full border border-paper-line bg-white/70 px-2.5 py-1 text-[13px] text-[#2c3e5c] dark:border-white/10 dark:bg-white/5 dark:text-[#c8d6ea]" style={{ '--k': k } as CSSProperties}>{t}</li>
        ))}
      </ul>
    </article>
  );
}

function Contact({ c, theme }: { c: Content; theme: Theme }) {
  const ct = c.contact;
  const card = 'contact-card group relative flex items-center gap-4 overflow-hidden break-words rounded-2xl border px-5 py-4 font-semibold no-underline backdrop-blur-md transition-all duration-300 hover:-translate-y-1 border-white/70 bg-white/70 text-ink shadow-[0_18px_40px_-28px_rgba(13,27,54,.6)] hover:bg-white/95 hover:shadow-[0_26px_50px_-24px_rgba(13,27,54,.55)] dark:border-white/15 dark:bg-white/10 dark:text-white dark:shadow-none dark:hover:bg-white/15';
  const label = 'label !text-tail dark:!text-amber';
  const icon = (bg: string, path: React.ReactNode) => (
    <span className={`grid h-11 w-11 flex-none place-items-center rounded-xl text-white shadow-md transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110 ${bg}`} aria-hidden="true">
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">{path}</svg>
    </span>
  );
  const arrow = <span className="ml-auto text-lg opacity-0 transition-all duration-300 -translate-x-2 group-hover:translate-x-0 group-hover:opacity-100" aria-hidden="true">↗</span>;
  const MAIL = <path d="M3 5h18a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zm1 2.4V17h16V7.4l-8 5.6-8-5.6zM5.6 7 12 11.5 18.4 7H5.6z" />;
  const IN = <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9.75h4v11H3v-11zm6.5 0h3.8v1.5h.05c.53-1 1.83-2.05 3.77-2.05 4.03 0 4.78 2.65 4.78 6.1v5.45h-4v-4.83c0-1.15-.02-2.63-1.6-2.63-1.6 0-1.85 1.25-1.85 2.55v4.91h-4v-11z" />;
  const GH = <path d="M12 .5a11.5 11.5 0 0 0-3.64 22.42c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.53-1.33-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.41-2.69 5.38-5.25 5.67.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5z" />;
  return (
    <section id="atc" className="relative isolate min-h-[640px] overflow-hidden text-ink dark:text-white" aria-labelledby="atc-title">
      <div className="absolute inset-0 -z-10">
        <RunwayView theme={theme} hud={false} />
        <div className="absolute inset-0 bg-gradient-to-b from-[#f5f8fc]/85 via-[#f5f8fc]/40 to-transparent dark:from-[#030816]/85 dark:via-[#030816]/45 dark:to-[#030816]/10" />
      </div>
      <div className="relative z-10 mx-auto max-w-wrap px-4 pb-56 pt-20 sm:px-8 md:pt-28 lg:px-10">
        <p data-reveal className="eyebrow !text-tail dark:!text-amber">Section 05 · Air traffic control</p>
        <h2 data-reveal id="atc-title" className="font-display text-[clamp(52px,8.5vw,116px)] font-black uppercase">{ct.heading}</h2>
        <p data-reveal className="mt-6 max-w-[54ch] text-[19px] text-[#2c3e5c] dark:text-[#d4e0f0]">{ct.text}</p>
        <div data-reveal className="mt-9 grid gap-3.5 md:grid-cols-3">
          {ct.email && <a href={`mailto:${ct.email}`} className={card}>{icon('bg-gradient-to-br from-[#ea4335] to-[#c5221f]', MAIL)}<span className="min-w-0"><span className={label}>Email</span><span className="block break-all text-[15px] leading-snug">{ct.email}</span></span>{arrow}</a>}
          {ct.linkedin_url && <ExtLink href={ct.linkedin_url} className={card}>{icon('bg-[#0a66c2]', IN)}<span className="min-w-0"><span className={label}>LinkedIn</span><span className="block truncate">{ct.linkedin_label}</span></span>{arrow}</ExtLink>}
          {ct.github_url && <ExtLink href={ct.github_url} className={card}>{icon('bg-[#181717] dark:bg-white dark:!text-[#181717]', GH)}<span className="min-w-0"><span className={label}>GitHub</span><span className="block truncate">{ct.github_label}</span></span>{arrow}</ExtLink>}
        </div>
      </div>
    </section>
  );
}

export default function Portfolio() {
  const { content: c } = useContent();
  const { theme, toggle } = useTheme();
  useReveal([c]);
  return (
    <>
      <a href="#departures" className="absolute -left-[999px] top-2 z-50 bg-amber px-3 py-2 text-ink focus:left-2">Skip to projects</a>
      <Signage theme={theme} onToggle={toggle} from={c.profile.from_code} to={c.profile.to_code} />
      <Contrail night={theme === 'night'} />
      <main>
        <Hero c={c} />
        <Departures c={c} />

        <section id="logbook" className="section-pad relative isolate overflow-hidden" aria-labelledby="log-title">
          <div className="absolute inset-0 -z-10"><SkyScene /></div>
          <div className="relative mx-auto max-w-wrap">
            <p data-reveal className="eyebrow !text-[#ffd28a]">Section 02</p>
            <h2 data-reveal id="log-title" className="h-section text-white drop-shadow-[0_2px_18px_rgba(13,27,54,.35)]">Pilot's logbook</h2>
            <p data-reveal className="mb-10 mt-3.5 max-w-[60ch] font-medium text-white [text-shadow:0_1px_12px_rgba(13,27,54,.55)]">Hours logged in the real world.</p>
            <ol data-reveal className="ruled m-0 list-none overflow-hidden rounded-[18px] border-2 border-ink/80 bg-white/85 p-0 backdrop-blur dark:border-white/15 dark:bg-white/[.04]">
              {c.logbook.map((e, i) => <LogRow key={i} e={e} />)}
            </ol>
          </div>
        </section>

        <section id="ratings" className="section-pad relative overflow-hidden bg-gradient-to-b from-paper to-dawn-soft dark:from-ink dark:to-ink-deep" aria-labelledby="rat-title">
          <div className="relative mx-auto max-w-wrap">
            <p data-reveal className="eyebrow">Section 03</p>
            <h2 data-reveal id="rat-title" className="h-section text-ink dark:text-white">Licences &amp; ratings</h2>
            <p data-reveal className="mb-10 mt-3.5 max-w-[60ch] text-muted dark:text-steel">Certifications across three clouds, stamped like a passport. Each one links to its official verification.</p>
            <div data-reveal className="stamps grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-[18px]">
              {c.certifications.map((x, i) => <Stamp key={i} x={x} i={i} />)}
            </div>
          </div>
        </section>

        <section id="fleet" className="section-pad relative overflow-hidden bg-gradient-to-b from-[#cfe1f5] via-sky-mist to-paper dark:from-ink-deep dark:via-ink dark:to-ink-2" aria-labelledby="fleet-title">
          <div className="relative mx-auto max-w-wrap">
            <p data-reveal className="eyebrow">Section 04</p>
            <h2 data-reveal id="fleet-title" className="h-section text-ink dark:text-white">The skill fleet</h2>
            <p data-reveal className="mb-10 mt-3.5 max-w-[60ch] text-muted dark:text-steel">Every skill group flies as its own aircraft, fuelled and cleared for departure.</p>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {c.skills.map((s, i) => (
                <div key={i} data-reveal style={{ '--i': i % 3 } as CSSProperties}>
                  <Tilt className="h-full rounded-3xl"><FleetCard s={s} i={i} /></Tilt>
                </div>
              ))}
            </div>
          </div>
        </section>

        <Contact c={c} theme={theme} />
      </main>
      <footer className="bg-ink-deep px-4 py-7 text-center text-sm text-[#8a9bb5]">
        <p className="m-0">Designed and built by hand by Utkarsh Mehta · No templates were harmed · {new Date().getFullYear()}</p>
        <p className="m-0 mt-2"><Link to="/admin" className="text-amber/80 hover:text-amber">Crew login ✈</Link></p>
      </footer>
    </>
  );
}
