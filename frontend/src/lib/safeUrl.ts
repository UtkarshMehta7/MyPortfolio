// Only allow http(s), mailto and same-site relative URLs in links and images (blocks javascript: etc.).
export function safeUrl(u?: string): string | undefined {
  if (!u) return undefined;
  const v = u.trim();
  if (/^(https?:|mailto:)/i.test(v)) return v;
  if (/^[\w./-]+$/.test(v) && !v.includes('..')) return v;
  return undefined;
}

export const isExternal = (u?: string) => !!u && /^https?:/i.test(u);
