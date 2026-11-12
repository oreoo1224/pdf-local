# PDFEditGo

A standalone, static PDF toolbox built with Astro and TypeScript for Cloudflare Pages or GitHub Pages. **PDFEditGo is the product name**, and `pdf-local` remains the independent project directory/repository name. The connected production domain is **https://pdfeditgo.com/**.

GitHub Pages is configured for `pdfeditgo.com`, enforced HTTPS, and a domain-root deployment (`SITE_BASE=/`). Confirm that the latest deployment serves the current build before treating a configuration change as a completed release. Interactive browser and mobile acceptance checks remain separate from deployment verification.

한국어: 기존 Number-select와 분리된 신규 프로젝트입니다. 파일을 서버에 올리지 않고 브라우저 안에서 처리하며, 결과는 사용자의 기기로 다운로드합니다. 영어·한국어·스페인어·일본어를 지원합니다. 연결된 운영 도메인은 https://pdfeditgo.com/ 입니다. 공개 운영 전 실제 운영자 연락처를 설정하세요.

## What this version includes

The main screen follows one simple flow: choose one of six square tool cards in a single horizontal row, select or drop files, configure the result, then download it. Narrow screens scroll the same row horizontally. A single centered save button mirrors the result download and remains disabled until a converted file is ready.

Safari may open a generated PDF as a preview. Use **Share / Save to Files** when the browser supports sharing that result, or **Open result** and the preview's **Share → Save to Files** action. Download and preview links open separately from the editor. Native sharing starts directly from a button tap, and cancelling it keeps the result available. Sharing sends the file only to the destination the visitor chooses; the website has no upload endpoint. Back/forward caching retains the current local job, while a new task, replaced result or actual page disposal releases its resources.

File validation is labeled separately from conversion. Processing remains below 100% until the output link is ready and saving is enabled. Conversion errors appear next to the action controls and receive focus; the disabled save hint explains that processing failed. Duplicate control events do not discard an output unless its settings actually changed. Cleanup failures cannot discard an already generated PDF or replace a real conversion error.

See the [generated design reference](docs/design-reference.png). It illustrates the intended layout; it is not a browser screenshot.

The approved icon artwork is preserved in `docs/brand-original.jpg`. Browser favicons, the 180px Apple touch icon, the header mark and structured-data logo use exports of that same artwork. Regenerate the checked-in PNG/ICO files with `node scripts/prepare-icons.mjs`; the exporter changes dimensions only, without redrawing or cropping the design.

| Tool | Processing |
| --- | --- |
| Word / Hangul to PDF | Detect a `.docx`, supported HWP 5.0 `.hwp`, or `.hwpx` file and use the matching local document engine to create an image-based PDF. |
| PPT to PDF | Render `.pptx` slides locally and save them as an image-based PDF. |
| Merge PDF | Combine PDF files in the chosen order. |
| Image to PDF | Combine JPG/JPEG and PNG images with paper size, orientation, margins, and image-fit controls. |
| PDF to Image | Export selected pages as JPG or PNG; download multiple pages in a ZIP. |
| Organize PDF | Preview pages, reorder, rotate, remove, and extract selected pages or page ranges into a new PDF. |

English is the fallback language. Korean, Spanish, and Japanese have their own statically generated URLs. On a first visit to the homepage, the browser’s preferred languages can select a supported language automatically. A manually chosen language is remembered and takes priority; explicit localized URLs are respected. This uses no IP-country lookup or geolocation API. Each tool has indexable HTML content, page metadata, related tools, and instructions. Policy and information pages are included.

The first card combines Word and Hangul input; the second card handles PowerPoint. File signatures and internal package structure select the appropriate engine, rather than running every converter or trusting a filename alone. Document PDFs contain page images, so the output does not preserve selectable or searchable text. Fonts, pagination and complex layouts may differ from the original application. Older binary `.doc` and `.ppt`, HWP 3.x, and protected or encrypted HWP/HWPX inputs are not supported by the initial Hangul integration.

This version does **not** include Excel conversion, OCR, editing existing PDF text, a separate image compressor/resizer/converter, accounts, a database, advertising, or analytics. Additional image tools are future work and should not be advertised as available before implementation.

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

`src/lib/pdf.ts` handles PDF document operations. `src/lib/pdf-render.ts` handles PDF previews and PDF-to-image rendering. `src/lib/office.ts` handles Word/PPT rendering and PDF assembly; `src/lib/hangul.ts` handles HWP/HWPX processing. The shared first-card flow dispatches to the matching engine. UI code should not mix file contents into HTML; filenames must be inserted as text.

Browser document renderers pass their original Canvas pixels directly to `src/lib/pdf-raster.ts`, which compresses each page losslessly using native `CompressionStream` or the existing fflate fallback. This avoids the PNG encode/decode round trip and retaining uncompressed pixels from every page until the final save. Resolution, page dimensions and transparency are preserved; PNG-based adapters remain supported.

Accepted Hangul files start preparing local engine/font assets while options are being chosen. Fonts and WASM initialize in parallel, and both document engines share the same font-loading promise. A `WeakMap` remembers successful validation for the same immutable `File` and format, without retaining file bytes; different files and failed checks still receive full validation. See [the measured comparison and correctness evidence](docs/PERFORMANCE.md) or run `node scripts/benchmark-conversion.mjs`. Its NodeCanvas timings do not measure an iPhone or cold network startup.

## File privacy and runtime behavior

- File contents are read by the visitor's browser. There is no upload API or server-side conversion endpoint.
- PDF processing, image rendering, and ZIP generation use local browser memory. Downloads use generated Blob URLs.
- The application has no database, Supabase connection, account system, or paid conversion service. No API keys are required.
- The site and its processing assets must first be fetched from the host. Lazy-loaded modules may be fetched when a tool is first used. This version is not an installed offline app, and it does not promise that every feature works without an initial network request.
- Browser local storage retains only the user’s manually chosen language preference. No IP-country lookup or geolocation request is made.
- File contents are not intentionally persisted in local storage or IndexedDB. The browser and operating system control their own memory, caching, and download behavior; this is not a forensic secure-erasure guarantee.
- The hosting provider can process normal connection information such as an IP address and request logs. The privacy policy must distinguish that from PDF or image uploads.

## Supported inputs and practical limits

The tools target ordinary, unencrypted PDF documents, valid JPG/JPEG or PNG images, `.docx`, `.pptx`, supported HWP 5.0 `.hwp`, and `.hwpx` documents. The Word / Hangul and PPT cards are regular tools without trial badges. Document converters support the formats and limits described here; complex layouts may differ from Microsoft Office or Hancom output. Encrypted, malformed, unsupported, or oversized input must produce an error instead of silently ignoring encryption or generating a misleading result.

Browser memory varies by device. Safeguards bound file count, total input bytes, page rendering, and canvas area; they are technical limits per operation, not a paid usage quota. Thumbnails and rendered pages should be processed sequentially, with document handles, object URLs, and temporary canvases released when no longer used. A browser may still terminate a tab under memory pressure.

Current UI limits: 30 input files, 50 MB per file and 100 MB total; the page editor accepts up to 200 pages per document. PDF-to-image exports accept at most 100 selected pages per task. Source images are limited to 40 megapixels, rendered canvases to 24 megapixels, and accumulated ZIP contents to 150 MB. Lower limits may still be necessary on a memory-constrained phone. JPEG EXIF rotation and mirroring are honored without recompressing source photos.

Document conversion has separate safeguards: one input file of at most 20 MB and at most 50 output pages or slides per task. Rendering proceeds sequentially and releases page images as they are embedded. These limits reduce memory pressure but cannot guarantee that every supported-size document will render on a phone. OOXML documents with external relationships, including hyperlinks and externally linked images, templates or media, are rejected rather than requesting their resources. HWP/HWPX protection, format and resource checks likewise reject unsupported input. Complex Word pagination, SmartArt, charts, equations, Hangul tables, custom fonts and other application-specific features require representative-file testing; unsupported content must not be described as fully compatible.

Verification: 337 automated processing, download and SEO tests, Astro/TypeScript diagnostics, and exact production-domain route/metadata/link checks passed. The document suites exercise the production PDF assembly paths with actual OOXML/rhwp WebAssembly and Node Canvas rendering: a one-page Word sample, a two-slide landscape PPT sample, and own-generated HWP/HWPX samples with Korean/Japanese text, a table and a picture. The HWP and HWPX samples both produce matching one-page A4 PDFs; selecting the second page of a separate two-page HWPX is also covered. Resulting PDFs were rasterized and visually checked. These samples do not establish full Office or Hangul fidelity. Browser Worker execution, interactive document conversion/downloads and mobile use still need browser verification. The supplied design reference is a generated concept using the earlier working title, not a screenshot of the running website.

Editing a PDF changes its bytes and can invalidate existing digital signatures. Preservation of interactive forms, bookmarks, attachments, accessibility structure, and other document-level features is not guaranteed. Keep the original and review important output before relying on it.

JPG conversion is lossy. PNG output can be large. Export resolution affects both detail and memory use. The project does not guarantee that a document or image can be reduced below any requested byte size.

## Production configuration

Copy `.env.example` to `.env` for local configuration, or set the relevant hosting/workflow variables. They are build-time configuration; they are **not secrets**.

| Variable | Purpose |
| --- | --- |
| `SITE_URL` | `https://pdfeditgo.com` for the connected production domain. Used for canonical URLs, language alternates, Open Graph URLs, sitemap, and robots references. |
| `SITE_BASE` | `/` for the connected custom domain. The GitHub Pages workflow obtains this from the repository's Pages configuration. Keep `SITE_URL` as the origin without this path. |
| `CF_PAGES_URL` | Cloudflare's deployment URL; the build can use it as a fallback when `SITE_URL` is absent. Prefer a stable `SITE_URL` for the production site. |
| `CONTACT_EMAIL` | A real public operator support address. Configure it before public launch; never enter a private credential. |
| `PUBLIC_GOOGLE_SITE_VERIFICATION` | Optional real Google HTML-tag verification token for a Search Console URL-prefix property. Leave empty unless Google supplies it. |

Do not publish canonical links pointing to `your-project.pages.dev`, localhost, an unregistered domain, or a preview deployment when a production hostname exists. After a domain change, update `SITE_URL`, rebuild, and check generated metadata and `sitemap.xml`.

A production origin and operator email are not required to create the initial private GitHub repository or develop locally. When neither origin variable is configured, the build omits absolute canonical/language-alternate metadata and emits an empty sitemap rather than inventing a public domain. With no `CONTACT_EMAIL`, the contact page describes the missing support channel and does not display a fake form or address. These are public-launch requirements, not blockers for private source review; configure and verify them before opening the site to general visitors.

## Search metadata and sitemap

The production sitemap is [https://pdfeditgo.com/sitemap.xml](https://pdfeditgo.com/sitemap.xml), with its discovery URL in [robots.txt](https://pdfeditgo.com/robots.txt). Each indexable page has localized metadata, a canonical URL and reciprocal English, Korean, Spanish, Japanese and `x-default` alternates. Social sharing uses the included 1200 × 630 PNG, and structured data describes the visible website, page, breadcrumbs and actual tool where applicable.

The sitemap contains 40 URLs without an operator email, or 44 once `CONTACT_EMAIL` is configured. Unconfigured Contact pages and the 404 page use `noindex`; 404 pages never point their canonical URL at the homepage. Search Console verification and sitemap submission are separate owner actions. Follow [the SEO and Search Console guide](docs/SEO.md) to register the domain and submit the sitemap.

## Independent repository

The independent repository is [`oreoo1224/pdf-local`](https://github.com/oreoo1224/pdf-local). Keep this repository and its deployment separate from Number-select. Do not copy another project's environment variables, credentials, source, or Supabase settings.

## GitHub Pages

GitHub Pages must be enabled separately from uploading source code. In **this repository only**, open **Settings → Pages → Build and deployment → Source** and select **GitHub Actions**. If GitHub says the private repository needs an upgrade, the current account is not eligible to publish that private repository with Pages. GitHub Free supports Pages from public repositories; private-repository Pages requires an eligible paid plan. Do not change repository visibility without the owner's explicit choice. Cloudflare Pages can instead publish this static site while the GitHub repository stays private.

After Pages is enabled, open **Actions → Deploy GitHub Pages → Run workflow** for `main` if the initial push did not start a run. Subsequent pushes to `main` trigger that deployment workflow. The workflow installs the lockfile, runs checks/tests, builds, verifies the output, and deploys `dist` with GitHub's official Pages actions. It uses the configured Pages origin and base path, so worker assets, localized routes and downloads work under a project URL. It does not need a personal token or a paid conversion service.

The configured production address is **https://pdfeditgo.com/**. `actions/configure-pages` supplies `SITE_URL=https://pdfeditgo.com` and a root base path from the actual Pages configuration; the workflow does not hardcode the legacy project path. `public/CNAME` retains the chosen hostname in the static artifact. After deployment, verify the workflow result, HTTPS response, current tool UI and assets at this domain. Configure the real operator email as repository variable `CONTACT_EMAIL` before general public launch, then rerun the workflow. Review [the launch guide](docs/LAUNCH.md).

For a local production-output check matching the connected domain:

```sh
SITE_URL=https://pdfeditgo.com SITE_BASE=/ npm run build
SITE_URL=https://pdfeditgo.com SITE_BASE=/ npm run check:build
```

The former project URL, `https://oreoo1224.github.io/pdf-local/`, is a legacy fallback only. If the custom domain is intentionally removed, the workflow can derive the project base from Pages again. A local fallback check uses `SITE_URL=https://oreoo1224.github.io SITE_BASE=/pdf-local/` for both commands; do not use those values for the connected custom domain.

Use `https://pdfeditgo.com/` as the primary host for search indexing. For any later hosting migration, update the origin/base, canonical URLs and redirects together so they continue to describe the final production site.

## Cloudflare Pages

For a later migration to Cloudflare Pages, connect the existing `pdf-local` repository in **Workers & Pages → Create → Pages → Connect to Git** and set:

| Setting | Value |
| --- | --- |
| Production branch | `main` |
| Root directory | Repository root |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Node version | `24` using the project version file or Pages environment setting |

Set the production `SITE_URL` and `CONTACT_EMAIL` in Cloudflare Pages; leave `SITE_BASE=/` for a domain-root deployment. No server runtime, database binding, or paid API configuration is needed. A successful build is not proof of browser behavior: test file selection, conversion, download, language switching, mobile controls, and errors on the deployed origin.

Check emitted asset sizes before migrating the Hangul build to Cloudflare Pages. Its current single-file asset limit is 25 MiB, and the HWP WebAssembly binary may exceed that limit. GitHub Pages can serve the current larger binary, but an unchanged output should not be assumed to fit Cloudflare Pages: arrange chunked runtime loading or a suitable static-asset host first. This concerns delivery of the converter code, not uploading visitors' documents.

Add a purchased domain through the Pages project's **Custom domains** section and follow Cloudflare's DNS instructions. Wait for domain validation and the HTTPS certificate to be active. Choose one primary hostname and configure permanent redirects for the other hostname(s); do not leave the Pages hostname and both apex/`www` independently indexed. See [the launch guide](docs/LAUNCH.md) for verification details.

## Security headers

`public/_headers` is copied to the static output and interpreted by **Cloudflare Pages**. On that host it restricts embedding and device permissions, disables content-type sniffing, and limits runtime resource origins to the site plus local Blob/data resources. The CSP allows same-origin scripts/assets, Blob workers and previews, and WebAssembly compilation used by PDF rendering. **GitHub Pages does not interpret `_headers`**, so do not claim those custom HTTP headers are active there. Use a host with configurable response headers if those policies are required.

The initial policy permits inline scripts for generated metadata and inline styles. It does not permit JavaScript `eval`. Before tightening it with hashes/nonces, inventory the actual generated HTML and test workers, font rendering, all tools, and all locales. Any future analytics, ads, consent manager, external font, or contact integration requires an intentional policy update and retesting. Never add broad wildcards simply to make a third-party snippet work.

On Cloudflare Pages with the supplied root-path configuration, only fingerprinted `/_astro/` assets receive one-year immutable caching. HTML and policy pages are not assigned immutable caching by this project. GitHub Pages applies its own caching behavior.

## Ads and future monetization

The operator-provided AdSense account `ca-pub-7780621394135550` is declared in the shared document head, and [ads.txt](https://pdfeditgo.com/ads.txt) identifies `pub-7780621394135550` as the direct Google publisher. These static declarations do not load ads or establish account/site approval. To change the publisher later, update both `src/layouts/Site.astro` and `public/ads.txt` together, rebuild and deploy.

No AdSense script, tracking pixel, analytics SDK, or advertising cookie is present. Advertisement space should be managed through a reusable component, clearly labeled, separated from file/download controls, and assigned dimensions when enabled to limit layout shifts. Keep unused placements hidden.

Before enabling ads:

1. Apply with the actual operator account and domain; approval and revenue are not guaranteed.
2. Verify that the configured publisher ID belongs to the operator and matches the actual AdSense account. Use only that account's approved advertising code.
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
| `@silurus/ooxml` | 0.89.9 | DOCX/PPTX parsing and local Canvas rendering | MIT, with bundled third-party notices |
| `@rhwp/core` | 0.9.0 | Local HWP 5.0/HWPX parsing and rendering | MIT |
| fflate | 0.8.3 | ZIP generation | MIT |
| Vitest | 5.1.0 | Development tests | MIT |
| `@napi-rs/canvas` | 1.1.0 | Development-only Canvas rendering tests | MIT |
| Vite | 8.3.8 | Asset bundling and build-time environment configuration | MIT |
| `@astrojs/check` | 0.9.12 | Astro diagnostics | MIT |
| `@types/node` | 26.6.6 | Development type declarations | MIT |

The versions and licenses above were checked against the installed package manifests and license files. This is a direct-dependency inventory, not an exhaustive audit of every transitive package. The build helper copies the runtime libraries' license texts into `public/licenses/` and preserves the license files alongside PDF.js assets.

PDF.js includes additional asset notices: Liberation fonts use GPLv2 with an explicit font exception; Foxit fonts and some image decoders use permissive BSD-style terms; other decoder components use MIT or Apache-2.0; ICC profiles use CC0. The exact included license files remain the authoritative terms. Preserve those notices when distributing or updating the copied assets, and do not describe all PDF.js assets as solely Apache-2.0. Recheck direct and transitive licenses after dependency updates. No paid conversion engine or service dependency is included.

`@silurus/ooxml` ships an MIT `LICENSE` and `THIRD_PARTY_NOTICES.md`, including notices for bundled parser dependencies and optional rendering assets. The build copies them to `licenses/silurus-ooxml.txt` and `licenses/silurus-ooxml-third-party.txt`, alongside the local parser assets under `office/`. Preserve both when distributing its JavaScript/WASM assets.

`@rhwp/core` 0.9.0 is distributed under MIT. The build retains its author copyright and MIT license at `licenses/rhwp-core.txt` and its complete bundled third-party notices under `licenses/rhwp-notices/`, alongside `hangul/rhwp_bg.wasm`. Preserve this directory when distributing the runtime: it includes additional font, codec and other asset terms. Review bundled assets and transitive notices when updating the package, and do not assume that an engine license grants redistribution rights to unrelated Hancom fonts.

Document conversion lazily loads a self-hosted Noto Sans KR font from `fonts/NotoSansKR.ttf`; documents are not sent to a font service, and no Google Fonts stylesheet/API is used at runtime. The font is sourced from the official [Google Fonts Noto Sans KR directory](https://github.com/google/fonts/tree/main/ofl/notosanskr) and distributed under the SIL Open Font License 1.1, retained at `fonts/OFL.txt`. The checked source font has SHA-256 `194018e6b2b293a7964f037b25c0249ce1418bc9ab3c971060a03aa57861e252`. Font substitution can still change document line breaks and pagination. Additional hosted fonts, codecs or renderers need their own notices and validation before being enabled.

