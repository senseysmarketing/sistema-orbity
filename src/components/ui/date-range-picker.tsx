import * as React from "react"
import { format } from "date-fns"
import { CalendarIcon, Check } from "lucide-react"
import { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DateRangePickerProps {
  date: DateRange | undefined
  onDateChange: (date: DateRange | undefined) => void
  className?: string
}

export function DateRangePicker({
  date,
  onDateChange,
  className,
}: DateRangePickerProps) {
  const [tempDate, setTempDate] = React.useState<DateRange | undefined>(date)
  const [isOpen, setIsOpen] = React.useState(false)

  React.useEffect(() => {
    setTempDate(date)
  }, [date])

  const handleConfirm = () => {
    onDateChange(tempDate)
    setIsOpen(false)
  }

  const handleCancel = () => {
    setTempDate(date)
    setIsOpen(false)
  }

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-[280px] justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "dd/MM/yyyy")} -{" "}
                  {format(date.to, "dd/MM/yyyy")}
                </>
              ) : (
                format(date.from, "dd/MM/yyyy")
              )
            ) : (
              <span>Selecionar período</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="space-y-3">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={tempDate?.from}
              selected={tempDate}
              onSelect={setTempDate}
              numberOfMonths={2}
              className="pointer-events-auto"
            />
            <div className="flex justify-end gap-2 p-3 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleConfirm}
                disabled={!tempDate?.from}
              >
                <Check className="mr-2 h-4 w-4" />
                Confirmar
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}