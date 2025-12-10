import { useState, useMemo } from "react";
import { useStreamContext } from "@/providers/Stream";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  StepPayload,
  InputResponse,
  QuestionElement,
} from "@/lib/wizard-types";

interface WizardStepMessageProps {
  stepPayload: StepPayload;
  isLastMessage: boolean;
}

/**
 * WizardStepMessage - Renders wizard step as part of a chat message
 *
 * When isLastMessage=true: Shows interactive form for user input
 * When isLastMessage=false: Shows read-only summary of completed step
 */
export function WizardStepMessage({
  stepPayload,
  isLastMessage,
}: WizardStepMessageProps) {
  const stream = useStreamContext();

  // Build default JSON response template from question elements
  const defaultJsonTemplate = useMemo(() => {
    const questionElements = stepPayload.elements.filter(
      (el): el is QuestionElement => el.type === "question" && el.isVisible,
    );
    const defaultResponse: InputResponse[] = questionElements.map((el) => ({
      questionId: el.attributes.questionId,
      value: "",
    }));
    return JSON.stringify(defaultResponse, null, 2);
  }, [stepPayload]);

  // State hooks
  const [jsonInput, setJsonInput] = useState(defaultJsonTemplate);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { step, session, elements } = stepPayload;
  const isComplete = step.stepId === "complete";

  // For completed steps, show read-only summary
  if (!isLastMessage || isComplete) {
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span className="font-medium">{step.title}</span>
          {isComplete && (
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
              Complete
            </span>
          )}
        </div>
        {!isComplete && elements.length > 0 && (
          <div className="mt-2 text-xs text-gray-500">
            {elements.filter((el) => el.type === "question").length} question(s)
          </div>
        )}
      </div>
    );
  }

  // Active step - render form
  const handleSubmit = async () => {
    setError(null);

    // Parse and validate JSON
    let inputResponses: InputResponse[];
    try {
      inputResponses = JSON.parse(jsonInput);
      if (!Array.isArray(inputResponses)) {
        throw new Error("Response must be an array");
      }
    } catch (e) {
      setError(
        `Invalid JSON: ${e instanceof Error ? e.message : "Parse error"}`,
      );
      return;
    }

    setIsSubmitting(true);
    try {
      // Build human-readable summary of responses
      const summaryParts = inputResponses.map((r) => {
        const question = elements.find(
          (el) =>
            el.type === "question" &&
            el.attributes.questionId === r.questionId,
        ) as QuestionElement | undefined;
        const questionText = question?.attributes.questionText ?? r.questionId;
        return `${questionText}: ${r.value}`;
      });
      const summaryContent = summaryParts.join("\n");

      // Submit as human message with wizard_response in additional_kwargs
      stream.submit({
        messages: [
          {
            type: "human",
            content: summaryContent || "[Wizard Response]",
            additional_kwargs: {
              wizard_response: inputResponses,
            },
          },
        ],
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-blue-200 bg-blue-50 p-4">
      {/* Step Info */}
      <div className="text-sm text-blue-700">
        Step {step.sort} of wizard • {session?.sessionId.slice(0, 8)}...
      </div>

      {/* Payload Display (for testing) */}
      <div className="rounded-lg border border-gray-200 bg-white p-3">
        <Label className="text-xs font-medium uppercase text-gray-500">
          Step Payload (read-only)
        </Label>
        <pre className="mt-2 max-h-40 overflow-auto text-xs text-gray-700">
          {JSON.stringify(stepPayload, null, 2)}
        </pre>
      </div>

      {/* JSON Response Input */}
      <div className="flex flex-col gap-2">
        <Label className="text-sm font-medium">Your Response (JSON)</Label>
        <p className="text-xs text-gray-500">
          Edit the JSON below to set your responses. Format:{" "}
          {`[{ questionId, value }]`}
        </p>
        <Textarea
          value={jsonInput}
          onChange={(e) => setJsonInput(e.target.value)}
          rows={6}
          className="bg-white font-mono text-sm"
          placeholder='[{ "questionId": "q-xxx", "value": "..." }]'
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      {/* Submit Button */}
      <div className="flex justify-end">
        <Button onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? "Submitting..." : "Continue"}
        </Button>
      </div>
    </div>
  );
}
