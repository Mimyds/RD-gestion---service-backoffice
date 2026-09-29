"use client"

import * as React from "react"
import { CalendarIcon } from "lucide-react"
import { fr } from "react-day-picker/locale"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

type DatePickerProps = {
  value: string
  onChange: (value: string) => void
  ariaLabel: string
}

function parseDate(value: string) {
  if (!value) return undefined
  const [year, month, day] = value.split("-").map(Number)
  return new Date(year, month - 1, day, 12)
}

function serializeDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function DatePicker({ value, onChange, ariaLabel }: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
  const selected = parseDate(value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="w-full justify-start"
          aria-label={ariaLabel}
        >
          <CalendarIcon data-icon="inline-start" />
          {selected
            ? selected.toLocaleDateString("fr-FR")
            : "Sélectionner une date"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          locale={fr}
          onSelect={(date) => {
            if (!date) return
            onChange(serializeDate(date))
            setOpen(false)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}
