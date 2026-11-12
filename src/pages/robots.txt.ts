import type { APIRoute } from 'astro';
import { createRobots } from '../lib/seo-routes';

export const GET: APIRoute = ({ site }) => new Response(createRobots({
  site,
  base: import.meta.env.BASE_URL,
}), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
