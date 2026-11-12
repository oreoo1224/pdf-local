// File contents are immutable. Remember validation completion, never file bytes,
// so converting an already selected document does not inflate/inspect it twice.
const validated = new WeakMap<File, Map<string, Promise<void>>>();

export async function readValidatedDocument(
  file: File,
  format: string,
  validate: (bytes: Uint8Array) => void | Promise<void>,
): Promise<Uint8Array<ArrayBuffer>> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let formats = validated.get(file);
  if (!formats) { formats = new Map(); validated.set(file, formats); }
  let check = formats.get(format);
  if (!check) {
    check = Promise.resolve().then(() => validate(bytes));
    formats.set(format, check);
  }
  try { await check; }
  catch (error) {
    if (formats.get(format) === check) formats.delete(format);
    throw error;
  }
  return bytes;
}
