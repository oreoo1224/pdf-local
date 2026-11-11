import { defineConfig } from 'astro/config';
import { loadEnv } from 'vite';

const env = loadEnv(process.env.NODE_ENV || 'development', process.cwd(), ['SITE_URL', 'CF_PAGES_URL']);
const configuredOrigin = env.SITE_URL || env.CF_PAGES_URL;
let origin;
if (configuredOrigin) {
  const parsed = new URL(configuredOrigin);
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password || parsed.pathname !== '/' || parsed.search || parsed.hash) {
    throw new Error('SITE_URL must be an HTTP(S) origin without credentials, a path, query or fragment.');
  }
  origin = parsed.origin;
}

export default defineConfig({
  site: origin || undefined,
  output: 'static',
  trailingSlash: 'always',
  vite: {
    build: { chunkSizeWarningLimit: 1800 },
    worker: { format: 'es' },
  },
});
