import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

interface FontRecord {
  family: string;
  status: string;
}

function fontEnvironment(existing: FontRecord[] = []) {
  const fonts = new Set<FontRecord>(existing);
  const created: TestFontFace[] = [];
  class TestFontFace {
    status = 'unloaded';
    load = vi.fn(async () => {
      this.status = 'loaded';
      return this;
    });

    constructor(
      readonly family: string,
      readonly source: ArrayBuffer,
      readonly descriptors: FontFaceDescriptors,
    ) {
      created.push(this);
    }
  }
  const bytes = new Uint8Array([0, 1, 2, 3]).buffer;
  const fetchFont = vi.fn(async (_input: RequestInfo | URL) => ({ ok: true, arrayBuffer: async () => bytes }));
  vi.stubGlobal('FontFace', TestFontFace);
  vi.stubGlobal('document', { fonts });
  vi.stubGlobal('window', { location: { href: 'https://pdf.example/ko/word-to-pdf/' } });
  vi.stubGlobal('fetch', fetchFont);
  return { fonts, created, bytes, fetchFont };
}

beforeEach(() => vi.resetModules());
afterEach(() => vi.unstubAllGlobals());

describe('shared local document fonts', () => {
  it('shares one font request between concurrent adapter calls and retains both aliases', async () => {
    const environment = fontEnvironment();
    let finishFetch!: (response: { ok: boolean; arrayBuffer: () => Promise<ArrayBuffer> }) => void;
    environment.fetchFont.mockImplementationOnce(() => new Promise(resolve => { finishFetch = resolve; }));
    const { loadDocumentFonts } = await import('../src/lib/document-fonts');

    const first = loadDocumentFonts();
    const second = loadDocumentFonts();
    expect(environment.fetchFont).toHaveBeenCalledTimes(1);
    finishFetch({ ok: true, arrayBuffer: async () => environment.bytes });
    await Promise.all([first, second]);
    await loadDocumentFonts();

    expect(environment.fetchFont).toHaveBeenCalledTimes(1);
    expect(environment.created.map(face => face.family)).toEqual(['Noto Sans KR', 'Noto Serif KR']);
    for (const face of environment.created) {
      expect(face.source).toBe(environment.bytes);
      expect(face.descriptors).toEqual({ weight: '100 900' });
      expect(face.load).toHaveBeenCalledTimes(1);
      expect(environment.fonts.has(face)).toBe(true);
      expect(face.status).toBe('loaded');
    }
    const request = environment.fetchFont.mock.calls[0]?.[0];
    expect(new URL(String(request), 'https://pdf.example/').origin).toBe('https://pdf.example');
    expect(new URL(String(request), 'https://pdf.example/').pathname).toMatch(/\/fonts\/NotoSansKR\.ttf$/);
  });

  it('uses already loaded aliases without requesting the font again', async () => {
    const environment = fontEnvironment([
      { family: '"Noto Sans KR"', status: 'loaded' },
      { family: "'Noto Serif KR'", status: 'loaded' },
    ]);
    const { loadDocumentFonts } = await import('../src/lib/document-fonts');

    await loadDocumentFonts();

    expect(environment.fetchFont).not.toHaveBeenCalled();
    expect(environment.created).toEqual([]);
  });

  it('loads a missing alias while preserving an already loaded one', async () => {
    const environment = fontEnvironment([{ family: 'Noto Sans KR', status: 'loaded' }]);
    const { loadDocumentFonts } = await import('../src/lib/document-fonts');

    await loadDocumentFonts();

    expect(environment.fetchFont).toHaveBeenCalledTimes(1);
    expect(environment.created.map(face => face.family)).toEqual(['Noto Serif KR']);
  });

  it('allows a later conversion to retry a failed font request', async () => {
    const environment = fontEnvironment();
    environment.fetchFont.mockResolvedValueOnce({ ok: false, arrayBuffer: async () => environment.bytes });
    const { loadDocumentFonts } = await import('../src/lib/document-fonts');

    await expect(loadDocumentFonts()).rejects.toMatchObject({ code: 'officeRender' });
    await expect(loadDocumentFonts()).resolves.toBeUndefined();

    expect(environment.fetchFont).toHaveBeenCalledTimes(2);
    expect(environment.created.map(face => face.family)).toEqual(['Noto Sans KR', 'Noto Serif KR']);
  });

  it('continues without font requests when FontFace is unavailable', async () => {
    const environment = fontEnvironment();
    vi.stubGlobal('FontFace', undefined);
    const { loadDocumentFonts } = await import('../src/lib/document-fonts');

    await expect(loadDocumentFonts()).resolves.toBeUndefined();

    expect(environment.fetchFont).not.toHaveBeenCalled();
  });
});
