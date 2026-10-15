import { useEffect, useRef, useState } from 'react';

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const reduceMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Renders text as split-flap tiles. The final text is the resting state; the shuffle plays once when scrolled into view.
export default function SplitFlap({ text, delay = 0, className = '' }: { text: string; delay?: number; className?: string }) {
  const chars = [...(text || '')];
  const [shown, setShown] = useState<string[]>(chars);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    setShown([...(text || '')]);
    const node = ref.current;
    if (!node || reduceMotion() || !('IntersectionObserver' in window)) return;
    const timers: number[] = [];
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      io.disconnect();
      const final = [...(text || '')];
      final.forEach((ch, i) => {
        if (ch === ' ') return;
        let n = 0;
        const steps = 6 + i + Math.floor(Math.random() * 4);
        const spin = () => {
          setShown((prev) => {
            const next = [...prev];
            next[i] = n >= steps ? ch : CHARS[Math.floor(Math.random() * CHARS.length)];
            return next;
          });
          if (n++ < steps) timers.push(window.setTimeout(spin, 45));
        };
        timers.push(window.setTimeout(spin, delay));
      });
    }, { threshold: 0.4 });
    io.observe(node);
    return () => { io.disconnect(); timers.forEach(clearTimeout); };
  }, [text, delay]);

  return (
    <span ref={ref} aria-label={text} className={className}>
      {shown.map((c, i) => (
        <span key={i} className="flap" aria-hidden="true">{c === ' ' ? ' ' : c}</span>
      ))}
    </span>
  );
}
