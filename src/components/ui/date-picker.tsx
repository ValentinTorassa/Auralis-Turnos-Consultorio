"use client"

import * as React from "react"
import { CalendarDays } from "lucide-react"
import { es } from "react-day-picker/locale"

import { APP_TIME_ZONE, dateKeyFromDate, parseDateKey } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

type DatePickerProps = {
  value: string
  onChange: (value: string) => void
  name?: string
  id?: string
  disabled?: boolean
  required?: boolean
  className?: string
  placeholder?: string
  "aria-label"?: string
}

export function DatePicker({
  value,
  onChange,
  name,
  id,
  disabled,
  required,
  className,
  placeholder = "Elegir fecha",
  "aria-label": ariaLabel = "Elegir fecha",
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
  const selected = value ? parseDateKey(value) : undefined
  const label = selected
    ? new Intl.DateTimeFormat("es-AR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: APP_TIME_ZONE,
      }).format(selected)
    : placeholder

  return (
    <Popover open={open} onOpenChange={setOpen}>
      {name && <input type="hidden" name={name} value={value} required={required} />}
      <PopoverTrigger
        id={id}
        disabled={disabled}
        aria-label={ariaLabel}
        render={
          <Button
            type="button"
            variant="outline"
            className={cn(
              "w-full justify-start px-3.5 text-left text-base font-medium",
              !value && "text-stone-400",
              className,
            )}
          />
        }
      >
        <CalendarDays data-icon="inline-start" className="text-teal-700" />
        <span className="truncate">{label}</span>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          selected={selected}
          locale={es}
          timeZone={APP_TIME_ZONE}
          onSelect={(date) => {
            if (!date) return
            onChange(dateKeyFromDate(date))
            setOpen(false)
          }}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  )
}
