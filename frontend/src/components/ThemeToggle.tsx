import type { Theme } from '../hooks/useTheme';

// A pill switch: the little aircraft taxis between the sun and the moon.
export default function ThemeToggle({ theme, onToggle }: { theme: Theme; onToggle: () => void }) {
  const night = theme === 'night';
  return (
    <button
      type="button"
      onClick={onToggle}
      role="switch"
      aria-checked={night}
      aria-label={night ? 'Switch to day flight' : 'Switch to night flight'}
      title={night ? 'Day flight' : 'Night flight'}
      className="relative flex h-9 w-[86px] flex-none items-center justify-between rounded-full border border-white/20 bg-gradient-to-r from-[#9cc3f0] to-[#f6d5bd] px-2.5 text-sm transition-colors duration-500 dark:from-[#0b1730] dark:to-[#2a4378]"
    >
      <span aria-hidden="true">☀︎</span>
      <span aria-hidden="true" className="text-white">☾</span>
      <span
        aria-hidden="true"
        className={`absolute top-1 grid h-7 w-7 place-items-center rounded-full bg-white text-[15px] text-ink shadow-md transition-transform duration-500 ${night ? 'translate-x-[48px] rotate-0' : 'translate-x-0 -rotate-12'}`}
        style={{ left: 3 }}
      >
        ✈
      </span>
    </button>
  );
}
