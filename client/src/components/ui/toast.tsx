import * as React from "react"
import * as ToastPrimitives from "@radix-ui/react-toast"
import { X } from "react-icons/x" // optional; replace with any close icon you prefer

// If you don’t want an icon lib, delete the X import and use "×" text in the button.

export const ToastProvider = ToastPrimitives.Provider

export const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(function ToastViewport({ className, ...props }, ref) {
  return (
    <ToastPrimitives.Viewport
      ref={ref}
      className={[
        "fixed top-2 right-2 z-[9999] m-0 flex w-[420px] max-w-[calc(100vw-1rem)] flex-col gap-2",
        "p-0 outline-none"
      ].join(" ")}
      {...props}
    />
  )
})

export const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root>
>(function Toast({ className, ...props }, ref) {
  return (
    <ToastPrimitives.Root
      ref={ref}
      className={[
        "group pointer-events-auto grid w-full max-w-[420px] grid-cols-[auto_1fr_auto] items-center gap-3",
        "rounded-xl border border-zinc-200 bg-white/95 p-3 shadow-lg backdrop-blur",
        "dark:border-zinc-800 dark:bg-zinc-900/95",
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=open]:slide-in-from-right-4 data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-right-2"
      ].join(" ")}
      {...props}
    />
  )
})

export const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(function ToastTitle({ className, ...props }, ref) {
  return (
    <ToastPrimitives.Title
      ref={ref}
      className={["text-sm font-medium text-zinc-900 dark:text-zinc-100"].join(" ")}
      {...props}
    />
  )
})

export const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(function ToastDescription({ className, ...props }, ref) {
  return (
    <ToastPrimitives.Description
      ref={ref}
      className={["text-sm text-zinc-600 dark:text-zinc-300"].join(" ")}
      {...props}
    />
  )
})

export const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(function ToastAction({ className, ...props }, ref) {
  return (
    <ToastPrimitives.Action
      ref={ref}
      className={[
        "inline-flex items-center rounded-md border border-zinc-200 px-2.5 py-1.5 text-sm font-medium",
        "transition-colors hover:bg-zinc-50",
        "dark:border-zinc-700 dark:hover:bg-zinc-800"
      ].join(" ")}
      {...props}
    />
  )
})

export const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(function ToastClose({ className, ...props }, ref) {
  return (
    <ToastPrimitives.Close
      ref={ref}
      className={[
        "inline-flex h-8 w-8 items-center justify-center rounded-md text-zinc-500",
        "transition-colors hover:bg-zinc-100 hover:text-zinc-900",
        "dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
      ].join(" ")}
      aria-label="Close"
      {...props}
    >
      {/* If you removed the icon import, just put: × */}
      ×
    </ToastPrimitives.Close>
  )
})
