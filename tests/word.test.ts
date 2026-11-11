import {beforeEach,describe,expect,it,vi} from 'vitest';
import {detectWordFormat,validateWordFile,wordToPdf} from '../src/lib/word';

const adapters=vi.hoisted(()=>({validateOffice:vi.fn(),office:vi.fn(),validateHangul:vi.fn(),hangul:vi.fn()}));
vi.mock('../src/lib/office',()=>({validateOfficeFile:adapters.validateOffice,officeToPdf:adapters.office}));
vi.mock('../src/lib/hangul',()=>({validateHangulFile:adapters.validateHangul,hangulToPdf:adapters.hangul}));
const input=(name:string)=>new File([new Uint8Array(name.toLowerCase().endsWith('.hwp')?[0xd0,0xcf,0x11,0xe0,0xa1,0xb1,0x1a,0xe1]:[0x50,0x4b,3,4,0,0,0,0])],name);
const result={blob:new Blob(['PDF'],{type:'application/pdf'}),name:'result.pdf',pageCount:1};
beforeEach(()=>{vi.clearAllMocks();adapters.office.mockResolvedValue(result);adapters.hangul.mockResolvedValue(result);});

describe('one Word/Hangul input selects exactly one conversion engine',()=>{
  it('keeps DOCX validation and conversion on the Word engine',async()=>{
    const file=input('report.DOCX');const options={scale:1.5,range:'1'};const progress=vi.fn();
    expect(await validateWordFile(file)).toBe('docx');
    expect(adapters.validateOffice).toHaveBeenCalledExactlyOnceWith(file,'docx');
    expect(adapters.validateHangul).not.toHaveBeenCalled();
    expect(await wordToPdf(file,options,progress)).toBe(result);
    expect(adapters.office).toHaveBeenCalledExactlyOnceWith(file,'docx',options,progress);
    expect(adapters.hangul).not.toHaveBeenCalled();
  });
  it.each(['hwp','hwpx'] as const)('routes %s only to the Hangul engine',async kind=>{
    const file=input(`report.${kind}`);const options={scale:1,range:''};
    expect(await validateWordFile(file)).toBe(kind);
    expect(adapters.validateHangul).toHaveBeenCalledExactlyOnceWith(file,kind);
    expect(adapters.validateOffice).not.toHaveBeenCalled();
    expect(await wordToPdf(file,options)).toBe(result);
    expect(adapters.hangul).toHaveBeenCalledExactlyOnceWith(file,kind,options,undefined);
    expect(adapters.office).not.toHaveBeenCalled();
  });
  it.each(['report.doc','slides.pptx','report.pdf'])('rejects unsupported %s before running either engine',async name=>{
    await expect(wordToPdf(input(name),{scale:1,range:''})).rejects.toMatchObject({code:'officeUnsupported'});
    expect(adapters.office).not.toHaveBeenCalled();expect(adapters.hangul).not.toHaveBeenCalled();
  });
  it('checks file signatures rather than trusting a renamed extension',async()=>{
    await expect(validateWordFile(new File(['not a document'],'report.docx'))).rejects.toMatchObject({code:'officeUnsupported'});
    await expect(validateWordFile(new File([new Uint8Array([0x50,0x4b,3,4])],'report.hwp'))).rejects.toMatchObject({code:'officeUnsupported'});
    expect(adapters.validateOffice).not.toHaveBeenCalled();expect(adapters.validateHangul).not.toHaveBeenCalled();
  });
  it('applies the input budget before reading file content',async()=>{
    const file=input('report.docx');Object.defineProperty(file,'size',{value:21*1024*1024});
    const read=vi.spyOn(file,'slice');
    await expect(detectWordFormat(file)).rejects.toMatchObject({code:'officeTooLarge'});
    expect(read).not.toHaveBeenCalled();
  });
});
