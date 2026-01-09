import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { QuestionElement } from "@/lib/wizard-types";

interface TextElementProps {
  element: QuestionElement;
  value: string;
  onChange: (value: string) => void;
}

/**
 * TextElement - Text input field with label
 *
 * Used for free-text inputs like manager name, physician name, etc.
 */
export function TextElement({ element, value, onChange }: TextElementProps) {
  const { questionId, questionText, helperText } = element.attributes;

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={questionId}>{questionText}</Label>
      {helperText && (
        <p className="text-xs text-gray-500">{helperText}</p>
      )}
      <Input
        id={questionId}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={`Enter ${questionText.toLowerCase()}`}
      />
    </div>
  );
}
