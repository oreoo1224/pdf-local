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
