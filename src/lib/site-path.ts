/** A normalized deploy prefix. Root hosting and GitHub project Pages share one source. */
export function normalizeSiteBase(value = '/'): string {
  const trimmed = value.trim();
  if (!trimmed || trimmed === '/') return '/';
  const base = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  if (!/^\/(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_-]+\/?$/.test(base)) {
    throw new Error('Invalid SITE_BASE: use a path such as / or /pdf-local/.');
  }
  return `${base.replace(/\/$/, '')}/`;
}

/** Prefix a root-relative internal URL once, retaining its query, hash and slash. */
export function withSiteBase(path: string, configuredBase = '/'): string {
  const base = normalizeSiteBase(configuredBase);
  const match = path.match(/^([^?#]*)(.*)$/s);
  const pathname = match?.[1] || '';
  const suffix = match?.[2] || '';
  let decoded: string;
  try { decoded = decodeURIComponent(pathname); } catch { throw new Error('Invalid internal URL'); }
  if (!pathname.startsWith('/') || decoded.startsWith('//') || /[\u0000-\u001f\\]/.test(decoded)
    || /(?:^|\/)\.{1,2}(?:\/|$)/.test(decoded)) {
    throw new Error('Invalid internal URL');
  }
  if (base === '/') return path;
  if (pathname === base.slice(0, -1)) return `${base}${suffix}`;
  if (pathname.startsWith(base)) return path;
  return `${base}${pathname.slice(1)}${suffix}`;
}

export const sitePath = (path: string): string => withSiteBase(path, import.meta.env.BASE_URL);
