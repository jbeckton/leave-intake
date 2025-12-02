# Feature: Element Display Rules

## Overview

Add support for **element-level visibility rules** - the same LLM-based rule evaluation we have for steps, but applied to elements within a step.

**Key Insight:** One-question-at-a-time display doesn't require new graph nodes. Config authors can simply define more granular steps (one question per step). The existing step rules engine handles navigation. The only missing piece is element-level visibility rules for conditional questions within a step.

---

## Why Element Rules?

In both display modes (step-at-a-time and question-at-a-time):
- Some questions should only appear based on previous answers
- Example: "CFRA acknowledgment" question only shows if "CFRA info read" = true
- Currently we can only skip entire steps, not individual elements within a step

**With element rules:**
- `prepareStep` filters elements by evaluating their rules
- Only visible elements are returned to the UI
- Same LLM-based evaluation pattern as step rules

---

## Design

### Element Rule Field

Add optional `rule` field to elements (same format as step rules):

```typescript
{
  elementId: 'el-cfra-acknowledge',
  stepId: 'step-cfra',
  type: 'question',
  sort: 2,
  isVisible: true,
  rule: 'INTAKE:QUESTION:CFRA_INFO_READ equals "true"',  // NEW
  ruleContext: 'Optional context for LLM',               // NEW
  attributes: { ... },
}
```

Elements without rules default to visible (same pattern as steps).

### Evaluation in `prepareStep`

Update `prepareStep` to evaluate element rules before returning:

```typescript
export const prepareStep = async (state: WizardStateType) => {
  const { currentStep, config, session } = state;

  // Get all elements for this step
  const stepElements = config.elements
    .filter(el => el.stepId === currentStep.stepId)
    .sort((a, b) => a.sort - b.sort);

  // Evaluate element rules (like we do for step rules)
  const elementsWithRules = stepElements.filter(el => el.rule);
  let elementRuleResults: Record<string, boolean> = {};

  // Default: elements without rules are visible
  for (const el of stepElements) {
    if (!el.rule) {
      elementRuleResults[el.elementId] = true;
    }
  }

  if (elementsWithRules.length > 0) {
    // Call LLM to evaluate element rules
    const responseContext = buildResponseContext(session.responses);
    const results = await evaluateRules(elementsWithRules, responseContext);
    elementRuleResults = { ...elementRuleResults, ...results };
  }

  // Filter to only visible elements
  const visibleElements = stepElements.filter(
    el => elementRuleResults[el.elementId] === true
  );

  return {
    stepPayload: {
      step: currentStep,
      elements: visibleElements,  // Only visible elements
      session,
    },
    elementRuleResults,
  };
};
```

### Shared Rule Evaluation

Extract rule evaluation logic to be reusable for both steps and elements:

```typescript
// src/utils/rule-evaluation.utils.ts
export const evaluateRules = async (
  items: Array<{ id: string; rule: string; ruleContext?: string }>,
  responseContext: Record<string, string>,
): Promise<Record<string, boolean>> => {
  // Same LLM call pattern as determineNextStep
  // Returns { itemId: boolean, ... }
};
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/schemas/wizard.schemas.ts` | Add `rule` and `ruleContext` to ElementSchema |
| `src/state/wizard-state.ts` | Add `elementRuleResults` annotation |
| `src/nodes/prepare-step.ts` | Evaluate element rules before returning |
| `src/utils/rule-evaluation.utils.ts` | **NEW** - shared rule evaluation logic |
| `src/nodes/determine-next-step.ts` | Refactor to use shared evaluation |

---

## Execution Order

1. Add `rule` and `ruleContext` fields to ElementSchema
2. Add `elementRuleResults` state annotation
3. Create `rule-evaluation.utils.ts` with shared evaluation logic
4. Refactor `determineNextStep` to use shared evaluation
5. Update `prepareStep` to evaluate element rules
6. Add example element rule to config for testing
7. Update INTAKE.MD documentation
8. Test in LangGraph Studio

---

## Example Config with Element Rules

```typescript
// step-cfra has two elements, second is conditional
{
  stepId: 'step-cfra',
  sort: 4,
  name: 'cfra-eligibility',
  title: 'CFRA Eligibility',
  rule: 'INTAKE:QUESTION:LEAVE_TYPE equals "pregnancy-adoption" AND INTAKE:QUESTION:WORK_STATE equals "CA"',
},

// Elements for step-cfra
{
  elementId: 'el-cfra-info',
  stepId: 'step-cfra',
  type: 'info',
  sort: 1,
  // No rule - always shown when step is shown
},
{
  elementId: 'el-cfra-acknowledge',
  stepId: 'step-cfra',
  type: 'question',
  sort: 2,
  rule: 'INTAKE:QUESTION:CFRA_INFO_READ equals "true"',  // Only if info was read
  attributes: { ... },
}
```

---

## Testing

### Step Mode (existing behavior + element filtering)

```json
{
  "action": "respond",
  "inputStepId": "step-cfra",
  "inputResponses": [
    { "questionId": "q-cfra-info-read", "value": "true" }
  ]
}
```

Returns step-cfra with only visible elements based on rules.

---

## Out of Scope (Deferred)

- **Dynamic content generation** - Info elements that fetch from knowledge base or generate content via LLM
- **Back navigation** - Ability to go back to previous questions
- **Element-level validation** - Server-side validation before advancing
