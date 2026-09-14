import type { HTMLAttributes, ReactNode } from 'react'
import classnames from 'classnames'

interface CardProps extends HTMLAttributes<HTMLDivElement> { title?: string; subtitle?: string; header?: ReactNode; footer?: ReactNode; padding?: 'none' | 'sm' | 'md' | 'lg'; children?: ReactNode }
const paddingClasses = { none: '', sm: 'p-4', md: 'p-6', lg: 'p-8' }

export default function Card({ title, subtitle, header, footer, padding = 'md', className, children, ...props }: CardProps) {
  return <div className={classnames('rounded-2xl border border-slate-200 bg-white shadow-sm', paddingClasses[padding], className)} {...props}>{(header || title || subtitle) && <header className="mb-5">{header}{title && <h2 className="text-lg font-semibold text-slate-900">{title}</h2>}{subtitle && <p className="mt-2 text-sm leading-6 text-slate-600">{subtitle}</p>}</header>}{children}{footer && <footer className="mt-5 border-t border-slate-200 pt-4">{footer}</footer>}</div>
}
