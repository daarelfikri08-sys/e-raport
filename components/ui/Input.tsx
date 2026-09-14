'use client'

import { forwardRef, useId, type InputHTMLAttributes, type SelectHTMLAttributes } from 'react'
import classnames from 'classnames'

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> { label?: string; error?: string | null; helperText?: string; inputSize?: 'sm' | 'md' | 'lg' }
const sizes = { sm: 'px-2.5 py-1.5 text-sm', md: 'px-3 py-2.5 text-sm', lg: 'px-4 py-3 text-base' }

export const TextInput = forwardRef<HTMLInputElement, InputProps>(function TextInput({ label, error, helperText, inputSize = 'md', className, id, name, ...props }, ref) {
  const generatedId = useId()
  const inputId = id ?? name ?? generatedId
  const helpId = inputId ? `${inputId}-message` : undefined
  return <div className={classnames('space-y-1.5', className)}>{label && <label htmlFor={inputId} className="block text-sm font-medium text-slate-700">{label}</label>}<input ref={ref} id={inputId} name={name} aria-invalid={Boolean(error)} aria-describedby={(error || helperText) ? helpId : undefined} className={classnames('w-full rounded-lg border bg-white text-slate-900 placeholder:text-slate-400 focus:border-primary-600 focus:ring-2 focus:ring-primary-200', sizes[inputSize], error ? 'border-red-500' : 'border-slate-300')} {...props} />{(error || helperText) && <p id={helpId} className={classnames('text-xs', error ? 'text-red-700' : 'text-slate-500')}>{error || helperText}</p>}</div>
})

export const PasswordInput = forwardRef<HTMLInputElement, InputProps>(function PasswordInput(props, ref) { return <TextInput ref={ref} type="password" {...props} /> })
export const EmailInput = forwardRef<HTMLInputElement, InputProps>(function EmailInput(props, ref) { return <TextInput ref={ref} type="email" {...props} /> })

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> { label?: string; error?: string | null; options: ReadonlyArray<{ value: string; label: string; disabled?: boolean }>; inputSize?: 'sm' | 'md' | 'lg' }
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select({ label, error, options, inputSize = 'md', id, name, className, ...props }, ref) { const selectId = id ?? name; const errorId = selectId ? `${selectId}-message` : undefined; return <div className={classnames('space-y-1.5', className)}>{label && <label htmlFor={selectId} className="block text-sm font-medium text-slate-700">{label}</label>}<select ref={ref} id={selectId} name={name} aria-invalid={Boolean(error)} aria-describedby={error ? errorId : undefined} className={classnames('w-full rounded-lg border border-slate-300 bg-white', sizes[inputSize])} {...props}>{options.map(option => <option key={option.value} value={option.value} disabled={option.disabled}>{option.label}</option>)}</select>{error && <p id={errorId} className="text-xs text-red-700">{error}</p>}</div> })
