import type { APIRoute } from 'astro';
import { sitePath } from '../lib/site-path';
export const GET:APIRoute=({site})=>new Response(`User-agent: *\nAllow: /\n${site?`Sitemap: ${new URL(sitePath('/sitemap.xml'),site).href}\n`:''}`,{headers:{'Content-Type':'text/plain; charset=utf-8'}});
