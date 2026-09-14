import type { ReactNode } from 'react'
import classnames from 'classnames'

export interface Column<T> { key: keyof T | string; label: string; render?: (record: T) => ReactNode; className?: string }
export interface TableProps<T> { data: readonly T[]; columns: readonly Column<T>[]; getRowKey: (record: T) => string; emptyText?: string; className?: string; onRowClick?: (record: T) => void }

export default function Table<T>({ data, columns, getRowKey, emptyText = 'Belum ada data.', className, onRowClick }: TableProps<T>) {
  return <div className={classnames('overflow-x-auto rounded-lg border border-slate-200', className)}><table className="min-w-full divide-y divide-slate-200"><thead className="bg-slate-50"><tr>{columns.map(column => <th key={String(column.key)} scope="col" className={classnames('px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500', column.className)}>{column.label}</th>)}</tr></thead><tbody className="divide-y divide-slate-200 bg-white">{data.length === 0 ? <tr><td colSpan={columns.length} className="px-4 py-10 text-center text-sm text-slate-500">{emptyText}</td></tr> : data.map(record => <tr key={getRowKey(record)} onClick={() => onRowClick?.(record)} className={onRowClick ? 'cursor-pointer hover:bg-slate-50' : undefined}>{columns.map(column => <td key={String(column.key)} className={classnames('px-4 py-3 text-sm text-slate-700', column.className)}>{column.render ? column.render(record) : String(record[column.key as keyof T] ?? '')}</td>)}</tr>)}</tbody></table></div>
}
