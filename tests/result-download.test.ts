import { afterEach, describe, expect, it, vi } from 'vitest';
import { canShareFile, createShareFile, shareResultFile, type FileShareTarget } from '../src/lib/result-download';

afterEach(()=>vi.unstubAllGlobals());

describe('sharing generated files without re-reading or uploading them',()=>{
  it('preserves PDF bytes, MIME type and the Unicode download filename',async()=>{
    const blob=new Blob(['%PDF-1.7\nlocal-result'],{type:'application/pdf'});
    const file=createShareFile(blob,'연습문제 풀이 및 해답.pdf')!;
    expect(file.name).toBe('연습문제 풀이 및 해답.pdf');
    expect(file.type).toBe('application/pdf');
    expect(file.size).toBe(blob.size);
    expect(await file.text()).toBe(await blob.text());
  });

  it('checks the actual ZIP file rather than assuming PDF sharing implies ZIP support',async()=>{
    const file=createShareFile(new Blob(['zip'],{type:'application/zip'}),'pages.zip')!;
    const target:FileShareTarget={canShare:data=>data.files?.[0]?.type==='application/pdf',share:vi.fn()};
    expect(canShareFile(file,target)).toBe(false);
    expect(await shareResultFile(file,target)).toBe('unavailable');
    expect(target.share).not.toHaveBeenCalled();
  });

  it('calls the native share method synchronously with its receiver intact',async()=>{
    const file=createShareFile(new Blob(['%PDF'],{type:'application/pdf'}),'result.pdf')!;
    let called=false;
    const target:FileShareTarget={
      canShare(data){expect(this).toBe(target);expect(data.files).toEqual([file]);return true;},
      share(data){expect(this).toBe(target);expect(data).toEqual({files:[file]});called=true;return Promise.resolve();},
    };
    const pending=shareResultFile(file,target);
    expect(called).toBe(true);
    expect(await pending).toBe('shared');
  });

  it.each(['AbortError','NotAllowedError','TypeError'])(
    'handles a native %s rejection without throwing or claiming the file was saved',async name=>{
      const file=createShareFile(new Blob(['pdf'],{type:'application/pdf'}),'result.pdf')!;
      const error=Object.assign(new Error('Native sharing stopped'),{name});
      const target:FileShareTarget={canShare:()=>true,share:()=>Promise.reject(error)};
      expect(await shareResultFile(file,target)).toBe(name==='AbortError'?'cancelled':'failed');
    },
  );

  it('keeps ordinary downloading usable when file-sharing capabilities are missing or throw',async()=>{
    const file=createShareFile(new Blob(['pdf']),'result.pdf')!;
    for(const target of [{},{share:vi.fn()},{canShare:()=>{throw new Error('Unsupported file');},share:vi.fn()}]){
      expect(canShareFile(file,target)).toBe(false);
      expect(await shareResultFile(file,target)).toBe('unavailable');
      if('share' in target)expect(target.share).not.toHaveBeenCalled();
    }
    expect(canShareFile(undefined,{canShare:()=>true,share:vi.fn()})).toBe(false);
  });

  it('does not break result generation in browsers without a working File constructor',()=>{
    vi.stubGlobal('File',class {constructor(){throw new Error('File constructor unavailable');}});
    expect(createShareFile(new Blob(['pdf']),'result.pdf')).toBeUndefined();
  });
});
