import type { Element, QuestionElement, InfoElement } from "@/lib/wizard-types";
import { InfoCardElement } from "./InfoCardElement";
import { TextElement } from "./TextElement";
import { SelectElement } from "./SelectElement";
import { CheckboxElement } from "./CheckboxElement";
import { DatePickerElement } from "./DatePickerElement";

interface ElementRendererProps {
  element: Element;
  value: string;
  onChange: (value: string) => void;
}

/**
 * ElementRenderer - Maps componentTypeKey to appropriate component
 *
 * Handles both question and info element types.
 * Question elements get value/onChange props for form state.
 * Info elements are read-only.
 */
export function ElementRenderer({ element, value, onChange }: ElementRendererProps) {
  // Info elements don't have form controls
  if (element.type === "info") {
    return <InfoCardElement element={element as InfoElement} />;
  }

  // Document elements (not implemented yet)
  if (element.type === "document") {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600">
        Document: {element.attributes.name}
      </div>
    );
  }

  // Question elements - map componentTypeKey to component
  if (element.type === "question") {
    const questionElement = element as QuestionElement;
    const componentKey = questionElement.attributes.componentTypeKey;

    switch (componentKey) {
      case "select":
        return (
          <SelectElement
            element={questionElement}
            value={value}
            onChange={onChange}
          />
        );

      case "text":
        return (
          <TextElement
            element={questionElement}
            value={value}
            onChange={onChange}
          />
        );

      case "datePicker":
        return (
          <DatePickerElement
            element={questionElement}
            value={value}
            onChange={onChange}
          />
        );

      case "checkbox":
        return (
          <CheckboxElement
            element={questionElement}
            value={value}
            onChange={onChange}
          />
        );

      default:
        // Fallback to text input for unknown types
        console.warn(`Unknown componentTypeKey: ${componentKey}, falling back to text`);
        return (
          <TextElement
            element={questionElement}
            value={value}
            onChange={onChange}
          />
        );
    }
  }

  return null;
}
