# PDF Room

A standalone, static PDF toolbox built with Astro and TypeScript for Cloudflare Pages or GitHub Pages. **PDF Room is a working name**, and `pdf-local` is the independent project directory/repository name. A domain has not been selected or registered by this project.

한국어: 기존 Number-select와 분리된 신규 프로젝트입니다. 파일을 서버에 올리지 않고 브라우저 안에서 처리하며, 결과는 사용자의 기기로 다운로드합니다. 영어·한국어·스페인어·일본어를 지원합니다. 배포 전 실제 도메인과 운영자 연락처를 설정하세요.

## What this version includes

The main screen follows one simple flow: choose one of four square tool cards, select or drop files, configure the result, then download it.

See the [generated design reference](docs/design-reference.png). It illustrates the intended layout; it is not a browser screenshot.

| Tool | Processing |
| --- | --- |
| Merge PDF | Combine PDF files in the chosen order. |
| Organize PDF | Preview pages, reorder, rotate, remove, and extract selected pages or page ranges into a new PDF. |
| PDF to Image | Export selected pages as JPG or PNG; download multiple pages in a ZIP. |
| Image to PDF | Combine JPG/JPEG and PNG images with paper size, orientation, margins, and image-fit controls. |

English is the default language. Korean, Spanish, and Japanese have their own statically generated URLs. Each tool has indexable HTML content, page metadata, related tools, and instructions. Policy and information pages are included.

This version does **not** include Word/Excel conversion, OCR, editing existing PDF text, a separate image compressor/resizer/converter, accounts, a database, advertising, or analytics. Additional image tools are future work and should not be advertised as available before implementation.

## Local development

Use Node.js 24 and npm. Install dependencies from the checked-in lockfile:

```sh
npm ci
npm run dev
```

Open the local URL printed by Astro. The production build is static HTML, CSS, JavaScript, and worker assets in `dist/`:

```sh
npm run check
npm test
npm run build
npm run check:build
```

The `Check project` GitHub Actions workflow runs those checks without publishing. The separate `Deploy GitHub Pages` workflow builds and publishes when GitHub Pages has been enabled for this repository. Check output and browser verification results should be reviewed before public release.

## Project layout

```text
src/
  components/    Shared navigation, tool UI, and reusable page elements
  layouts/       Common document structure and metadata
  lib/           Translations and browser-local processing logic
  pages/         Static page routes
  styles/        Responsive visual styles
public/
  _headers       Cloudflare Pages security and asset caching headers
tests/           Automated processing tests
docs/LAUNCH.md   Deployment and public-launch checklist
```

`src/lib/pdf.ts` handles PDF document operations. `src/lib/pdf-render.ts` handles PDF previews and PDF-to-image rendering. UI code should not mix file contents into HTML; filenames must be inserted as text.

## File privacy and runtime behavior

- File contents are read by the visitor's browser. There is no upload API or server-side conversion endpoint.
- PDF processing, image rendering, and ZIP generation use local browser memory. Downloads use generated Blob URLs.
- The application has no database, Supabase connection, account system, or paid conversion service. No API keys are required.
- The site and its processing assets must first be fetched from the host. Lazy-loaded modules may be fetched when a tool is first used. This version is not an installed offline app, and it does not promise that every feature works without an initial network request.
- File contents are not intentionally persisted in local storage or IndexedDB. The browser and operating system control their own memory, caching, and download behavior; this is not a forensic secure-erasure guarantee.
- The hosting provider can process normal connection information such as an IP address and request logs. The privacy policy must distinguish that from PDF or image uploads.

## Supported inputs and practical limits

The tools target ordinary, unencrypted PDF documents and valid JPG/JPEG or PNG image files. Encrypted, malformed, unsupported, or oversized input must produce an error instead of silently ignoring encryption or generating a misleading result.

Browser memory varies by device. Safeguards bound file count, total input bytes, page rendering, and canvas area; they are technical limits per operation, not a paid usage quota. Thumbnails and rendered pages should be processed sequentially, with document handles, object URLs, and temporary canvases released when no longer used. A browser may still terminate a tab under memory pressure.

Current UI limits: 30 input files, 50 MB per file and 100 MB total; the page editor accepts up to 200 pages per document. PDF-to-image exports accept at most 100 selected pages per task. Source images are limited to 40 megapixels, rendered canvases to 24 megapixels, and accumulated ZIP contents to 150 MB. Lower limits may still be necessary on a memory-constrained phone. JPEG EXIF rotation and mirroring are honored without recompressing source photos.

Verification for this initial repository: automated PDF and localization tests, Astro/TypeScript diagnostics, and production-output route/metadata/link checks have passed. Browser UI, Canvas/PDF.js rendering, mobile downloads and final-origin security headers still need browser verification; no live deployment has been performed. The supplied design reference is a generated concept, not a screenshot of a running website.

Editing a PDF changes its bytes and can invalidate existing digital signatures. Preservation of interactive forms, bookmarks, attachments, accessibility structure, and other document-level features is not guaranteed. Keep the original and review important output before relying on it.

JPG conversion is lossy. PNG output can be large. Export resolution affects both detail and memory use. The project does not guarantee that a document or image can be reduced below any requested byte size.

## Production configuration

Copy `.env.example` to `.env` for local configuration, or set the relevant hosting/workflow variables. They are build-time configuration; they are **not secrets**.

| Variable | Purpose |
| --- | --- |
| `SITE_URL` | The actual production origin, such as the assigned Pages hostname or your final custom domain. Used for canonical URLs, language alternates, Open Graph URLs, sitemap, and robots references. |
| `SITE_BASE` | Deployment path, normally `/`. A GitHub project site uses `/pdf-local/`; the GitHub Pages workflow obtains this from the repository's Pages configuration. Keep `SITE_URL` as the origin without this path. |
| `CF_PAGES_URL` | Cloudflare's deployment URL; the build can use it as a fallback when `SITE_URL` is absent. Prefer a stable `SITE_URL` for the production site. |
| `CONTACT_EMAIL` | A real public operator support address. Configure it before public launch; never enter a private credential. |

Do not publish canonical links pointing to `your-project.pages.dev`, localhost, an unregistered domain, or a preview deployment when a production hostname exists. After a domain change, update `SITE_URL`, rebuild, and check generated metadata and `sitemap.xml`.

A production origin and operator email are not required to create the initial private GitHub repository or develop locally. When neither origin variable is configured, the build omits absolute canonical/language-alternate metadata and emits an empty sitemap rather than inventing a public domain. With no `CONTACT_EMAIL`, the contact page describes the missing support channel and does not display a fake form or address. These are public-launch requirements, not blockers for private source review; configure and verify them before opening the site to general visitors.

## Independent repository

Use a **new GitHub repository** for this folder. Do not copy another project's environment variables, credentials, Git remotes, source, or Supabase settings. No modification of Number-select is needed.

## GitHub Pages

GitHub Pages must be enabled separately from uploading source code. In **this repository only**, open **Settings → Pages → Build and deployment → Source** and select **GitHub Actions**. If GitHub says the private repository needs an upgrade, the current account is not eligible to publish that private repository with Pages. GitHub Free supports Pages from public repositories; private-repository Pages requires an eligible paid plan. Do not change repository visibility without the owner's explicit choice. Cloudflare Pages can instead publish this static site while the GitHub repository stays private.

After Pages is enabled, open **Actions → Deploy GitHub Pages → Run workflow** for `main` if the initial push did not start a run. Subsequent pushes to `main` trigger that deployment workflow. The workflow installs the lockfile, runs checks/tests, builds, verifies the output, and deploys `dist` with GitHub's official Pages actions. It uses the configured Pages origin and base path, so worker assets, localized routes and downloads work under a project URL. It does not need a personal token or a paid conversion service.

The expected project URL for this repository is **https://oreoo1224.github.io/pdf-local/**. This is an expected address, **not confirmation that deployment has succeeded**. Confirm the workflow's `github-pages` environment URL, terminal deployment result and an HTTPS visit before reporting it as live. Configure the real operator email as repository variable `CONTACT_EMAIL` before public launch, then rerun the workflow. Review the browser-verification checklist in [the launch guide](docs/LAUNCH.md).

For a local production-output check of the same subpath setup:

```sh
SITE_URL=https://oreoo1224.github.io SITE_BASE=/pdf-local/ npm run build
SITE_URL=https://oreoo1224.github.io SITE_BASE=/pdf-local/ npm run check:build
```

Use a single primary host for search indexing. If GitHub Pages is a temporary preview and Cloudflare/custom-domain hosting becomes production, update the origin/base, canonical URLs and hosting redirects instead of leaving duplicate sites independently indexed.

## Cloudflare Pages

Once the new repository exists, connect it in Cloudflare **Workers & Pages → Create → Pages → Connect to Git**. Select only the new repository and set:

| Setting | Value |
| --- | --- |
| Production branch | `main` |
| Root directory | Repository root |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Node version | `24` using the project version file or Pages environment setting |

Set the production `SITE_URL` and `CONTACT_EMAIL` in Cloudflare Pages; leave `SITE_BASE=/` for a domain-root deployment. No server runtime, database binding, or paid API configuration is needed. A successful build is not proof of browser behavior: test file selection, conversion, download, language switching, mobile controls, and errors on the deployed origin.

Add a purchased domain through the Pages project's **Custom domains** section and follow Cloudflare's DNS instructions. Wait for domain validation and the HTTPS certificate to be active. Choose one primary hostname and configure permanent redirects for the other hostname(s); do not leave the Pages hostname and both apex/`www` independently indexed. See [the launch guide](docs/LAUNCH.md) for verification details.

## Security headers

`public/_headers` is copied to the static output and interpreted by **Cloudflare Pages**. On that host it restricts embedding and device permissions, disables content-type sniffing, and limits runtime resource origins to the site plus local Blob/data resources. The CSP allows same-origin scripts/assets, Blob workers and previews, and WebAssembly compilation used by PDF rendering. **GitHub Pages does not interpret `_headers`**, so do not claim those custom HTTP headers are active there. Use a host with configurable response headers if those policies are required.

The initial policy permits inline scripts for generated metadata and inline styles. It does not permit JavaScript `eval`. Before tightening it with hashes/nonces, inventory the actual generated HTML and test workers, font rendering, all tools, and all locales. Any future analytics, ads, consent manager, external font, or contact integration requires an intentional policy update and retesting. Never add broad wildcards simply to make a third-party snippet work.

On Cloudflare Pages with the supplied root-path configuration, only fingerprinted `/_astro/` assets receive one-year immutable caching. HTML and policy pages are not assigned immutable caching by this project. GitHub Pages applies its own caching behavior.

## Ads and future monetization

No AdSense script, publisher ID, tracking pixel, analytics SDK, or advertising cookie is present. Advertisement space should be managed through a reusable component, clearly labeled, separated from file/download controls, and assigned dimensions when enabled to limit layout shifts. Keep unused placements hidden.

Before enabling ads:

1. Apply with the actual operator account and domain; approval and revenue are not guaranteed.
2. Add only the real approved publisher ID. Do not invent an ID or ship another operator's ID.
3. Review the applicable consent and disclosure requirements, including Google's current consent requirements for visitors in the EEA, UK, and Switzerland, and any other regions you target. Configure a suitable certified CMP where required before making dependent ad or cookie requests.
4. Update the privacy policy with actual providers, purposes, retention, choices, and a functioning operator contact. Terms and privacy text are implementation descriptions, not a substitute for an operator review.
5. Update the CSP narrowly, reserve responsive ad dimensions, and test that ads cannot be mistaken for processing or download buttons.

Do not claim that keeping files local means hosting and advertising collect no connection data.

## Open-source licenses

Project source is licensed under [MIT](LICENSE). Dependencies retain their own licenses and notices. Direct dependency versions are pinned by `package-lock.json`; consult the installed package manifests when updating them.

| Dependency | Installed version | Role | Upstream license |
| --- | --- | --- | --- |
| Astro | 7.4.10 | Static site generation | MIT |
| TypeScript | 6.0.3 | Type checking | Apache-2.0 |
| pdf-lib | 1.17.1 | PDF manipulation and image embedding | MIT |
| PDF.js (`pdfjs-dist`) | 6.5.438 | PDF previews and page rendering | Apache-2.0 |
| fflate | 0.8.3 | ZIP generation | MIT |
| Vitest | 5.1.0 | Development tests | MIT |
| Vite | 8.3.8 | Asset bundling and build-time environment configuration | MIT |
| `@astrojs/check` | 0.9.12 | Astro diagnostics | MIT |
| `@types/node` | 26.6.6 | Development type declarations | MIT |

The versions and licenses above were checked against the installed package manifests and license files. This is a direct-dependency inventory, not an exhaustive audit of every transitive package. The build helper copies the runtime libraries' license texts into `public/licenses/` and preserves the license files alongside PDF.js assets.

PDF.js includes additional asset notices: Liberation fonts use GPLv2 with an explicit font exception; Foxit fonts and some image decoders use permissive BSD-style terms; other decoder components use MIT or Apache-2.0; ICC profiles use CC0. The exact included license files remain the authoritative terms. Preserve those notices when distributing or updating the copied assets, and do not describe all PDF.js assets as solely Apache-2.0. Recheck direct and transitive licenses after dependency updates. No paid conversion engine or service dependency is included.

