import * as Checkbox from "@radix-ui/react-checkbox";
import { Label } from "@/components/ui/label";
import type { QuestionElement } from "@/lib/wizard-types";
import { cn } from "@/lib/utils";

interface CheckboxElementProps {
  element: QuestionElement;
  value: string;
  onChange: (value: string) => void;
}

/**
 * CheckboxElement - Checkbox with label text
 *
 * Used for acknowledgments and confirmations.
 * Value is stored as "true" or "false" string.
 */
export function CheckboxElement({ element, value, onChange }: CheckboxElementProps) {
  const { questionId, questionText } = element.attributes;
  const isChecked = value === "true";

  return (
    <div className="flex items-start gap-3">
      <Checkbox.Root
        id={questionId}
        checked={isChecked}
        onCheckedChange={(checked) => onChange(checked ? "true" : "false")}
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded border border-gray-300 bg-white",
          "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
          "data-[state=checked]:border-blue-600 data-[state=checked]:bg-blue-600"
        )}
      >
        <Checkbox.Indicator>
          <svg
            className="h-3.5 w-3.5 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={3}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </Checkbox.Indicator>
      </Checkbox.Root>
      <Label htmlFor={questionId} className="cursor-pointer leading-snug">
        {questionText}
      </Label>
    </div>
  );
}
