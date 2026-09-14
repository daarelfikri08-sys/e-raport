export type ServiceResult<T> = { ok: true; data: T } | { ok: false; message: string }
export const queryFailed = <T>(): ServiceResult<T> => ({ ok: false, message: 'Data tidak dapat dimuat.' })
