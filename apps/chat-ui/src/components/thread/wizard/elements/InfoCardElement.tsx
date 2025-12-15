import type { InfoElement } from "@/lib/wizard-types";

interface InfoCardElementProps {
  element: InfoElement;
}

/**
 * InfoCardElement - Read-only information display
 *
 * Renders info elements with title and content in a styled card.
 * No user interaction - purely informational.
 */
export function InfoCardElement({ element }: InfoCardElementProps) {
  const { title, content } = element.attributes;

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
      <h4 className="text-sm font-semibold text-blue-900">{title}</h4>
      <p className="mt-1 text-sm text-blue-700">{content}</p>
    </div>
  );
}
