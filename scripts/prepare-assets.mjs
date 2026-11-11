import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

await mkdir('public/pdfjs', { recursive: true });
for (const dir of ['cmaps', 'standard_fonts', 'wasm', 'iccs']) {
  await cp(join('node_modules/pdfjs-dist', dir), join('public/pdfjs', dir), { recursive: true });
}
await mkdir('public/licenses', { recursive: true });
for (const [pkg, file] of [['pdf-lib','LICENSE.md'], ['pdfjs-dist','LICENSE'], ['fflate','LICENSE']]) {
  await writeFile(`public/licenses/${pkg}.txt`, await readFile(`node_modules/${pkg}/${file}`));
}
await writeFile('public/licenses/silurus-ooxml.txt', await readFile('node_modules/@silurus/ooxml/LICENSE'));
await writeFile('public/licenses/silurus-ooxml-third-party.txt', await readFile('node_modules/@silurus/ooxml/THIRD_PARTY_NOTICES.md'));
await mkdir('public/office', {recursive:true});
for(const file of ['docx_parser_bg.wasm','pptx_parser_bg.wasm']) {
  await cp(join('node_modules/@silurus/ooxml/dist',file),join('public/office',file));
}
await mkdir('public/hangul',{recursive:true});
await cp('node_modules/@rhwp/core/rhwp_bg.wasm','public/hangul/rhwp_bg.wasm');
await writeFile('public/licenses/rhwp-core.txt',await readFile('node_modules/@rhwp/core/LICENSE'));
await cp('node_modules/@rhwp/core/notices','public/licenses/rhwp-notices',{recursive:true});
