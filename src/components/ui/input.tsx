import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-11 w-full min-w-0 rounded-2xl border border-stone-200 bg-white px-3.5 py-1 text-base text-stone-900 shadow-sm transition-colors outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-stone-400 focus-visible:border-teal-600 focus-visible:ring-4 focus-visible:ring-teal-100/80 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-rose-600 aria-invalid:ring-4 aria-invalid:ring-rose-100 [&[type=color]]:cursor-pointer [&[type=color]]:overflow-hidden [&[type=color]]:p-1 [&[type=color]::-webkit-color-swatch-wrapper]:p-0 [&[type=color]::-webkit-color-swatch]:rounded-xl [&[type=color]::-webkit-color-swatch]:border-0 [&[type=color]::-moz-color-swatch]:rounded-xl [&[type=color]::-moz-color-swatch]:border-0",
        className
      )}
      {...props}
    />
  )
}

export { Input }
