import type { APIRoute } from 'astro';
import { createSitemap } from '../lib/seo-routes';

export const GET: APIRoute = ({ site }) => new Response(createSitemap({
  site,
  base: import.meta.env.BASE_URL,
  contactEmail: import.meta.env.CONTACT_EMAIL,
}), { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
