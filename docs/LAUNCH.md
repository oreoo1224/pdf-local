# Deployment and public launch

This checklist concerns the standalone `pdf-local` project. Existing repositories, including Number-select, are outside its scope. Do not reuse their secrets, environment variables, or deployment configuration.

## 1. Validate the source

From a clean checkout using Node.js 24:

```sh
npm ci
npm run check
npm test
npm run build
```

Review failures before publishing. Check the generated `dist/` includes static HTML routes, client modules, PDF worker assets, `sitemap.xml`, `robots.txt`, and `_headers`.

Automated tests cover specific inputs; they do not establish that every PDF or every browser works. On desktop and a touch device, verify:

- All four square tool buttons select the expected tool and upload instructions.
- Selecting and dropping files works, and keyboard users can reach all controls.
- Multiple PDFs merge in the displayed order.
- Page extraction, deletion, reordering, and rotation give the expected downloaded pages; deleting every page is blocked.
- JPG/PNG conversion exports the selected pages, honors the available quality/resolution controls, and generates a valid ZIP for multiple pages.
- Images become a correctly oriented PDF with the selected paper, margins, and fit.
- Damaged, encrypted, unsupported, and oversized files produce understandable errors.
- New jobs and removed files release previews; old results do not replace a newer in-progress job.
- Every locale renders complete controls, errors, instructions, and policy content.
- Narrow screens have usable controls, no clipped downloads, and no required hover-only actions.
- Browser developer tools show no PDF/image file contents being uploaded.

## 2. Create and connect an independent repository

Create a new GitHub repository and push only this project's source, lockfile, and documentation. Do not commit `.env`, `node_modules/`, `dist/`, personal test documents, API keys, or tokens. A private source repository is compatible with a public Cloudflare Pages website.

Connect that repository to a new Cloudflare Pages project. Use `npm run build` and output `dist`, with Node.js 24. The included GitHub workflow checks source; Cloudflare's Git integration handles deployment separately.

## 3. Configure a real origin and operator contact

Set `SITE_URL` to the actual production origin, initially the assigned `https://<project>.pages.dev` URL if no domain exists. Set `CONTACT_EMAIL` to a real address the operator monitors. Replace temporary brand details when the name is chosen. Do not publish an example email address or pretend contact form.

Both values may be left unset during private repository setup and local review. Without a production origin, the build omits absolute canonical and language-alternate URLs and its sitemap has no entries. Without an email, Contact explains that a support channel is not configured. Before general public launch, configure the values, rebuild, and confirm Contact displays the real address with wording that reflects the configured state.

Deploy, then verify the home page, each tool, and localized pages over HTTPS. Inspect representative HTML source for:

- The correct title, description, and document language.
- One canonical URL using the production origin.
- Consistent English, Korean, Spanish, Japanese, and default language alternates.
- Open Graph URLs using the same origin.
- Structured data that describes the actual visible content.

Open `/sitemap.xml` and `/robots.txt`; check production URLs and that useful pages are indexable. Avoid indexing temporary preview deployments with duplicate content; choose the host's preview protection or appropriate `X-Robots-Tag` configuration without applying `noindex` to production.

## 4. Attach a domain and confirm HTTPS

Purchase the chosen domain separately. Add it through **Pages → project → Custom domains** and follow the displayed DNS instructions. For an apex domain, Cloudflare may require zone/nameserver configuration; follow the current Pages flow rather than inventing DNS targets. Never point DNS at a preview URL.

Wait for the custom domain status and certificate to become active. Then:

1. Set `SITE_URL` to the final `https://` origin and rebuild.
2. Choose apex or `www` as primary. Use Cloudflare redirect rules to permanently redirect the alternate hostname, preserving the path and query.
3. Configure the old Pages hostname to redirect to the custom domain if it remains publicly accessible. Verify redirect rules do not loop.
4. Confirm HTTP redirects to HTTPS, certificate validation succeeds, and all assets load without mixed-content errors.
5. Recheck canonical links, hreflang, Open Graph URLs, sitemap, and robots on the final domain.

Example checks after replacing the sample origin with the actual hostname:

```sh
curl -I https://your-real-domain.example/
curl -I https://your-real-domain.example/merge-pdf/
curl -I https://your-real-domain.example/ko/
curl -I http://your-real-domain.example/
```

Use browser developer tools to inspect CSP violations and test PDF.js workers, font rendering, thumbnails, ZIP downloads, and image output on the final origin. Headers in `public/_headers` are interpreted by Pages; a local Astro server does not necessarily emulate them.

## 5. Search and monetization preparation

Only after the domain is stable, register the actual site with Google Search Console and submit its generated sitemap. Indexing and search rankings are not guaranteed. Keep tool explanations useful and accurate; do not generate large numbers of repetitive pages simply to target keywords.

Before enabling ads or analytics, review the README's consent section, update policy pages to match the actual providers, and configure the necessary user choices. Reserve dimensions for visible ad slots, label them clearly, and keep them away from download controls. No publisher ID, CMP, or advertising service is configured by this repository.

## 6. Ongoing maintenance

Keep dependency updates separate and review lockfile/license changes. Run tests and build checks, then retest representative real files and mobile downloads. Monitor browser errors without collecting document contents. Check that the operator address works and policy statements still match the deployed behavior.
