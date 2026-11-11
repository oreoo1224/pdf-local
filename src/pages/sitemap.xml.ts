import type { APIRoute } from 'astro';
import { locales, tools, localePath } from '../lib/i18n';
import { sitePath } from '../lib/site-path';

const escapeXml=(s:string)=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
export const GET:APIRoute=({site})=>{
  const routes=['',...tools,'about','privacy','terms','contact'];
  const urls=site?locales.flatMap(locale=>routes.map(route=>`<url><loc>${escapeXml(new URL(sitePath(localePath(locale,route)),site).href)}</loc></url>`)).join(''):'';
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`,{headers:{'Content-Type':'application/xml; charset=utf-8'}});
};
