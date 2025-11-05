"use client"
import React, { useEffect, useRef } from 'react'

export default function ConfirmModal({ open, title, message, onConfirm, onCancel }: { open: boolean, title?: string, message?: string, onConfirm: () => void, onCancel: () => void }) {
  const panelRef = useRef<HTMLDivElement | null>(null)
  const previouslyFocusedRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return
    previouslyFocusedRef.current = document.activeElement as HTMLElement | null

    // focus the first button in the dialog (Confirm by default)
    const firstFocusable = panelRef.current?.querySelector<HTMLElement>('button')
    setTimeout(() => firstFocusable?.focus(), 0)

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        onCancel()
      }

      // Simple focus trap: keep focus inside the dialog
      if (e.key === 'Tab') {
        const focusable = panelRef.current?.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
        if (!focusable || focusable.length === 0) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      previouslyFocusedRef.current?.focus()
    }
  }, [open, onCancel])

  if (!open) return null

  function onBackdropClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget) onCancel()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onMouseDown={onBackdropClick}>
      <div ref={panelRef} tabIndex={-1} className="bg-white rounded p-4 w-full max-w-md mx-4 shadow-lg transform transition-all scale-100" role="dialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-desc">
        <h3 id="confirm-title" className="font-semibold text-lg">{title ?? 'Confirm'}</h3>
        <p id="confirm-desc" className="mt-2 text-sm">{message ?? 'Are you sure?'}</p>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onCancel} className="px-3 py-1 rounded border hover:bg-gray-100 active:bg-gray-200 active:scale-95 transition-all">Cancel</button>
          <button onClick={onConfirm} className="px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700 active:bg-red-800 active:scale-95 transition-all">Confirm</button>
        </div>
      </div>
    </div>
  )
}
