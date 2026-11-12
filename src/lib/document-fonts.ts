import { OfficeToolError } from './office-errors';

let fontPromise: Promise<void> | undefined;

/** Both document renderers use the same local fonts for layout and painting. */
export async function loadDocumentFonts(): Promise<void> {
  if (typeof FontFace === 'undefined' || typeof document === 'undefined' || !document.fonts) return;
  fontPromise ??= (async () => {
    const existing = Array.from(document.fonts).filter(face => face.status === 'loaded').map(face => face.family.replace(/["']/g, ''));
    const families = ['Noto Sans KR', 'Noto Serif KR'].filter(family => !existing.includes(family));
    if (!families.length) return;
    const response = await fetch(new URL(`${import.meta.env.BASE_URL}fonts/NotoSansKR.ttf`, window.location.href));
    if (!response.ok) throw new OfficeToolError('officeRender');
    const bytes = await response.arrayBuffer();
    // Preserve both regional fallback aliases, including the sans substitute
    // for an unavailable CJK serif face, without another font request.
    for (const family of families) {
      const face = new FontFace(family, bytes, { weight: '100 900' });
      await face.load();
      document.fonts.add(face);
    }
  })().catch(error => { fontPromise = undefined; throw error; });
  return fontPromise;
}
