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
import { ElementRenderer } from "./elements";

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

  // Get visible question elements
  const questionElements = useMemo(() => {
    return stepPayload.elements.filter(
      (el): el is QuestionElement => el.type === "question" && el.isVisible
    );
  }, [stepPayload.elements]);

  // Get all visible elements (including info)
  const visibleElements = useMemo(() => {
    return stepPayload.elements
      .filter((el) => el.isVisible)
      .sort((a, b) => a.sort - b.sort);
  }, [stepPayload.elements]);

  // Form state: questionId -> value
  const [responses, setResponses] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    questionElements.forEach((el) => {
      initial[el.attributes.questionId] = "";
    });
    return initial;
  });

  // Debug mode state
  const [showDebug, setShowDebug] = useState(false);

  // Build JSON template for debug view
  const jsonTemplate = useMemo(() => {
    const inputResponses: InputResponse[] = questionElements.map((el) => ({
      questionId: el.attributes.questionId,
      value: responses[el.attributes.questionId] || "",
    }));
    return JSON.stringify(inputResponses, null, 2);
  }, [questionElements, responses]);

  const [jsonInput, setJsonInput] = useState(jsonTemplate);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { step, session, elements } = stepPayload;
  const isComplete = step.stepId === "complete";

  // Update response for a specific question
  const handleResponseChange = (questionId: string, value: string) => {
    setResponses((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

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
            {questionElements.length} question(s)
          </div>
        )}
      </div>
    );
  }

  // Handle form submit
  const handleSubmit = async () => {
    setError(null);

    // Build input responses from form state
    const inputResponses: InputResponse[] = questionElements.map((el) => ({
      questionId: el.attributes.questionId,
      value: responses[el.attributes.questionId] || "",
    }));

    // Validate required fields
    const missingRequired = questionElements.filter(
      (el) =>
        el.attributes.validation?.includes("required") &&
        !responses[el.attributes.questionId]
    );

    if (missingRequired.length > 0) {
      setError(
        `Please fill in: ${missingRequired.map((el) => el.attributes.questionText).join(", ")}`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      // Build human-readable summary of responses
      const summaryParts = inputResponses
        .filter((r) => r.value)
        .map((r) => {
          const question = questionElements.find(
            (el) => el.attributes.questionId === r.questionId
          );
          const questionText =
            question?.attributes.questionText ?? r.questionId;

          // For select questions, show the label instead of value
          if (question?.attributes.options) {
            const option = question.attributes.options.find(
              (opt) => opt.value === r.value
            );
            return `${questionText}: ${option?.label ?? r.value}`;
          }

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

  // Handle JSON debug submit (for testing)
  const handleDebugSubmit = async () => {
    setError(null);

    let inputResponses: InputResponse[];
    try {
      inputResponses = JSON.parse(jsonInput);
      if (!Array.isArray(inputResponses)) {
        throw new Error("Response must be an array");
      }
    } catch (e) {
      setError(
        `Invalid JSON: ${e instanceof Error ? e.message : "Parse error"}`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const summaryParts = inputResponses.map((r) => {
        const question = elements.find(
          (el) =>
            el.type === "question" &&
            el.attributes.questionId === r.questionId
        ) as QuestionElement | undefined;
        const questionText = question?.attributes.questionText ?? r.questionId;
        return `${questionText}: ${r.value}`;
      });
      const summaryContent = summaryParts.join("\n");

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

      {/* Form Elements */}
      <div className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-4">
        {visibleElements.map((element) => (
          <ElementRenderer
            key={element.elementId}
            element={element}
            value={
              element.type === "question"
                ? responses[element.attributes.questionId] || ""
                : ""
            }
            onChange={(value) => {
              if (element.type === "question") {
                handleResponseChange(element.attributes.questionId, value);
              }
            }}
          />
        ))}
      </div>

      {/* Error Message */}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Submit Button */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setShowDebug(!showDebug)}
          className="text-xs text-gray-500 hover:text-gray-700"
        >
          {showDebug ? "Hide Debug" : "Show Debug"}
        </button>
        <Button onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? "Submitting..." : "Continue"}
        </Button>
      </div>

      {/* Debug Panel (collapsible) */}
      {showDebug && (
        <div className="border-t border-gray-200 pt-4">
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
            <Label className="text-xs font-medium uppercase text-gray-500">
              Step Payload (read-only)
            </Label>
            <pre className="mt-2 max-h-40 overflow-auto text-xs text-gray-700">
              {JSON.stringify(stepPayload, null, 2)}
            </pre>
          </div>

          <div className="mt-4 flex flex-col gap-2">
            <Label className="text-sm font-medium">
              JSON Response (for testing)
            </Label>
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
            <div className="flex justify-end">
              <Button
                variant="outline"
                onClick={handleDebugSubmit}
                disabled={isSubmitting}
              >
                Submit JSON
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
