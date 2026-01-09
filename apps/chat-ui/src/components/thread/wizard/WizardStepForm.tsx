import { useState, useMemo } from "react";
import { Interrupt } from "@langchain/langgraph-sdk";
import { useStreamContext } from "@/providers/Stream";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  StepPayload,
  InputResponse,
  QuestionElement,
} from "@/lib/wizard-types";

interface WizardStepFormProps {
  interrupt: Interrupt<StepPayload> | Interrupt<StepPayload>[];
}

export function WizardStepForm({ interrupt }: WizardStepFormProps) {
  const stream = useStreamContext();

  // Extract payload (handle both array and single interrupt)
  const payload = useMemo(() => {
    return Array.isArray(interrupt) ? interrupt[0].value : interrupt.value;
  }, [interrupt]);

  // Build default JSON response template from question elements
  const defaultJsonTemplate = useMemo(() => {
    if (!payload) return "[]";
    const questionElements = payload.elements.filter(
      (el): el is QuestionElement => el.type === "question" && el.isVisible,
    );
    const defaultResponse: InputResponse[] = questionElements.map((el) => ({
      questionId: el.attributes.questionId,
      value: "",
    }));
    return JSON.stringify(defaultResponse, null, 2);
  }, [payload]);

  // State hooks - must be called unconditionally (before any early returns)
  const [jsonInput, setJsonInput] = useState(defaultJsonTemplate);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Early return AFTER all hooks
  if (!payload) return null;

  const { step, session } = payload;

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
      // Resume interrupt with form data
      stream.submit(
        {},
        {
          command: {
            resume: inputResponses,
          },
        },
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 rounded-2xl bg-gray-50 p-6">
      {/* Step Header */}
      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold text-gray-900">{step.title}</h2>
        {session && (
          <p className="text-sm text-gray-500">
            Step {step.sort} &bull; Session: {session.sessionId.slice(0, 12)}...
          </p>
        )}
      </div>

      {/* Payload Display (for debugging) */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <Label className="text-xs font-medium uppercase text-gray-500">
          Step Payload (read-only)
        </Label>
        <pre className="mt-2 max-h-48 overflow-auto text-xs text-gray-700">
          {JSON.stringify(payload, null, 2)}
        </pre>
      </div>

      {/* JSON Response Input */}
      <div className="flex flex-col gap-2">
        <Label className="text-sm font-medium">Response (JSON)</Label>
        <p className="text-xs text-gray-500">
          Edit the JSON below to set your responses. Format:{" "}
          {`[{ questionId, value }]`}
        </p>
        <Textarea
          value={jsonInput}
          onChange={(e) => setJsonInput(e.target.value)}
          rows={8}
          className="font-mono text-sm"
          placeholder='[{ "questionId": "q-xxx", "value": "..." }]'
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      {/* Submit Button */}
      <div className="flex justify-end">
        <Button
          variant="brand"
          onClick={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? "Submitting..." : "Submit Response"}
        </Button>
      </div>
    </div>
  );
}
