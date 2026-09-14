/** Stable boundary for a future PDF adapter; no rendering dependency is selected here. */
export interface PdfDocument { readonly filename: string; readonly title: string; readonly sections: readonly PdfSection[] }
export interface PdfSection { readonly heading?: string; readonly rows: readonly (readonly string[])[] }
export interface PdfRenderer { render(document: PdfDocument): Promise<Uint8Array> }
