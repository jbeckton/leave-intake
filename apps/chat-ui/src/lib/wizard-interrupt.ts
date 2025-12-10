import { Interrupt } from "@langchain/langgraph-sdk";
import { StepPayload } from "./wizard-types";

/**
 * Type guard to detect wizard StepPayload interrupts
 *
 * Checks for the wizard-specific structure:
 * - step.stepId (string)
 * - elements (array)
 * - session (null or has sessionId)
 */
export function isWizardInterrupt(
  value: unknown,
): value is Interrupt<StepPayload> | Interrupt<StepPayload>[] {
  const obj = Array.isArray(value) ? value[0] : value;
  if (!obj || typeof obj !== "object") return false;

  const interrupt = obj as Interrupt<StepPayload>;
  if (!interrupt.value || typeof interrupt.value !== "object") return false;

  const payload = interrupt.value as Partial<StepPayload>;

  // Check for wizard-specific structure
  return (
    typeof payload.step?.stepId === "string" &&
    Array.isArray(payload.elements) &&
    (payload.session === null ||
      typeof payload.session?.sessionId === "string")
  );
}
