import { OfficeToolError } from './office-errors';
import type { OfficeOptions } from './office';

export type WordFormat = 'docx' | 'hwp' | 'hwpx';
const MAX_INPUT = 20 * 1024 * 1024;
const CFB = [0xd0,0xcf,0x11,0xe0,0xa1,0xb1,0x1a,0xe1];

/** Select one parser; that parser then validates the complete file structure. */
export async function detectWordFormat(file: File): Promise<WordFormat> {
  if(file.size>MAX_INPUT)throw new OfficeToolError('officeTooLarge');
  const extension=file.name.toLowerCase().split('.').pop();
  if(!['docx','hwp','hwpx'].includes(extension||''))throw new OfficeToolError('officeUnsupported');
  const bytes=new Uint8Array(await file.slice(0,8).arrayBuffer());
  const zip=bytes.length>=4&&bytes[0]===0x50&&bytes[1]===0x4b&&bytes[2]===3&&bytes[3]===4;
  const cfb=bytes.length===8&&CFB.every((byte,index)=>bytes[index]===byte);
  if(extension==='hwp'&&!cfb)throw new OfficeToolError('officeUnsupported');
  if(extension!=='hwp'&&!zip)throw new OfficeToolError('officeUnsupported');
  return extension as WordFormat;
}

export async function validateWordFile(file: File): Promise<WordFormat> {
  const kind=await detectWordFormat(file);
  if(kind==='docx') {
    const {validateOfficeFile}=await import('./office');
    await validateOfficeFile(file,'docx');
  } else {
    const {validateHangulFile}=await import('./hangul');
    await validateHangulFile(file,kind);
  }
  return kind;
}

export async function wordToPdf(file: File,options:OfficeOptions,progress?:(value:number)=>void):Promise<{blob:Blob;name:string;pageCount:number}> {
  const kind=await detectWordFormat(file);
  if(kind==='docx') {
    const {officeToPdf}=await import('./office');
    return officeToPdf(file,'docx',options,progress);
  }
  const {hangulToPdf}=await import('./hangul');
  return hangulToPdf(file,kind,options,progress);
}
