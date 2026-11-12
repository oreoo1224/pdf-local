import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getText } from '../src/lib/i18n';

const engines = vi.hoisted(() => ({
  validateWordFile: vi.fn(async () => 'hwp'),
  wordToPdf: vi.fn(),
  warmupBrowserHangul: vi.fn(async()=>{}),
}));

vi.mock('../src/lib/pdf', () => ({}));
vi.mock('../src/lib/word', () => engines);
vi.mock('../src/lib/hangul-browser', () => ({warmupBrowserHangul:engines.warmupBrowserHangul}));

/** A small event/attribute fixture for the production app controller. It does
 * not emulate navigation, Safari's download policy, or the native share sheet. */
class Element extends EventTarget {
  hidden = false;
  disabled = false;
  value: string | number = '';
  files: File[] = [];
  dataset: Record<string, string> = {};
  textContent = '';
  className = '';
  download = '';
  children: Element[] = [];
  attributes = new Map<string, string>();
  classList = { add() {}, remove() {}, toggle() {} };
  click = vi.fn(() => {
    if (!this.disabled) this.dispatchEvent(new Event('click'));
  });

  constructor(readonly tagName = 'div') { super(); }
  get href() { return this.getAttribute('href') ?? ''; }
  set href(value: string) { this.setAttribute('href', value); }
  get type() { return this.getAttribute('type') ?? (this.tagName === 'input' ? 'text' : ''); }
  set type(value: string) { this.setAttribute('type', value); }
  setAttribute(name: string, value: string) { this.attributes.set(name, String(value)); }
  getAttribute(name: string) { return this.attributes.get(name) ?? null; }
  hasAttribute(name: string) { return this.attributes.has(name); }
  removeAttribute(name: string) { this.attributes.delete(name); }
  append(...children: Element[]) { this.children.push(...children); }
  replaceChildren(...children: Element[]) { this.children = children; }
  focus = vi.fn();
  scrollIntoView = vi.fn();
}

function workspaceFixture() {
  // Read the actual component's IDs and static attributes so the fixture also
  // exercises its download/preview targets instead of duplicating that markup.
  const markup = readFileSync(new URL('../src/components/Workspace.astro', import.meta.url), 'utf8');
  const elements = new Map<string, Element>();
  for (const match of markup.matchAll(/<([a-z]+)\b([^>]*\bid="([^"]+)"[^>]*)>/g)) {
    const tag = match[1]!;
    const attributes = match[2]!;
    const id = match[3]!;
    const element = new Element(tag);
    for (const attribute of attributes.matchAll(/([\w-]+)="([^"]*)"/g)) {
      element.setAttribute(attribute[1]!, attribute[2]!);
    }
    element.hidden = /\bhidden(?:\s|\/?>|$)/.test(attributes);
    element.disabled = /\bdisabled(?:\s|\/?>|$)/.test(attributes);
    elements.set(id, element);
  }
  const get = (id: string) => {
    const element = elements.get(id);
    if (!element) throw new Error(`Missing workspace element: ${id}`);
    return element;
  };
  get('office-resolution').value = '1.5';

  const root = Object.assign(new Element('section'), {
    dataset: { tool: 'word-to-pdf', locale: 'en' },
    querySelector: (selector: string) => elements.get(selector.slice(1)) ?? null,
    querySelectorAll: (selector: string) => {
      const all = [...elements.values()];
      if (selector === 'button,input,select') return all.filter(element => ['button', 'input', 'select'].includes(element.tagName));
      if (selector === 'select,input[type=text]') return all.filter(element => element.tagName === 'select' || element.tagName === 'input' && element.type === 'text');
      throw new Error(`Unsupported fixture selector: ${selector}`);
    },
  });
  const document = Object.assign(new EventTarget(), {
    querySelector: (selector: string) => selector === '[data-workspace]' ? root : null,
    createElement: (tag: string) => new Element(tag),
  });
  const window = Object.assign(new EventTarget(), { Worker: class {} });
  const lifecycle = (type: 'pagehide' | 'pageshow', persisted: boolean) => {
    window.dispatchEvent(Object.assign(new Event(type), { persisted }));
  };
  return { get, root, document, window, lifecycle, markup };
}

function deferred<T = void>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((fulfill, fail) => { resolve = fulfill; reject = fail; });
  return { promise, resolve, reject };
}

describe('completed local results and mobile saving', () => {
  let fixture: ReturnType<typeof workspaceFixture>;
  let output: Blob;
  let input: File;
  let share: ReturnType<typeof vi.fn>;
  let canShare: ReturnType<typeof vi.fn>;
  let revoke: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    vi.resetModules();
    engines.validateWordFile.mockClear();
    engines.wordToPdf.mockReset();
    engines.warmupBrowserHangul.mockReset().mockResolvedValue(undefined);
    output = new Blob(['%PDF-1.7\nlocal-conversion-result'], { type: 'application/pdf' });
    const hwpBytes = new Uint8Array(readFileSync(new URL('./fixtures/simple.hwp', import.meta.url)));
    input = new File([hwpBytes.buffer], 'sample.hwp');
    engines.wordToPdf.mockResolvedValue({ blob: output, name: 'sample.pdf', pageCount: 1 });
    share = vi.fn(async () => {});
    canShare = vi.fn(() => true);
    fixture = workspaceFixture();
    vi.stubGlobal('document', fixture.document);
    vi.stubGlobal('window', fixture.window);
    vi.stubGlobal('navigator', { canShare, share });
    vi.stubGlobal('location', { pathname: '/word-to-pdf/', search: '', hash: '' });
    vi.stubGlobal('Node', Element);
    vi.stubGlobal('HTMLElement', Element);
    revoke = vi.spyOn(URL, 'revokeObjectURL');
    await import('../src/lib/app');
  });

  afterEach(() => {
    // Dispose even when an assertion fails, including real Node Blob URLs.
    fixture.lifecycle('pagehide', false);
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  async function chooseFile() {
    fixture.get('file-input').files = [input];
    fixture.get('file-input').dispatchEvent(new Event('change'));
    await vi.waitFor(() => {
      expect(fixture.get('work-area').hidden).toBe(false);
      expect(fixture.get('run-tool').disabled).toBe(false);
    });
  }

  async function convert() {
    await chooseFile();
    fixture.get('run-tool').click();
    await vi.waitFor(() => expect(fixture.get('save-local').disabled).toBe(false));
    expect(engines.wordToPdf).toHaveBeenCalledWith(input, expect.any(Object), expect.any(Function));
    return fixture.get('download').href;
  }

  function expectReady(url: string) {
    expect(fixture.get('result').hidden).toBe(false);
    expect(fixture.get('work-actions').hidden).toBe(true);
    expect(fixture.get('save-local').disabled).toBe(false);
    expect(fixture.get('save-local-hint').hidden).toBe(true);
    expect(fixture.get('download').href).toBe(url);
    expect(fixture.get('open-result').href).toBe(url);
  }

  function expectIncomplete() {
    expect(Number(fixture.get('progress').value)).toBeLessThan(100);
    expect(Number.parseInt(fixture.get('progress-value').textContent, 10)).toBeLessThan(100);
    expect(fixture.get('result').hidden).toBe(true);
    expect(fixture.get('save-local').disabled).toBe(true);
    expect(fixture.get('download').hasAttribute('href')).toBe(false);
    expect(fixture.get('open-result').hasAttribute('href')).toBe(false);
  }

  function expectConversionFailure() {
    expectIncomplete();
    expect(fixture.root.getAttribute('aria-busy')).toBe('false');
    expect(fixture.get('tool-error').hidden).toBe(false);
    expect(fixture.get('tool-error').textContent).not.toBe('');
    expect(fixture.get('tool-error').focus).toHaveBeenCalled();
    expect(fixture.get('tool-error').scrollIntoView).toHaveBeenCalled();
    expect(fixture.get('save-local-hint').hidden).toBe(false);
    expect(fixture.get('save-local-hint').textContent).toBe(getText('en').conversionFailed);
    expect(fixture.get('save-local-hint').textContent).not.toBe(getText('en').downloadPendingHelp);
    expect(fixture.get('work-area').hidden).toBe(false);
    expect(fixture.get('work-actions').hidden).toBe(false);
    expect(fixture.get('run-tool').disabled).toBe(false);
  }

  it('prepares the Hangul runtime before conversion without passing document contents',async()=>{
    await chooseFile();
    await vi.waitFor(()=>expect(engines.warmupBrowserHangul).toHaveBeenCalledOnce());
    expect(engines.warmupBrowserHangul).toHaveBeenCalledWith();
    expect(engines.wordToPdf).not.toHaveBeenCalled();
    expect(fixture.get('save-local').disabled).toBe(true);
  });

  it('keeps conversion usable when optional runtime preparation fails',async()=>{
    engines.warmupBrowserHangul.mockRejectedValueOnce(new Error('Optional preparation failed'));
    const url=await convert();
    expectReady(url);
    expect(fixture.get('tool-error').hidden).toBe(true);
  });

  it.each([
    ['office-resolution', '2'],
    ['page-range', '1'],
  ])('retains a completed result after a delayed unchanged %s event, then invalidates a real edit', async (id, editedValue) => {
    const url = await convert();
    const control = fixture.get(id);
    const previousValue = control.value;
    // Native controls can deliver a queued change after conversion has enabled
    // the form. An event by itself does not mean the converted options changed.
    await new Promise<void>(resolve => setImmediate(() => {
      control.dispatchEvent(new Event('change'));
      resolve();
    }));
    expect(control.value).toBe(previousValue);
    expectReady(url);
    expect(revoke).not.toHaveBeenCalledWith(url);

    control.value = editedValue;
    control.dispatchEvent(new Event('change'));
    expect(fixture.get('result').hidden).toBe(true);
    expect(fixture.get('work-actions').hidden).toBe(false);
    expect(fixture.get('save-local').disabled).toBe(true);
    expect(fixture.get('download').hasAttribute('href')).toBe(false);
    expect(revoke).toHaveBeenCalledWith(url);
  });

  it('reserves 100 percent for an available result when the engine reports completion before resolving', async () => {
    const pending = deferred<{ blob: Blob; name: string; pageCount: number }>();
    engines.wordToPdf.mockImplementation((_file: File, _options: unknown, progress: (value: number) => void) => {
      progress(100);
      return pending.promise;
    });
    await chooseFile();
    fixture.get('run-tool').click();
    await vi.waitFor(() => expect(engines.wordToPdf).toHaveBeenCalledOnce());

    expectIncomplete();
    expect(fixture.root.getAttribute('aria-busy')).toBe('true');
    expect(fixture.get('progress-wrap').hidden).toBe(false);

    pending.resolve({ blob: output, name: 'sample.pdf', pageCount: 1 });
    await vi.waitFor(() => expect(fixture.get('save-local').disabled).toBe(false));
    expectReady(fixture.get('download').href);
    expect(Number(fixture.get('progress').value)).toBe(100);
    expect(fixture.get('progress-value').textContent).toBe('100%');
  });

  it('shows a result preparation failure beside the controls and allows retrying the retained source', async () => {
    await chooseFile();
    vi.spyOn(URL, 'createObjectURL').mockImplementationOnce(() => { throw new Error('Blob URL allocation failed'); });
    fixture.get('run-tool').click();
    await vi.waitFor(() => expect(fixture.get('tool-error').hidden).toBe(false));

    expectConversionFailure();
    // Keep the alert next to the progress/actions the user is watching. The
    // fixture reads production markup, while Node has no layout or scrolling.
    const alertPosition = fixture.markup.indexOf('id="tool-error"');
    expect(alertPosition).toBeGreaterThan(fixture.markup.indexOf('id="progress-wrap"'));
    expect(alertPosition).toBeLessThan(fixture.markup.indexOf('id="work-actions"'));

    fixture.get('run-tool').click();
    await vi.waitFor(() => expect(fixture.get('save-local').disabled).toBe(false));
    expectReady(fixture.get('download').href);
    expect(fixture.get('tool-error').hidden).toBe(true);
    expect(engines.wordToPdf).toHaveBeenLastCalledWith(input, expect.any(Object), expect.any(Function));
    expect(Number(fixture.get('progress').value)).toBe(100);
  });

  it('shows a conversion rejection after engine completion without claiming 100 percent', async () => {
    const pending = deferred<{ blob: Blob; name: string; pageCount: number }>();
    engines.wordToPdf.mockImplementation((_file: File, _options: unknown, progress: (value: number) => void) => {
      progress(100);
      return pending.promise;
    });
    await chooseFile();
    fixture.get('run-tool').click();
    await vi.waitFor(() => expect(engines.wordToPdf).toHaveBeenCalledOnce());
    expectIncomplete();

    pending.reject(new Error('Late renderer cleanup failure'));
    await vi.waitFor(() => expect(fixture.get('tool-error').hidden).toBe(false));
    expectConversionFailure();
  });

  it('keeps the completed file and both links when returning from a cached preview', async () => {
    const url = await convert();
    expectReady(url);
    fixture.get('save-local').click();
    expect(fixture.get('download').click).toHaveBeenCalledOnce();
    expect(fixture.get('download').getAttribute('target')).toBe('_blank');
    expect(fixture.get('open-result').getAttribute('target')).toBe('_blank');

    fixture.lifecycle('pagehide', true);
    fixture.lifecycle('pageshow', true);

    expectReady(url);
    expect(revoke).not.toHaveBeenCalledWith(url);
    // Editing and running again demonstrates that the selected source survived,
    // independently of how the controller renders its file list or summary.
    fixture.get('edit-again').click();
    engines.wordToPdf.mockClear();
    fixture.get('run-tool').click();
    await vi.waitFor(() => expect(fixture.get('save-local').disabled).toBe(false));
    expect(engines.wordToPdf).toHaveBeenCalledWith(input, expect.any(Object), expect.any(Function));
    const replacementUrl = fixture.get('download').href;
    expect(replacementUrl).not.toBe(url);
    fixture.get('start-over').click();
    expect(revoke).toHaveBeenCalledWith(replacementUrl);
    expect(fixture.get('download').hasAttribute('href')).toBe(false);
    expect(fixture.get('save-local').disabled).toBe(true);
  });

  it('releases the completed URL on actual page disposal', async () => {
    const url = await convert();
    fixture.lifecycle('pagehide', false);
    expect(revoke).toHaveBeenCalledWith(url);
    expect(fixture.get('download').hasAttribute('href')).toBe(false);
    expect(fixture.get('open-result').hasAttribute('href')).toBe(false);
    expect(fixture.get('save-local').disabled).toBe(true);
  });

  it('passes the actual named PDF to native sharing synchronously with the tap', async () => {
    const url = await convert();
    expect(fixture.get('share-result').hidden).toBe(false);
    fixture.get('share-result').click();
    // No await before this assertion: share must run within the click callback.
    expect(share).toHaveBeenCalledOnce();
    const shared = share.mock.calls[0]![0].files[0] as File;
    expect(shared).toBeInstanceOf(File);
    expect(shared.name).toBe('sample.pdf');
    expect(shared.type).toBe('application/pdf');
    expect(await shared.arrayBuffer()).toEqual(await output.arrayBuffer());
    await vi.waitFor(() => expect(fixture.get('share-result').disabled).toBe(false));
    expectReady(url);
  });

  it('keeps a cancelled share ready without an error', async () => {
    share.mockRejectedValue(new DOMException('User cancelled', 'AbortError'));
    const url = await convert();
    fixture.get('share-result').click();
    await vi.waitFor(() => expect(fixture.get('share-result').disabled).toBe(false));
    expectReady(url);
    expect(fixture.get('save-error').hidden).toBe(true);
    expect(revoke).not.toHaveBeenCalledWith(url);
  });

  it('retains download and preview after native sharing fails', async () => {
    share.mockRejectedValue(new DOMException('Sharing denied', 'NotAllowedError'));
    const url = await convert();
    fixture.get('share-result').click();
    await vi.waitFor(() => expect(fixture.get('save-error').hidden).toBe(false));
    expectReady(url);
    expect(revoke).not.toHaveBeenCalledWith(url);
    fixture.get('save-local').click();
    expect(fixture.get('download').click).toHaveBeenCalledOnce();
  });

  it('does not restore a result or show its late share error after starting over', async () => {
    const pending = deferred();
    share.mockReturnValue(pending.promise);
    const url = await convert();
    fixture.get('share-result').click();
    expect(share).toHaveBeenCalledOnce();
    fixture.get('start-over').click();
    pending.reject(new Error('Late platform failure'));
    await pending.promise.catch(() => {});
    await new Promise<void>(resolve => setImmediate(resolve));

    expect(revoke).toHaveBeenCalledWith(url);
    expect(fixture.get('result').hidden).toBe(true);
    expect(fixture.get('save-local').disabled).toBe(true);
    expect(fixture.get('download').hasAttribute('href')).toBe(false);
    expect(fixture.get('open-result').hasAttribute('href')).toBe(false);
    expect(fixture.get('save-error').hidden).toBe(true);
    expect(fixture.get('save-error').textContent).toBe('');
  });

  it('keeps ordinary saving available when native file sharing is unsupported', async () => {
    canShare.mockReturnValue(false);
    const url = await convert();
    expectReady(url);
    expect(fixture.get('share-result').hidden).toBe(true);
    fixture.get('save-local').click();
    expect(fixture.get('download').click).toHaveBeenCalledOnce();
    expect(share).not.toHaveBeenCalled();
  });
});
