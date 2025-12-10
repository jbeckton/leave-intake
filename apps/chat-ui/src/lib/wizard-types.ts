/**
 * Wizard Types - TypeScript interfaces mirroring agent's Zod schemas
 * From: apps/agents/src/schemas/wizard.schemas.ts
 */

export interface Step {
  stepId: string;
  sort: number;
  name: string;
  title: string;
  semanticTag: string;
  rule?: string;
  ruleContext?: string;
}

export interface QuestionOption {
  optionId: string;
  sort: number;
  label: string;
  value: string;
}

export interface QuestionAttributes {
  componentTypeKey: string;
  questionId: string;
  semanticTag: string;
  questionText: string;
  helperText?: string;
  options?: QuestionOption[];
  validation?: string[];
}

export interface InfoAttributes {
  componentTypeKey: string;
  infoId: string;
  title: string;
  content: string;
}

export interface DocumentAttributes {
  componentTypeKey: string;
  name: string;
  fileName: string;
  downloadUrl: string;
}

export interface QuestionElement {
  elementId: string;
  stepId: string;
  type: "question";
  sort: number;
  isVisible: boolean;
  attributes: QuestionAttributes;
}

export interface InfoElement {
  elementId: string;
  stepId: string;
  type: "info";
  sort: number;
  isVisible: boolean;
  attributes: InfoAttributes;
}

export interface DocumentElement {
  elementId: string;
  stepId: string;
  type: "document";
  sort: number;
  isVisible: boolean;
  attributes: DocumentAttributes;
}

export type Element = QuestionElement | InfoElement | DocumentElement;

export interface Response {
  questionId: string;
  semanticTag: string;
  value: string;
  answeredAt: string;
}

export interface WizardSession {
  sessionId: string;
  wizardId: string;
  employeeId: string;
  createdAt: string;
  updatedAt: string;
  currentStepId: string;
  status: "in-progress" | "review" | "completed" | "abandoned";
  responses: Response[];
}

export interface StepPayload {
  step: Step;
  elements: Element[];
  session: WizardSession | null;
}

export interface InputResponse {
  questionId: string;
  value: string;
}
