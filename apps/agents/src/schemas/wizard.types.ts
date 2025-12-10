import { z } from 'zod';
import {
  StepSchema,
  QuestionOptionSchema,
  QuestionAttributesSchema,
  InfoAttributesSchema,
  DocumentAttributesSchema,
  BaseAttributesSchema,
  QuestionElementSchema,
  InfoElementSchema,
  DocumentElementSchema,
  DefaultElementSchema,
  ElementSchema,
  WizardConfigSchema,
  InputResponseSchema,
  ResponseSchema,
  WizardSessionSchema,
  StepPayloadSchema,
  WizardActionSchema,
  LeaveTypeSchema,
} from '../schemas/wizard.schemas.js';

export type Step = z.infer<typeof StepSchema>;
export type QuestionOption = z.infer<typeof QuestionOptionSchema>;
export type QuestionAttributes = z.infer<typeof QuestionAttributesSchema>;
export type InfoAttributes = z.infer<typeof InfoAttributesSchema>;
export type DocumentAttributes = z.infer<typeof DocumentAttributesSchema>;
export type BaseAttributes = z.infer<typeof BaseAttributesSchema>;
export type QuestionElement = z.infer<typeof QuestionElementSchema>;
export type InfoElement = z.infer<typeof InfoElementSchema>;
export type DocumentElement = z.infer<typeof DocumentElementSchema>;
export type DefaultElement = z.infer<typeof DefaultElementSchema>;
export type Element = z.infer<typeof ElementSchema>;
export type WizardConfig = z.infer<typeof WizardConfigSchema>;
export type InputResponse = z.infer<typeof InputResponseSchema>;
export type Response = z.infer<typeof ResponseSchema>;
export type WizardSession = z.infer<typeof WizardSessionSchema>;
export type StepPayload = z.infer<typeof StepPayloadSchema>;
export type WizardAction = z.infer<typeof WizardActionSchema>;
export type LeaveType = z.infer<typeof LeaveTypeSchema>;
