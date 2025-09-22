import { create } from "zustand"
import { ReactNode, useCallback } from "react"

export type ToastOpts = {
  id?: string
  title?: ReactNode
  description?: ReactNode
  action?: ReactNode
  duration?: number // ms; default 4000
}

type ToastItem = Required<Pick<ToastOpts, "id">> &
  Omit<ToastOpts, "id"> & {
    open: boolean
  }

type ToastStore = {
  toasts: ToastItem[]
  toast: (opts: ToastOpts) => string
  dismiss: (id?: string) => void
}

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export const useToastStore = create<ToastStore>((set, get) => ({
  toasts: [],
  toast: (opts: ToastOpts) => {
    const id = opts.id ?? uid()
    const duration = opts.duration ?? 4000
    const item: ToastItem = { id, open: true, ...opts }
    set((s) => ({ toasts: [...s.toasts, item] }))
    // auto-dismiss
    if (duration > 0) {
      setTimeout(() => get().dismiss(id), duration)
    }
    return id
  },
  dismiss: (id?: string) =>
    set((s) =>
      id
        ? { toasts: s.toasts.filter((t) => t.id !== id) }
        : { toasts: [] }
    ),
}))

// Hook used by your <Toaster /> component and anywhere else:
export function useToast() {
  const toasts = useToastStore((s) => s.toasts)
  const toast = useToastStore((s) => s.toast)
  const dismiss = useToastStore((s) => s.dismiss)
  return { toasts, toast, dismiss }
}
