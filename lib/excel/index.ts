/** Stable boundary for a future spreadsheet adapter. */
export interface ExcelWorkbook { readonly filename: string; readonly sheets: readonly ExcelSheet[] }
export interface ExcelSheet { readonly name: string; readonly rows: readonly (readonly ExcelCell[])[] }
export type ExcelCell = string | number | boolean | Date | null
export interface ExcelWriter { write(workbook: ExcelWorkbook): Promise<Uint8Array> }
