import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-24 w-full rounded-2xl border border-stone-200 bg-white px-3.5 py-2.5 text-base text-stone-900 shadow-sm transition-colors outline-none placeholder:text-stone-400 focus-visible:border-teal-600 focus-visible:ring-4 focus-visible:ring-teal-100/80 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-rose-600 aria-invalid:ring-4 aria-invalid:ring-rose-100",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
