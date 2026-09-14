'use client'

import type { ButtonHTMLAttributes, ReactNode } from 'react'
import Link from 'next/link'
import classnames from 'classnames'
import { Loader2 } from 'lucide-react'

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> { variant?: Variant; size?: 'sm' | 'md' | 'lg'; isLoading?: boolean; loadingText?: string; href?: string; fullWidth?: boolean; children: ReactNode }

const variants: Record<Variant, string> = { primary: 'bg-primary-600 text-white hover:bg-primary-700', secondary: 'bg-slate-200 text-slate-900 hover:bg-slate-300', outline: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50', ghost: 'text-slate-700 hover:bg-slate-100', danger: 'bg-red-700 text-white hover:bg-red-800' }
const sizes = { sm: 'min-h-10 px-3 py-2 text-sm', md: 'min-h-11 px-4 py-2.5 text-sm', lg: 'min-h-12 px-5 py-3 text-base' }

export default function Button({ variant = 'primary', size = 'md', isLoading = false, loadingText, href, fullWidth, className, children, disabled, type = 'button', ...props }: ButtonProps) {
  const classes = classnames('inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50', variants[variant], sizes[size], fullWidth && 'w-full', className)
  const content = <>{isLoading && <Loader2 className="h-4 w-4 animate-spin" />}{isLoading && loadingText ? loadingText : children}</>
  if (href) return disabled || isLoading ? <span aria-disabled="true" aria-busy={isLoading} className={classnames(classes, 'cursor-not-allowed opacity-50')}>{content}</span> : <Link href={href} className={classes} aria-label={props['aria-label']}>{content}</Link>
  return <button type={type} className={classes} disabled={disabled || isLoading} aria-busy={isLoading} {...props}>{content}</button>
}
