import { useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { DayPicker } from "react-day-picker";
import { format, parseISO, isValid } from "date-fns";
import { Label } from "@/components/ui/label";
import type { QuestionElement } from "@/lib/wizard-types";
import { cn } from "@/lib/utils";

import "react-day-picker/style.css";

interface DatePickerElementProps {
  element: QuestionElement;
  value: string;
  onChange: (value: string) => void;
}

/**
 * DatePickerElement - Calendar date picker using react-day-picker + Radix Popover
 *
 * Value is stored as ISO date string (YYYY-MM-DD).
 */
export function DatePickerElement({ element, value, onChange }: DatePickerElementProps) {
  const { questionId, questionText, helperText } = element.attributes;
  const [open, setOpen] = useState(false);

  // Parse the ISO date string to Date object
  const selectedDate = value ? parseISO(value) : undefined;
  const isValidDate = selectedDate && isValid(selectedDate);

  const handleSelect = (date: Date | undefined) => {
    if (date) {
      // Store as ISO date string
      onChange(format(date, "yyyy-MM-dd"));
      setOpen(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={questionId}>{questionText}</Label>
      {helperText && (
        <p className="text-xs text-gray-500">{helperText}</p>
      )}
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger asChild>
          <button
            id={questionId}
            type="button"
            className={cn(
              "flex h-9 w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-left text-sm",
              "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
              !isValidDate && "text-gray-500"
            )}
          >
            {isValidDate ? format(selectedDate, "MMMM d, yyyy") : "Select a date..."}
            <svg
              className="h-4 w-4 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </button>
        </Popover.Trigger>

        <Popover.Portal>
          <Popover.Content
            className="z-50 rounded-md border border-gray-200 bg-white p-3 shadow-lg"
            sideOffset={4}
            align="start"
          >
            <DayPicker
              mode="single"
              selected={isValidDate ? selectedDate : undefined}
              onSelect={handleSelect}
              showOutsideDays
              classNames={{
                root: "text-sm",
                month_caption: "flex justify-center py-2 font-medium",
                nav: "flex items-center justify-between",
                button_previous: "p-1 rounded hover:bg-gray-100",
                button_next: "p-1 rounded hover:bg-gray-100",
                weekdays: "flex",
                weekday: "w-9 text-center text-xs font-medium text-gray-500",
                week: "flex",
                day: "w-9 h-9 flex items-center justify-center rounded text-sm",
                day_button: "w-full h-full rounded hover:bg-gray-100",
                selected: "bg-blue-600 text-white hover:bg-blue-700",
                today: "font-bold text-blue-600",
                outside: "text-gray-400",
                disabled: "text-gray-300 cursor-not-allowed",
              }}
            />
            <Popover.Arrow className="fill-white" />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}
