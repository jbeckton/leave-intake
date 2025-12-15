import * as Select from "@radix-ui/react-select";
import { Label } from "@/components/ui/label";
import type { QuestionElement } from "@/lib/wizard-types";
import { cn } from "@/lib/utils";

interface SelectElementProps {
  element: QuestionElement;
  value: string;
  onChange: (value: string) => void;
}

/**
 * SelectElement - Dropdown select using Radix Select
 *
 * Used for single-choice questions with predefined options.
 */
export function SelectElement({ element, value, onChange }: SelectElementProps) {
  const { questionId, questionText, helperText, options = [] } = element.attributes;

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={questionId}>{questionText}</Label>
      {helperText && (
        <p className="text-xs text-gray-500">{helperText}</p>
      )}
      <Select.Root value={value} onValueChange={onChange}>
        <Select.Trigger
          id={questionId}
          className={cn(
            "flex h-9 w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm",
            "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
            !value && "text-gray-500"
          )}
        >
          <Select.Value placeholder="Select an option..." />
          <Select.Icon>
            <svg
              className="h-4 w-4 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </Select.Icon>
        </Select.Trigger>

        <Select.Portal>
          <Select.Content
            className="z-50 overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg"
            position="popper"
            sideOffset={4}
          >
            <Select.Viewport className="p-1">
              {options.map((option) => (
                <Select.Item
                  key={option.optionId}
                  value={option.value}
                  className={cn(
                    "relative flex cursor-pointer select-none items-center rounded-sm px-3 py-2 text-sm outline-none",
                    "data-[highlighted]:bg-blue-50 data-[highlighted]:text-blue-900",
                    "data-[state=checked]:bg-blue-100 data-[state=checked]:text-blue-900"
                  )}
                >
                  <Select.ItemText>{option.label}</Select.ItemText>
                  <Select.ItemIndicator className="absolute right-2">
                    <svg
                      className="h-4 w-4 text-blue-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </Select.ItemIndicator>
                </Select.Item>
              ))}
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>
    </div>
  );
}
