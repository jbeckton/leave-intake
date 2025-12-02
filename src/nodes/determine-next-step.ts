import type { WizardStateType } from '../state/wizard-state.js';
import type { Response, Step } from '../schemas/wizard.types.js';
import { geminiModel } from '../utils/llm-models.utils.js';
import { z } from 'zod';

const RuleResultSchema = z.object({
  stepId: z.string(),
  isRulePassed: z.boolean(),
});

const RuleEvaluationResultSchema = z.array(RuleResultSchema);

/**
 * Build response context as a simple key-value map
 * Key: semanticTag, Value: response value (can be JSON, CSV, etc.)
 */
const buildResponseContext = (responses: Response[]): Record<string, string> => {
  const context: Record<string, string> = {};
  for (const r of responses) {
    context[r.semanticTag] = r.value;
  }
  return context;
};

interface RuleForPrompt {
  stepId: string
  rule: string
  ruleContext?: string
}

/**
 * Format a step's rule for the LLM prompt
 * Includes ruleContext if provided
 */
const formatRuleForPrompt = (step: RuleForPrompt): string => {
  let formatted = `- stepId: "${step.stepId}"\n  rule: "${step.rule}"`;
  if (step.ruleContext) {
    formatted += `\n  context: "${step.ruleContext}"`;
  }
  return formatted;
};

/**
 * Determine Next Step Node
 *
 * Evaluates rules for all future steps using LLM and returns the next step.
 * Steps without rules are explicitly set to isRulePassed = true.
 */
export const determineNextStep = async (state: WizardStateType) => {
  const { config, currentStep, session } = state;

  if (!config || !currentStep || !session) {
    throw new Error('Cannot determine next step without config, currentStep, and session');
  }

  // Get all future steps (sort > current sort), ordered by sort
  const futureSteps = config.steps
    .filter(s => s.sort > currentStep.sort)
    .sort((a, b) => a.sort - b.sort);

  // If no future steps, wizard is complete
  if (futureSteps.length === 0) {
    return {
      currentStep: null, // Signals completion
      stepRuleResults: {},
    };
  }

  // Initialize all future steps in ruleResults
  // Steps without rules are explicitly set to true
  const ruleResults: Record<string, boolean> = {};
  for (const step of futureSteps) {
    if (!step.rule) {
      ruleResults[step.stepId] = true; // No rule = always pass
    }
  }

  // Get steps that have rules to evaluate
  const stepsWithRules = futureSteps.filter((s): s is Step & { rule: string } => !!s.rule);

  // If there are steps with rules, evaluate them with LLM
  if (stepsWithRules.length > 0) {
    const responseContext = buildResponseContext(session.responses);

    const prompt = `You are evaluating boolean conditions based on user responses.

## User Responses

**Example**

  {
    "QUESTIONKEY": "RESPONSEVALUE",
  }

**Actual User Responses**
${JSON.stringify(responseContext, null, 2)}

## Rules to Evaluate
For each rule below, evaluate whether it is TRUE or FALSE based on the user responses.
Return a JSON array with stepId and isRulePassed (boolean) for each.

${stepsWithRules.map(s => formatRuleForPrompt({ stepId: s.stepId, rule: s.rule, ruleContext: s.ruleContext })).join('\n\n')}

Return ONLY valid JSON array, no explanation.`;

    const llmResponse = await geminiModel.invoke(prompt);
    const content = typeof llmResponse.content === 'string'
      ? llmResponse.content
      : JSON.stringify(llmResponse.content);

    // Parse JSON from response (handle markdown code blocks)
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('LLM did not return valid JSON array for rule evaluation');
    }

    const parsed = RuleEvaluationResultSchema.parse(JSON.parse(jsonMatch[0]));

    for (const result of parsed) {
      ruleResults[result.stepId] = result.isRulePassed;
    }
  }

  // Find next step: first future step (by sort order) where rule passed
  const nextStep = futureSteps.find(s => ruleResults[s.stepId] === true);

  if (!nextStep) {
    // All future steps failed rules - wizard is complete
    return {
      currentStep: null,
      stepRuleResults: ruleResults,
    };
  }

  // Update session with new current step
  const updatedSession = {
    ...session,
    currentStepId: nextStep.stepId,
    updatedAt: new Date().toISOString(),
  };

  return {
    currentStep: nextStep,
    session: updatedSession,
    stepRuleResults: ruleResults,
  };
};
