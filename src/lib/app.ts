import { getText, type Locale, type Tool } from './i18n';

const language = document.querySelector<HTMLSelectElement>('#site-language');
try {
  const remembered = localStorage.getItem('pdfroom-language');
  if (location.pathname === '/' && remembered && ['ko', 'es', 'ja'].includes(remembered)) location.replace(`/${remembered}/`);
} catch { /* Direct URLs and all tools work with storage disabled. */ }
language?.addEventListener('change', () => {
  try { localStorage.setItem('pdfroom-language', language.selectedOptions[0]?.lang || 'en'); } catch { /* Storage is optional. */ }
  location.assign(language.value);
});

const root = document.querySelector<HTMLElement>('[data-workspace]');
if (root) initialize(root);

function initialize(root: HTMLElement) {
  const tool = root.dataset.tool as Tool;
  const d = getText(root.dataset.locale as Locale);
  const get = <T extends HTMLElement = HTMLElement>(id: string) => root.querySelector<T>(`#${id}`)!;
  const fileInput = get<HTMLInputElement>('file-input');
  const dropZone = get('drop-zone');
  const workArea = get('work-area');
  const errorBox = get('tool-error');
  const list = get<HTMLOListElement>('file-list');
  const grid = get('pages-grid');
  const progressWrap = get('progress-wrap');
  const result = get('result');
  const download = get<HTMLAnchorElement>('download');
  const isImage = tool === 'jpg-to-pdf';
  const multi = isImage || tool === 'merge-pdf';
  let files: Array<{ file: File; count: number; thumbnail?: string }> = [];
  let pages: Array<{ index: number; rotation: number; url?: string }> = [];
  const selected = new Set<number>();
  const deleted = new Set<number>();
  let busy = false;
  let revision = 0;
  let resultUrl: string | undefined;
  let previewAbort: AbortController | undefined;
  let previewCleanup: (() => void) | undefined;
  let draggedFile: number | undefined;
  let draggedPage: number | undefined;

  const sizeLabel = (bytes: number) => `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  const nameStem = (name: string) => name.replace(/\.[^.]+$/, '').replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').slice(0, 100) || 'document';
  function showError(error: unknown) {
    const code = typeof error === 'string' ? error : error && typeof error === 'object' && 'code' in error ? String(error.code) : 'unknown';
    errorBox.textContent = d.errors[code as keyof typeof d.errors] || d.errors.unknown;
    errorBox.hidden = false;
  }
  function clearError() { errorBox.hidden = true; errorBox.textContent = ''; }
  function invalidateResult() {
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    resultUrl = undefined;
    download.removeAttribute('href');
    result.hidden = true;
    get('work-actions').hidden = false;
  }
  function updateControls() {
    if (busy) return;
    get<HTMLButtonElement>('run-tool').disabled = files.length === 0 || (tool === 'merge-pdf' && files.length < 2);
    if (tool === 'organize-pdf') {
      const active = pages.filter(page => !deleted.has(page.index));
      const activeSelected = active.filter(page => selected.has(page.index));
      get<HTMLButtonElement>('extract-selected').disabled = activeSelected.length === 0;
      get<HTMLButtonElement>('delete-selected').disabled = activeSelected.length === 0 || activeSelected.length === active.length;
      get<HTMLButtonElement>('rotate-selected').disabled = activeSelected.length === 0;
      get<HTMLButtonElement>('zip-pages').disabled = active.length === 0;
    }
    get<HTMLButtonElement>('add-files').hidden = !multi;
    if (tool === 'pdf-to-jpg') get<HTMLInputElement>('quality').disabled=get<HTMLSelectElement>('output-format').value==='png';
  }
  function setBusy(value: boolean) {
    busy = value;
    root.setAttribute('aria-busy', String(value));
    root.querySelectorAll<HTMLButtonElement | HTMLInputElement | HTMLSelectElement>('button,input,select').forEach(el => { el.disabled = value; });
    progressWrap.hidden = !value;
    if (!value) {
      renderFiles();
      if (tool === 'organize-pdf') renderPages();
      updateControls();
    }
  }
  function progress(value: number) {
    const percent = Math.max(0, Math.min(100, Math.round(value)));
    get<HTMLProgressElement>('progress').value = percent;
    get('progress-value').textContent = `${percent}%`;
  }
  function showResult(blob: Blob, name: string) {
    invalidateResult();
    resultUrl = URL.createObjectURL(blob);
    download.href = resultUrl;
    download.download = name;
    get('result-name').textContent = `${name} · ${sizeLabel(blob.size)}`;
    result.hidden = false;
    get('work-actions').hidden = true;
    download.focus();
  }
  function cleanup() {
    revision++;
    previewAbort?.abort();
    previewAbort = undefined;
    previewCleanup?.();
    previewCleanup = undefined;
    files.forEach(entry => { if (entry.thumbnail) URL.revokeObjectURL(entry.thumbnail); });
    pages.forEach(page => { if (page.url) URL.revokeObjectURL(page.url); });
    invalidateResult();
  }
  function reset() {
    cleanup(); files = []; pages = []; selected.clear(); deleted.clear();
    list.replaceChildren(); grid?.replaceChildren();
    fileInput.value = ''; workArea.hidden = true; dropZone.hidden = false;
    clearError(); setBusy(false);
    get<HTMLButtonElement>('choose-files').focus();
  }
  function makeButton(text: string, label: string, action: () => void, disabled = false) {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'icon-button'; button.textContent = text;
    button.title = label; button.setAttribute('aria-label', label); button.disabled = disabled;
    button.addEventListener('click', action); return button;
  }
  function moveFile(index: number, target: number) {
    if (busy || target < 0 || target >= files.length || index === target) return;
    const entry = files.splice(index, 1)[0]!; files.splice(target, 0, entry);
    invalidateResult(); renderFiles();
  }
  function renderFiles() {
    list.replaceChildren();
    files.forEach((entry, index) => {
      const li = document.createElement('li'); li.className = 'file-item'; li.draggable = multi;
      if (entry.thumbnail) {
        const img = document.createElement('img'); img.className = 'file-thumb'; img.src = entry.thumbnail; img.alt = ''; img.loading = 'lazy';
        li.append(img);
      }
      const info = document.createElement('div'); info.className = 'file-info';
      const name = document.createElement('div'); name.className = 'file-name'; name.textContent = entry.file.name;
      const detail = document.createElement('div'); detail.className = 'file-detail';
      detail.textContent = `${sizeLabel(entry.file.size)}${isImage ? '' : ` · ${entry.count} ${d.pages}`}`;
      info.append(name, detail); li.append(info);
      const controls = document.createElement('div'); controls.className = 'file-controls';
      if (multi) controls.append(
        makeButton('↑', d.moveUp, () => moveFile(index, index - 1), index === 0),
        makeButton('↓', d.moveDown, () => moveFile(index, index + 1), index === files.length - 1),
      );
      controls.append(makeButton('×', `${d.remove}: ${entry.file.name}`, () => {
        if (busy) return;
        if (entry.thumbnail) URL.revokeObjectURL(entry.thumbnail);
        files.splice(index, 1); invalidateResult();
        if (!files.length) reset(); else renderFiles();
      }));
      li.append(controls);
      li.addEventListener('dragstart', event => {
        if (busy || !multi) { event.preventDefault(); return; }
        draggedFile = index; event.dataTransfer?.setData('application/x-pdfroom-file', String(index)); li.classList.add('dragging');
      });
      li.addEventListener('dragend', () => { draggedFile = undefined; li.classList.remove('dragging'); });
      li.addEventListener('dragover', event => { if (draggedFile !== undefined) event.preventDefault(); });
      li.addEventListener('drop', event => {
        if (draggedFile === undefined) return;
        event.preventDefault(); event.stopPropagation(); moveFile(draggedFile, index); draggedFile = undefined;
      });
      list.append(li);
    });
    get('file-summary').textContent = `${files.length} ${d.files}${isImage ? '' : ` · ${files.reduce((sum,entry)=>sum+entry.count,0)} ${d.pages}`}`;
    updateControls();
  }
  function movePage(position: number, target: number) {
    if (busy || target < 0 || target >= pages.length || position === target) return;
    const page = pages.splice(position, 1)[0]!; pages.splice(target, 0, page);
    invalidateResult(); renderPages();
  }
  function toggleDeleted(index: number) {
    if (busy) return;
    if (deleted.has(index)) deleted.delete(index);
    else {
      if (deleted.size >= pages.length - 1) { showError('emptyPages'); return; }
      deleted.add(index); selected.delete(index);
    }
    clearError(); invalidateResult(); renderPages();
  }
  function renderPages() {
    if (!grid) return;
    grid.replaceChildren();
    pages.forEach((page, position) => {
      const tile = document.createElement('div');
      tile.className = `page-tile${selected.has(page.index) ? ' is-selected' : ''}${deleted.has(page.index) ? ' is-deleted' : ''}`;
      tile.draggable = !busy;
      const preview = document.createElement('div'); preview.className = 'page-preview';
      if (page.url) {
        const image = document.createElement('img'); image.src = page.url; image.alt = `${d.page} ${page.index + 1}`; image.loading = 'lazy'; image.draggable = false;
        image.style.transform = `rotate(${page.rotation}deg) scale(${page.rotation % 180 ? 0.65 : 1})`; preview.append(image);
      } else { preview.textContent = '…'; }
      const label = document.createElement('label');
      const check = document.createElement('input'); check.type = 'checkbox'; check.checked = selected.has(page.index); check.disabled = deleted.has(page.index) || busy;
      check.addEventListener('change', () => {
        if (check.checked) selected.add(page.index); else selected.delete(page.index);
        tile.classList.toggle('is-selected', check.checked); invalidateResult(); updateControls();
      });
      label.append(check, document.createTextNode(`${d.page} ${page.index + 1}${deleted.has(page.index)?` · ${d.deleted}`:''}`));
      const controls = document.createElement('div'); controls.className = 'page-actions';
      controls.append(
        makeButton('←', d.moveUp, () => movePage(position, position - 1), position === 0 || busy),
        makeButton('→', d.moveDown, () => movePage(position, position + 1), position === pages.length - 1 || busy),
        makeButton('↻', `${d.rotateBy} 90°`, () => { if(busy)return; page.rotation=(page.rotation+90)%360; invalidateResult(); renderPages(); }, busy || deleted.has(page.index)),
        makeButton(deleted.has(page.index)?'↶':'×', deleted.has(page.index)?d.restore:d.remove, () => toggleDeleted(page.index), busy),
      );
      tile.append(preview, label, controls);
      tile.addEventListener('dragstart', event => {
        if (busy || (event.target instanceof HTMLElement && event.target.closest('button,input'))) { event.preventDefault(); return; }
        draggedPage = position; event.dataTransfer?.setData('application/x-pdfroom-page',String(position));
      });
      tile.addEventListener('dragend', () => { draggedPage = undefined; });
      tile.addEventListener('dragover', event => { if(draggedPage!==undefined)event.preventDefault(); });
      tile.addEventListener('drop', event => {
        if(draggedPage===undefined)return;
        event.preventDefault(); event.stopPropagation(); movePage(draggedPage,position); draggedPage=undefined;
      });
      grid.append(tile);
    });
    updateControls();
  }
  async function addFiles(incoming: File[]) {
    if (busy || !incoming.length) return;
    clearError();
    if (!multi && incoming.length !== 1) { showError('needOne'); return; }
    const prospective = multi ? [...files.map(entry => entry.file), ...incoming] : incoming;
    if (prospective.length > 30) { showError('tooManyFiles'); return; }
    if (incoming.some(file => file.size > 50 * 1024 * 1024)) { showError('fileSize'); return; }
    if (prospective.reduce((sum,file)=>sum+file.size,0) > 100 * 1024 * 1024) { showError('totalSize'); return; }
    const current = ++revision;
    setBusy(true); progress(0);
    try {
      const engine = await import('./pdf');
      const accepted: typeof files = [];
      for (let i=0;i<incoming.length;i++) {
        const file = incoming[i]!;
        if (isImage) {
          await engine.validateImageFile(file);
          accepted.push({file,count:1});
        } else {
          const metadata=await engine.inspectPdf(file);
          if (tool==='organize-pdf' && metadata.pageCount>200) throw {code:'tooManyPages'};
          accepted.push({file,count:metadata.pageCount});
        }
        progress(Math.round((i+1)/incoming.length*100));
      }
      if (current!==revision) return;
      invalidateResult();
      if (!multi) {
        previewAbort?.abort(); previewCleanup?.(); previewCleanup=undefined;
        pages.forEach(page=>{if(page.url)URL.revokeObjectURL(page.url);});
        pages=[]; selected.clear(); deleted.clear(); files=accepted;
      } else files.push(...accepted);
      if (isImage) accepted.forEach(entry=>{entry.thumbnail=URL.createObjectURL(entry.file);});
      dropZone.hidden=true; workArea.hidden=false; renderFiles();
      if (tool==='organize-pdf') {
        pages=Array.from({length:files[0]!.count},(_,index)=>({index,rotation:0}));
        renderPages(); progress(0); get('progress-text').textContent=d.loadingPreview;
        previewAbort=new AbortController();
        const {renderThumbnails}=await import('./pdf-render');
        const preview=await renderThumbnails(files[0]!.file,page=>{
          if(current!==revision){URL.revokeObjectURL(page.url);return;}
          const state=pages.find(item=>item.index===page.index);
          if(state)state.url=page.url;
          // Update the single tile, keeping keyboard focus and checkbox state stable.
          const tile=grid.children[page.index];
          const area=tile?.querySelector('.page-preview');
          if(area){const img=document.createElement('img');img.src=page.url;img.alt=`${d.page} ${page.index+1}`;img.loading='lazy';img.draggable=false;area.replaceChildren(img);}
          progress((page.index+1)/files[0]!.count*100);
        },previewAbort.signal);
        if(current===revision)previewCleanup=preview.cleanup; else preview.cleanup();
      }
    } catch(error) {
      if(current===revision)showError(error);
    } finally {
      if(current===revision){setBusy(false);get('progress-text').textContent=d.processing;}
      fileInput.value='';
    }
  }
  async function run(extract = false, zip = false) {
    if(busy||!files.length)return;
    const current=revision;
    clearError(); invalidateResult(); setBusy(true); progress(0);
    try {
      const engine=await import('./pdf');
      let blob:Blob; let name:string;
      if(tool==='merge-pdf') {
        if(files.length<2)throw {code:'needTwo'};
        blob=await engine.mergePdfs(files.map(entry=>entry.file),progress);name='merged.pdf';
      } else if(tool==='organize-pdf') {
        const outputPages=pages.filter(page=>!deleted.has(page.index)&&(!extract||selected.has(page.index))).map(({index,rotation})=>({index,rotation}));
        if(zip){const output=await engine.splitToZip(files[0]!.file,outputPages,progress);blob=output.blob;name=output.name;}
        else {blob=await engine.organizePdf(files[0]!.file,outputPages);name=`${nameStem(files[0]!.file.name)}-${extract?'extracted':'edited'}.pdf`;}
      } else if(tool==='jpg-to-pdf') {
        blob=await engine.imagesToPdf(files.map(entry=>entry.file),{
          paper:get<HTMLSelectElement>('paper').value as 'a4'|'letter'|'original',
          orientation:get<HTMLSelectElement>('orientation').value as 'auto'|'portrait'|'landscape',
          margin:Number(get<HTMLSelectElement>('margin').value),fit:get<HTMLSelectElement>('fit').value as 'contain'|'cover',
        },progress);name='images.pdf';
      } else {
        const {pdfToImages}=await import('./pdf-render');
        const output=await pdfToImages(files[0]!.file,{
          format:get<HTMLSelectElement>('output-format').value as 'jpg'|'png',
          scale:Number(get<HTMLSelectElement>('resolution').value),quality:Number(get<HTMLInputElement>('quality').value)/100,
          range:get<HTMLInputElement>('page-range').value,
        },progress);blob=output.blob;name=output.name;
      }
      if(current===revision){progress(100);showResult(blob,name);}
    } catch(error){if(current===revision)showError(error);}
    finally{if(current===revision)setBusy(false);}
  }

  get('choose-files').addEventListener('click',()=>fileInput.click());
  get('add-files').addEventListener('click',()=>fileInput.click());
  fileInput.addEventListener('change',()=>{void addFiles(Array.from(fileInput.files||[]));});
  get('clear-files').addEventListener('click',reset);
  get('start-over').addEventListener('click',reset);
  get('edit-again').addEventListener('click',()=>{invalidateResult();get<HTMLButtonElement>('run-tool').focus();});
  get('run-tool').addEventListener('click',()=>{void run();});
  root.addEventListener('dragover',event=>{
    if(!event.dataTransfer?.types.includes('Files'))return;
    event.preventDefault();if(!busy)dropZone.classList.add('drag-over');
  });
  root.addEventListener('dragleave',event=>{if(!root.contains(event.relatedTarget as Node))dropZone.classList.remove('drag-over');});
  root.addEventListener('drop',event=>{
    if(!event.dataTransfer?.files.length)return;
    event.preventDefault();dropZone.classList.remove('drag-over');void addFiles(Array.from(event.dataTransfer.files));
  });
  if(tool==='organize-pdf') {
    get('select-all').addEventListener('click',()=>{pages.forEach(page=>{if(!deleted.has(page.index))selected.add(page.index);});invalidateResult();renderPages();});
    get('deselect-all').addEventListener('click',()=>{selected.clear();invalidateResult();renderPages();});
    get('apply-range').addEventListener('click',async()=>{
      clearError();
      try{const {parsePageRange}=await import('./pdf');const indices=parsePageRange(get<HTMLInputElement>('page-range').value,pages.length);selected.clear();indices.forEach(index=>{if(!deleted.has(index))selected.add(index);});invalidateResult();renderPages();}
      catch(error){showError(error);}
    });
    get('delete-selected').addEventListener('click',()=>{
      const removal=pages.filter(page=>selected.has(page.index)&&!deleted.has(page.index));
      if(deleted.size+removal.length>=pages.length){showError('emptyPages');return;}
      removal.forEach(page=>deleted.add(page.index));selected.clear();invalidateResult();renderPages();
    });
    const rotate=(all:boolean)=>{
      const angle=Number(get<HTMLSelectElement>('rotation-angle').value);
      pages.forEach(page=>{if(!deleted.has(page.index)&&(all||selected.has(page.index)))page.rotation=(page.rotation+angle)%360;});
      invalidateResult();renderPages();
    };
    get('rotate-selected').addEventListener('click',()=>rotate(false));
    get('rotate-all').addEventListener('click',()=>rotate(true));
    get('extract-selected').addEventListener('click',()=>{void run(true);});
    get('zip-pages').addEventListener('click',()=>{void run(false,true);});
  }
  if(tool==='pdf-to-jpg') {
    get('quality').addEventListener('input',()=>{get('quality-value').textContent=`${get<HTMLInputElement>('quality').value}%`;invalidateResult();});
    get('output-format').addEventListener('change',()=>{
      get<HTMLInputElement>('quality').disabled=get<HTMLSelectElement>('output-format').value==='png';invalidateResult();
    });
  }
  root.querySelectorAll('select,input[type=text]').forEach(control=>control.addEventListener('change',()=>{if(!busy)invalidateResult();}));
  window.addEventListener('pagehide',cleanup);
  window.addEventListener('pageshow',event=>{if(event.persisted)reset();});
  if(!('Worker' in window)||!('createObjectURL' in URL))showError('unsupportedBrowser');
  updateControls();
}
