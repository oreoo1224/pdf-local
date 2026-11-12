import { describe, expect, it, vi } from 'vitest';
import { readValidatedDocument } from '../src/lib/document-input';

describe('reuse checks only for the same immutable document',()=>{
  it('avoids duplicate validation on conversion and reads the same original bytes',async()=>{
    const file=new File(['original input'],'sample.hwp');
    const validate=vi.fn(async(bytes:Uint8Array)=>{expect(new TextDecoder().decode(bytes)).toBe('original input');});
    await readValidatedDocument(file,'hwp',validate);
    const converted=await readValidatedDocument(file,'hwp',validate);
    expect(validate).toHaveBeenCalledOnce();
    expect(new TextDecoder().decode(converted)).toBe('original input');
  });

  it('checks a new File even when its name and size match an accepted file',async()=>{
    const validate=vi.fn(async(bytes:Uint8Array)=>{if(new TextDecoder().decode(bytes)==='bad')throw new Error('invalid document');});
    await readValidatedDocument(new File(['yes'],'same.hwp'),'hwp',validate);
    await expect(readValidatedDocument(new File(['bad'],'same.hwp'),'hwp',validate)).rejects.toThrow('invalid document');
    expect(validate).toHaveBeenCalledTimes(2);
  });

  it('does not turn a failed check into permission to skip validation on retry',async()=>{
    const file=new File(['bytes'],'broken.hwp');
    const validate=vi.fn(async()=>{throw new Error('invalid document');});
    await expect(readValidatedDocument(file,'hwp',validate)).rejects.toThrow('invalid document');
    await expect(readValidatedDocument(file,'hwp',validate)).rejects.toThrow('invalid document');
    expect(validate).toHaveBeenCalledTimes(2);
  });

  it('keeps format checks independent and deduplicates concurrent work',async()=>{
    const file=new File(['bytes'],'sample.hwp');
    const validate=vi.fn(async()=>{});
    await Promise.all([readValidatedDocument(file,'hwp',validate),readValidatedDocument(file,'hwp',validate)]);
    expect(validate).toHaveBeenCalledOnce();
    await readValidatedDocument(file,'hwpx',validate);
    expect(validate).toHaveBeenCalledTimes(2);
  });
});
