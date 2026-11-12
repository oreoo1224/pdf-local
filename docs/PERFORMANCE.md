# Document conversion performance

Run the local comparison with:

```sh
node scripts/benchmark-conversion.mjs
```

The script compares the production Hangul conversion engine's PNG adapter fallback with its direct RGBA adapter. Both use rhwp's actual Canvas renderer, the same document, the same page selection, and scale **1.5**. It includes input reading, reuse of successful validation for the same immutable File, document parsing, page rendering, pixel capture or PNG encoding, PDF embedding, and PDF serialization. Local font loading, WASM initialization, and module transformation finish before measurement. The validated input is warmed before both measured paths, matching selection followed by conversion in the application.

Each adapter receives one warmup conversion. Five measured conversions per adapter alternate order to reduce ordering effects; reported times are medians. `CONVERSION_BENCH_RUNS` can select 3–15 measured conversions per adapter. The script asserts that both adapters render identical pixel dimensions.

## Recorded local result

Measured on 2026-11-12 with Node 24.22.1, Linux x64, `@napi-rs/canvas` 1.1.0, `@rhwp/core` 0.9.0, and native `CompressionStream('deflate')` available:

| Synthetic fixture | Pages | Pixels per page | PNG median | RGBA median | Speedup | PNG PDF bytes | RGBA PDF bytes |
| --- | ---: | --- | ---: | ---: | ---: | ---: | ---: |
| `simple.hwp` | 1 | 1192 × 1685 | 245.25 ms | 69.23 ms | 3.54× | 30,482 | 31,085 |
| `two-pages.hwpx` | 2 | 1192 × 1685 | 402.12 ms | 92.01 ms | 4.37× | 31,213 | 31,672 |

The direct route removes Canvas PNG encoding and pdf-lib PNG decoding, then compresses the original RGB samples and any alpha mask directly into PDF image streams. The small output size differences come from lossless compression implementations. Resolution and pixel samples remain unchanged.

These synthetic documents provide a reproducible local regression baseline. These numbers do not measure Safari/iPhone execution, cold asset downloads, or the user's document.

## Startup and memory changes

Accepted HWP/HWPX selections begin preparing local engine assets without passing document bytes to the warmup function. The converter awaits both font and WASM readiness before opening a document. Concurrent font requests share one promise across the Hangul and Office adapters. Optional warmup failure does not prevent a later conversion from retrying initialization.

Successful format validation is cached by immutable File identity and format using a WeakMap. Cached values are completion promises rather than document bytes; different File objects and failed checks are validated again. Conversion still reads the selected source locally. None of these changes sends document content to a server.

The direct PDF route retains compressed RGB and, where necessary, compressed alpha streams page by page. It keeps the existing dimension/page/output limits and does not reduce the selected resolution. Native compression failures fall back to fflate's lossless zlib encoder.

## Correctness evidence

```sh
npx vitest run tests/document-raster.test.ts tests/pdf-raster.test.ts
```

The integration tests convert real HWP and HWPX fixtures through the production engine with each adapter at scale 1.5. They verify every original RGB and alpha sample in the PDF streams, unchanged image and page dimensions, selection order for a reversed two-page range, and exact pixel equality after PDF.js renders the PNG and RGBA PDFs. The focused raster tests cover opaque and transparent samples, compression fallback, invalid dimensions and buffers, and compression stream backpressure.
