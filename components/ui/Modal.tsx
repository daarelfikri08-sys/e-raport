'use client'

import { useEffect, useId, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
import Button from './Button'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
  closeDisabled?: boolean
}

export default function Modal({ isOpen, onClose, title, children, footer, closeDisabled = false }: ModalProps) {
  const dialog = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  useEffect(() => { 
    const node = dialog.current
    if (isOpen && !node?.open) node?.showModal()
    if (!isOpen && node?.open) node.close()
  }, [isOpen])
  
  return (
    <dialog ref={dialog} aria-labelledby={titleId} onCancel={event => { if (closeDisabled) event.preventDefault(); else onClose() }} onClick={event => { if (event.target === event.currentTarget && !closeDisabled) onClose() }} className="m-auto max-h-[90vh] w-[calc(100%-2rem)] max-w-lg overflow-auto rounded-xl bg-white p-0 shadow-xl backdrop:bg-slate-950/60">
      <section>
        <header className="flex items-center justify-between border-b p-5">
          <h2 id={titleId} className="text-lg font-semibold text-slate-900">{title}</h2>
          <button
            type="button"
            onClick={onClose} disabled={closeDisabled}
            className="rounded p-1 hover:bg-slate-100"
            aria-label="Tutup"
          >
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="p-5">{children}</div>
        {footer && <footer className="border-t bg-slate-50 p-4">{footer}</footer>}
      </section>
    </dialog>
  )
}

interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  isLoading?: boolean
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Konfirmasi',
  cancelText = 'Batal',
  isLoading,
}: ConfirmModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose} closeDisabled={isLoading}
      title={title}
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>{cancelText}</Button>
          <Button variant="danger" onClick={onConfirm} isLoading={isLoading}>
            {confirmText}
          </Button>
        </div>
      }
    >
      <p className="text-sm leading-6 text-slate-600">{message}</p>
    </Modal>
  )
}
