export type OfficeErrorCode =
  | 'officeUnsupported' | 'officeCorrupt' | 'officeTooLarge'
  | 'officeRender' | 'officeBrowser' | 'officeLimit' | 'officeExternal';

/** UI messages are translated from stable codes; parser internals stay private. */
export class OfficeToolError extends Error {
  constructor(public readonly code: OfficeErrorCode) {
    super(code);
    this.name = 'OfficeToolError';
  }
}

export function officeError(error: unknown): Error {
  if (error instanceof OfficeToolError) return error;
  if (error && typeof error === 'object' && 'code' in error) {
    const code = String(error.code);
    if ((code === 'invalidRange' || code === 'emptyPages') && error instanceof Error) return error;
    if (/resource-limit|decoded-image-limit/.test(code)) return new OfficeToolError('officeLimit');
    if (/encrypted|password|legacy|not-ooxml|unsupported/.test(code)) return new OfficeToolError('officeUnsupported');
  }
  return new OfficeToolError('officeRender');
}
