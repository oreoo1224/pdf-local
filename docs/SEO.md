# PDFEditGo search setup

This guide covers the source configuration for **https://pdfeditgo.com/** and the search registration steps the site owner still needs to complete. Code changes do not verify ownership, submit a sitemap, or prove that the live site has been indexed. No Google, Bing, DNS, or advertising account settings were changed as part of this work.

## Implemented in the source

- English uses `/`; Korean, Spanish and Japanese use `/ko/`, `/es/` and `/ja/`. Each homepage describes the six available tools: Word/Hangul to PDF, PPTX to PDF, PDF merging, image to PDF, PDF to image, and PDF page organization.
- Homepage titles and descriptions are specific to the homepage. Tool pages have their own localized titles, descriptions, instructions and limitations. Office conversions produce image-based PDFs without selectable or searchable text; the site does not promise OCR, text editing or exact reproduction of fonts and layouts.
- When `SITE_URL` is configured, canonical URLs, language alternates (`en`, `ko`, `es`, `ja` and `x-default`), social metadata and sitemap URLs share that origin and the configured `SITE_BASE`. Structured data describes the visible page and available application features.
- `robots.txt` identifies the sitemap when a site origin is configured. The sitemap includes the four homepages, 24 tool pages, and the localized About, Privacy and Terms pages: **40 entries without a configured `CONTACT_EMAIL`**. A configured contact address adds the four Contact pages, for **44 entries**.
- The 404 page and Contact pages without a configured operator email use `noindex` and are excluded from the sitemap. A configured Contact page can be indexed.
- Without a configured production origin, absolute canonical and language-alternate links are omitted and the sitemap is empty. The build does not invent a fallback public hostname. This is suitable for local review, not the production search configuration.
- The optional `PUBLIC_GOOGLE_SITE_VERIFICATION` build variable can publish the real verification token as a `google-site-verification` meta tag. An unset value produces no verification tag. This only supports a Search Console URL-prefix verification method; a Domain property requires DNS verification.

These are source behaviors. Confirm the deployed release serves them before registering or submitting URLs.

## Production values and release checks

Use these values for the current domain:

| Build variable | Production value |
| --- | --- |
| `SITE_URL` | `https://pdfeditgo.com` |
| `SITE_BASE` | `/` |
| `CONTACT_EMAIL` | A real public operator address, if available |
| `PUBLIC_GOOGLE_SITE_VERIFICATION` | Optional real Google-issued token; leave empty unless using that method |

Keep the legacy `/pdf-local/` path out of production canonical, alternate, social and sitemap URLs. Configure variables in the hosting build environment and rebuild; editing a local `.env` file alone does not update the public site. See [the launch guide](LAUNCH.md) for the current hosting workflow.

After deployment, check the HTML source of the homepage, a tool page and a localized page. Verify the title, description, language, canonical URL and reciprocal language alternates; confirm social image URLs resolve. Open [robots.txt](https://pdfeditgo.com/robots.txt) and [sitemap.xml](https://pdfeditgo.com/sitemap.xml), confirm they use the production origin at the domain root, and check that every sitemap URL loads successfully. Check the 404 status and `noindex` on error pages and unconfigured Contact pages. Apply preview-site indexing restrictions to preview deployments without adding `noindex` to the production site.

## Owner action: Google Search Console

Registration, ownership verification and sitemap submission have **not** been performed by these code changes.

1. Open [Google Search Console](https://search.google.com/search-console/) using the operator's Google account. Add a **Domain** property for `pdfeditgo.com`, without `https://` or a path. This covers its protocols and subdomains.
2. Copy the DNS TXT verification record supplied by Google into the domain's DNS provider. The domain owner or an authorized DNS administrator must perform this step. Keep the verification record in place and complete verification in Search Console. Do not publish a placeholder token or change unrelated DNS records.
3. Once the property is verified and the current release is live, use **Sitemaps** to submit `https://pdfeditgo.com/sitemap.xml`. Check that Google can fetch it and that its listed URLs match the expected 40 or 44 entries.
4. Use **URL Inspection** for representative URLs such as `https://pdfeditgo.com/`, `https://pdfeditgo.com/word-to-pdf/` and `https://pdfeditgo.com/ko/`. Inspect live availability, the canonical Google selects and any crawl or indexing issues. Request indexing when appropriate; this is a request, not a guarantee.
5. Review the Page indexing and Performance reports as data becomes available. Resolve concrete crawl, canonical or content problems rather than repeatedly submitting unchanged URLs.

If a URL-prefix property is used instead, register `https://pdfeditgo.com/` exactly and follow the offered verification method. For HTML-tag verification, set `PUBLIC_GOOGLE_SITE_VERIFICATION` to Google's token value (the meta tag's `content` value), rebuild and deploy, then complete verification. An HTML verification tag cannot verify a Domain property.

Google's primary documentation: [add a property](https://support.google.com/webmasters/answer/34592), [verify ownership](https://support.google.com/webmasters/answer/9008080), [build and submit a sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap), [localized versions and hreflang](https://developers.google.com/search/docs/specialty/international/localized-versions), and [URL Inspection](https://support.google.com/webmasters/answer/9012289).

## Optional owner action: Bing

Bing registration and submission have **not** been performed. The owner may add and verify `https://pdfeditgo.com/` in [Bing Webmaster Tools](https://www.bing.com/webmasters/) and submit the same production sitemap. Follow Bing's current verification options; do not assume that implementing Google metadata also registers the site with Bing.

## Expectations

Valid metadata and a sitemap help search engines discover and understand pages. They do not guarantee crawling, indexing, a particular ranking, a chosen search snippet, or traffic. Search engines can rewrite titles and descriptions. Keep the explanations accurate and useful, and monitor the deployed site and search reports over time.

Search setup also does not obtain Google AdSense approval. No AdSense application, publisher configuration or advertising approval was completed here. Advertising requires a separate operator-led setup and policies that match the actual services enabled on the site.
