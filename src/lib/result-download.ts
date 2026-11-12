/** Local file sharing supplements the ordinary download link, without uploads. */
export interface FileShareTarget {
  canShare?: (data: ShareData) => boolean;
  share?: (data: ShareData) => Promise<void>;
}

export type ShareResult = 'shared' | 'cancelled' | 'unavailable' | 'failed';

const browserShareTarget = (): FileShareTarget => typeof navigator === 'undefined' ? {} : navigator;

export function createShareFile(blob: Blob, name: string): File | undefined {
  try {
    // Wrapping the existing Blob avoids a base64 or arrayBuffer copy of the output.
    return new File([blob], name, { type: blob.type || 'application/octet-stream' });
  } catch {
    // Older browsers can still use the ordinary Blob download/preview links.
    return undefined;
  }
}

export function canShareFile(file: File | undefined, target: FileShareTarget = browserShareTarget()): boolean {
  if (!file || typeof target.share !== 'function' || typeof target.canShare !== 'function') return false;
  try { return target.canShare({ files: [file] }); }
  catch { return false; }
}

export async function shareResultFile(file: File | undefined, target: FileShareTarget = browserShareTarget()): Promise<ShareResult> {
  if (!file || !canShareFile(file, target)) return 'unavailable';
  try {
    // Call share before the first await so a button tap's user activation is retained.
    await target.share!({ files: [file] });
    return 'shared';
  } catch (error) {
    if (error && typeof error === 'object' && 'name' in error && error.name === 'AbortError') return 'cancelled';
    return 'failed';
  }
}
