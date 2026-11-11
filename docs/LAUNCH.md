# PDFEditGo deployment and public launch

This checklist concerns PDFEditGo, the standalone `oreoo1224/pdf-local` project at the connected production domain **https://pdfeditgo.com/**. Existing repositories, including Number-select, are outside its scope. Do not reuse their secrets, environment variables, or deployment configuration.

## 1. Validate the source

From a clean checkout using Node.js 24:

```sh
npm ci
npm run check
npm test
npm run build
npm run check:build
```

Review failures before publishing. Check the generated `dist/` includes static HTML routes, client modules, PDF worker assets, `sitemap.xml`, `robots.txt`, and `_headers`.

Automated tests cover specific inputs; they do not establish that every PDF or every browser works. On desktop and a touch device, verify:

- All six square tool buttons remain in one horizontal row in this order: Word / Hangul to PDF, PPT to PDF, Merge PDF, Image to PDF, PDF to Image, Organize PDF. Narrow screens can scroll the row. Word and PPT cards have no trial badges.
- Selecting and dropping files works, and keyboard users can reach all controls.
- Multiple PDFs merge in the displayed order.
- Page extraction, deletion, reordering, and rotation give the expected downloaded pages; deleting every page is blocked.
- JPG/PNG conversion exports the selected pages, honors the available quality/resolution controls, and generates a valid ZIP for multiple pages.
- Images become a correctly oriented PDF with the selected paper, margins, and fit.
- Basic DOCX, supported HWP 5.0, HWPX and PPTX samples produce a valid image-based PDF with the expected page/slide order and dimensions. The first card detects Word versus Hangul input and executes only the matching converter. Check English and CJK text, a small table, pictures and basic shapes against the originals.
- Document pages clearly explain that text is not selectable/searchable, complex layouts and fonts can differ, and legacy `.doc`/`.ppt`, HWP 3.x and unsupported protection/encryption are not supported. Verify the 20 MB input and 50-page/slide task limits and error handling for corrupt, encrypted, wrong-format and externally linked content. Do not equate a small file with guaranteed compatibility.
- Damaged, encrypted, unsupported, and oversized files produce understandable errors.
- New jobs and removed files release previews; old results do not replace a newer in-progress job.
- Every locale renders complete controls, errors, instructions, and policy content.
- Narrow screens have usable controls, no clipped downloads, and no required hover-only actions.
- Browser developer tools show no PDF, image, DOCX, HWP, HWPX or PPTX file contents being uploaded and no external document resources being fetched.

## 2. Maintain the independent repository

Use the existing [`oreoo1224/pdf-local`](https://github.com/oreoo1224/pdf-local) repository and push only this project's source, lockfile, and documentation. Do not commit `.env`, `node_modules/`, `dist/`, personal test documents, API keys, or tokens. A private source repository is compatible with a public Cloudflare Pages website.

Choose a hosting route without changing any existing project's settings.

### GitHub Pages

In **pdf-local → Settings → Pages**, select **GitHub Actions** as the deployment source. If GitHub instead shows an upgrade requirement, private-repository Pages is unavailable on the current plan. GitHub Free supports public-repository Pages; eligible paid plans can support private-repository Pages. Keep the repository private unless the owner explicitly approves making its source public. Cloudflare Pages remains an option with a private source repository.

When Pages is enabled, run **Actions → Deploy GitHub Pages → Run workflow** on `main`, or push a new commit to `main`. The `pages.yml` workflow checks the source and publishes `dist` using official GitHub actions. If a workflow did not run after an integration-created push, use the manual Run workflow button rather than assuming the source upload also deployed the site.

The workflow derives `SITE_URL` and `SITE_BASE` from the actual Pages configuration. The connected custom domain is `pdfeditgo.com`, so the production values are `SITE_URL=https://pdfeditgo.com` and `SITE_BASE=/`. The settings specify enforced HTTPS. Configuration alone does not verify a release: confirm the workflow succeeded and `https://pdfeditgo.com/` serves the current build over HTTPS. Check `/ko/`, `/organize-pdf/`, the PDF worker, the Hangul WASM asset and `/sitemap.xml` without a `/pdf-local/` prefix. `public/CNAME` preserves the hostname in the artifact.

`https://oreoo1224.github.io/pdf-local/` is the legacy fallback only. If the custom domain is intentionally removed, verify Pages again and rebuild with the returned project origin/base. Do not leave legacy paths in production metadata or asset URLs.

Set the repository's **Settings → Secrets and variables → Actions → Variables → CONTACT_EMAIL** to a real public operator address before launch. No API key or personal GitHub token is needed by the workflow. GitHub Pages does not apply the Cloudflare `_headers` file; inspect the actual response headers and do not advertise that custom CSP as enforced there.

### Cloudflare Pages

Connect the independent repository to a new Cloudflare Pages project. Use `npm run build` and output `dist`, with Node.js 24 and `SITE_BASE=/`. The `Check project` workflow checks source; Cloudflare's Git integration handles deployment separately from the optional GitHub Pages workflow.

Inspect the Hangul WebAssembly asset size first. Cloudflare Pages currently has a 25 MiB per-file asset limit; the HWP runtime may exceed it even though the GitHub Pages deployment succeeds. Prepare chunked asset loading or a compatible static-asset host before attempting that migration. Converter assets can be hosted separately without sending document contents there.

## 3. Configure a real origin and operator contact

Use `SITE_URL=https://pdfeditgo.com` and `SITE_BASE=/` for the connected production domain. Keep the deployment subpath in `SITE_BASE`, not `SITE_URL`. Set `CONTACT_EMAIL` to a real address the operator monitors. The GitHub Pages workflow supplies origin/base automatically and reads the email from a repository variable. The product name is PDFEditGo; the repository name remains `pdf-local`. Do not publish an example email address or pretend contact form.

Both values may be left unset during private repository setup and local review. Without a production origin, the build omits absolute canonical and language-alternate URLs and its sitemap has no entries. Without an email, Contact explains that a support channel is not configured. Before general public launch, configure the values, rebuild, and confirm Contact displays the real address with wording that reflects the configured state.

Deploy, then verify the home page, each tool, and localized pages over HTTPS. Inspect representative HTML source for:

- The correct title, description, and document language.
- One canonical URL using the production origin.
- Consistent English, Korean, Spanish, Japanese, and default language alternates.
- Open Graph URLs using the same origin.
- Structured data that describes the actual visible content.

Open `sitemap.xml` and `robots.txt` under the deployed base path; check production URLs and that useful pages are indexable. Avoid indexing temporary preview deployments with duplicate content; choose the host's preview protection or appropriate `X-Robots-Tag` configuration without applying `noindex` to production.

## 4. Attach a domain and confirm HTTPS

The purchased domain `pdfeditgo.com` is connected to this repository's GitHub Pages configuration, with enforced HTTPS. Keep GitHub Pages as the selected host unless an intentional migration is planned. Do not apply Cloudflare Pages DNS targets to the current GitHub Pages site.

After each domain or deployment change:

1. Confirm `SITE_URL=https://pdfeditgo.com` and `SITE_BASE=/` in the build, using the Pages action's configuration outputs.
2. Confirm the final homepage, tool pages and localized pages serve the current release from the root path.
3. Check alternate host redirects, if configured, preserve paths and queries and do not loop. Use one primary hostname for indexing.
4. Confirm HTTP redirects to HTTPS, certificate validation succeeds, and all assets load without mixed-content errors.
5. Recheck canonical links, hreflang, Open Graph URLs, sitemap, and robots on the final domain. They must use `https://pdfeditgo.com/` without the legacy project path.

Example checks for the actual domain:

```sh
curl -I https://pdfeditgo.com/
curl -I https://pdfeditgo.com/merge-pdf/
curl -I https://pdfeditgo.com/ko/
curl -I http://pdfeditgo.com/
```

If migrating to Cloudflare Pages later, add the domain through that project's **Custom domains** flow and follow the host's current DNS instructions. Wait for its certificate and domain validation, then switch deliberately and recheck the final origin and redirects.

Use browser developer tools to inspect CSP violations and test PDF.js workers, font rendering, thumbnails, ZIP downloads, and image output on the final origin. Headers in `public/_headers` are interpreted by Cloudflare Pages; a local Astro server does not necessarily emulate them, and GitHub Pages does not interpret the file.

## 5. Search and monetization preparation

Only after the domain is stable, register the actual site with Google Search Console and submit its generated sitemap. Indexing and search rankings are not guaranteed. Keep tool explanations useful and accurate; do not generate large numbers of repetitive pages simply to target keywords.

Before enabling ads or analytics, review the README's consent section, update policy pages to match the actual providers, and configure the necessary user choices. Reserve dimensions for visible ad slots, label them clearly, and keep them away from download controls. No publisher ID, CMP, or advertising service is configured by this repository.

## 6. Ongoing maintenance

Keep dependency updates separate and review lockfile/license changes. Run tests and build checks, then retest representative real files and mobile downloads. Monitor browser errors without collecting document contents. Check that the operator address works and policy statements still match the deployed behavior.
