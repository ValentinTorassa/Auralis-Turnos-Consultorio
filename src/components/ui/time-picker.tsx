"use client"

import * as React from "react"
import { Clock3 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

type TimePickerProps = {
  value: string
  onChange: (value: string) => void
  id?: string
  disabled?: boolean
  required?: boolean
  className?: string
  step?: 5 | 10 | 15 | 30
  "aria-label"?: string
  "aria-labelledby"?: string
  "aria-describedby"?: string
  "aria-invalid"?: boolean
}

const hourItems = Array.from({ length: 24 }, (_, hour) => {
  const value = String(hour).padStart(2, "0")
  return { label: value, value }
})

function timeParts(value: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(value)
  return {
    hour: match?.[1] ?? "08",
    minute: match?.[2] ?? "00",
  }
}

export function TimePicker({
  value,
  onChange,
  id,
  disabled,
  required,
  className,
  step = 5,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
}: TimePickerProps) {
  const [open, setOpen] = React.useState(false)
  const { hour, minute } = timeParts(value)
  const minuteItems = React.useMemo(() => {
    const values = Array.from(
      { length: 60 / step },
      (_, index) => index * step,
    ).map((value) => String(value).padStart(2, "0"))

    if (!values.includes(minute)) values.push(minute)
    return values
      .sort((left, right) => Number(left) - Number(right))
      .map((value) => ({ label: value, value }))
  }, [minute, step])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        id={id}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-describedby={ariaDescribedBy}
        aria-invalid={ariaInvalid}
        aria-required={required}
        render={
          <Button
            type="button"
            variant="outline"
            className={cn(
              "w-full justify-start px-3.5 text-left text-base font-medium",
              !value && "text-muted-foreground",
              className,
            )}
          />
        }
      >
        <Clock3 data-icon="inline-start" className="text-teal-700" />
        <span className="tabular-nums">{value ? `${value} hs` : "Elegir hora"}</span>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 rounded-2xl p-4">
        <PopoverHeader>
          <PopoverTitle>Elegir hora</PopoverTitle>
          <PopoverDescription>Horario de Buenos Aires</PopoverDescription>
        </PopoverHeader>
        <FieldGroup className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
          <Field>
            <FieldLabel htmlFor={id ? `${id}-hour` : undefined}>Hora</FieldLabel>
            <Select
              items={hourItems}
              value={hour}
              onValueChange={(nextHour) => {
                if (nextHour) onChange(`${nextHour}:${minute}`)
              }}
            >
              <SelectTrigger id={id ? `${id}-hour` : undefined} className="h-11 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false} className="min-w-20">
                <SelectGroup>
                  {hourItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          <span className="pb-3 text-base font-semibold text-muted-foreground">:</span>
          <Field>
            <FieldLabel htmlFor={id ? `${id}-minute` : undefined}>Minutos</FieldLabel>
            <Select
              items={minuteItems}
              value={minute}
              onValueChange={(nextMinute) => {
                if (nextMinute) onChange(`${hour}:${nextMinute}`)
              }}
            >
              <SelectTrigger id={id ? `${id}-minute` : undefined} className="h-11 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false} className="min-w-20">
                <SelectGroup>
                  {minuteItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
        </FieldGroup>
        <Button type="button" className="w-full" onClick={() => setOpen(false)}>
          Listo
        </Button>
      </PopoverContent>
    </Popover>
  )
}
