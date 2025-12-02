import { z } from 'zod';

/**
 * Step - A discrete phase in the wizard
 */
export const StepSchema = z.object({
  stepId: z.string(),
  sort: z.number(),
  name: z.string(),
  title: z.string(),
  semanticTag: z.string(),
  rule: z.string().optional(), // Boolean condition for step visibility (if undefined, step always passes)
  ruleContext: z.string().optional(), // Additional context for LLM rule evaluation
});

// -----------------------------------------------------------------------------
// Element Attribute Schemas (discriminated by element type)
// -----------------------------------------------------------------------------

/**
 * BaseAttributes - Common attributes for all element types
 */
export const BaseAttributesSchema = z.looseObject({
  componentTypeKey: z.string(),
});

/**
 * Option - For select/radio/checkbox questions
 */
export const QuestionOptionSchema = z.object({
  optionId: z.string(),
  sort: z.number(),
  label: z.string(),
  value: z.string(),
});

/**
 * QuestionAttributes - Attributes for question-type elements
 */
export const QuestionAttributesSchema = BaseAttributesSchema.extend({
  questionId: z.string(),
  semanticTag: z.string(),
  questionText: z.string(),
  helperText: z.string().optional(),
  options: z.array(QuestionOptionSchema).optional(),
  validation: z.array(z.string()).optional(),
});

/**
 * InfoAttributes - Attributes for info-type elements
 */
export const InfoAttributesSchema = BaseAttributesSchema.extend({
  infoId: z.string(),
  title: z.string(),
  content: z.string(),
});

/**
 * DocumentAttributes - Attributes for document-type elements
 */
export const DocumentAttributesSchema = BaseAttributesSchema.extend({
  name: z.string(),
  fileName: z.string(),
  downloadUrl: z.string(),
});

// -----------------------------------------------------------------------------
// Element Schemas (discriminated union)
// -----------------------------------------------------------------------------

const ElementBaseSchema = z.object({
  elementId: z.string(),
  stepId: z.string(),
  type: z.literal('default'),
  sort: z.number(),
  isVisible: z.boolean(),
});

/**
 * QuestionElement - Element with type 'question'
 */
export const QuestionElementSchema = ElementBaseSchema.extend({
  type: z.literal('question'),
  attributes: QuestionAttributesSchema,
});

/**
 * InfoElement - Element with type 'info'
 */
export const InfoElementSchema = ElementBaseSchema.extend({
  type: z.literal('info'),
  attributes: InfoAttributesSchema,
});

/**
 * DocumentElement - Element with type 'document'
 */
export const DocumentElementSchema = ElementBaseSchema.extend({
  type: z.literal('document'),
  attributes: DocumentAttributesSchema,
});

/**
 * DefaultElement - Fallback element type for UI binding
 */
export const DefaultElementSchema = ElementBaseSchema.extend({
  type: z.literal('default'),
  attributes: BaseAttributesSchema,
});

/**
 * Element - Discriminated union of all element types
 */
export const ElementSchema = z.discriminatedUnion('type', [
  QuestionElementSchema,
  InfoElementSchema,
  DocumentElementSchema,
  DefaultElementSchema,
]);

/**
 * WizardConfig - Static definition of a wizard
 */
export const WizardConfigSchema = z
  .object({
    wizardId: z.string(),
    wizardName: z.string(),
    steps: z.array(StepSchema),
    elements: z.array(ElementSchema),
  })
  .superRefine((config, ctx) => {
    const { steps, elements } = config;

    // 1. At least one step
    if (steps.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Config must have at least one step',
        path: ['steps'],
      });
    }

    // 2. Unique step IDs
    const stepIds = new Set<string>();
    for (const step of steps) {
      if (stepIds.has(step.stepId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate stepId: ${step.stepId}`,
          path: ['steps'],
        });
      }
      stepIds.add(step.stepId);
    }

    // 3. Unique element IDs
    const elementIds = new Set<string>();
    for (const element of elements) {
      if (elementIds.has(element.elementId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate elementId: ${element.elementId}`,
          path: ['elements'],
        });
      }
      elementIds.add(element.elementId);
    }

    // 4. Every element's stepId must reference a valid step
    for (const element of elements) {
      if (!stepIds.has(element.stepId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Element "${element.elementId}" references non-existent step "${element.stepId}"`,
          path: ['elements'],
        });
      }
    }
  });

/**
 * InputResponse - What the UI submits (minimal)
 */
export const InputResponseSchema = z.object({
  questionId: z.string(),
  value: z.string(),
});

/**
 * Response - Enriched response stored in state (read-only semanticTag from config)
 */
export const ResponseSchema = z.object({
  questionId: z.string(),
  semanticTag: z.string(), // Populated by agent from config (read-only)
  value: z.string(),
  answeredAt: z.string(), // Generated by agent
});

/**
 * WizardSession - Runtime state of a wizard instance
 */
export const WizardSessionSchema = z.object({
  sessionId: z.string(),
  wizardId: z.string(),
  employeeId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  currentStepId: z.string(),
  status: z.enum(['in-progress', 'review', 'completed', 'abandoned']),
  responses: z.array(ResponseSchema),
});

/**
 * StepPayload - Data returned to UI for rendering a step
 */
export const StepPayloadSchema = z.object({
  step: StepSchema,
  elements: z.array(ElementSchema),
  session: WizardSessionSchema.nullable(),
});

/**
 * WizardAction - Actions that can be performed on the wizard
 */
export const WizardActionSchema = z.enum(['init', 'respond', 'resume']);

/**
 * Valid leave types
 */
export const LeaveTypeSchema = z.enum(['pregnancy-adoption', 'medical', 'family-care']);
