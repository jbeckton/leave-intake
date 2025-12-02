import type { WizardConfig } from '../schemas/wizard.types.js';

/**
 * Leave Intake Wizard - Unified config for all leave types
 *
 * Step visibility is controlled by the rules engine based on leave type
 * and other responses. All steps are defined here with conditional rules.
 */
export const leaveIntakeConfig: WizardConfig = {
  wizardId: 'leave-intake-v1',
  wizardName: 'Leave of Absence Request',
  steps: [
    {
      stepId: 'step-leave-type',
      sort: 1,
      name: 'leave-type-selection',
      title: 'Leave Type',
      semanticTag: 'INTAKE:STEP:LEAVE_TYPE',
      // No rule - always shown as first step
    },
    {
      stepId: 'step-leave-dates',
      sort: 2,
      name: 'leave-dates',
      title: 'Leave Dates',
      semanticTag: 'INTAKE:STEP:LEAVE_DATES',
      rule: 'INTAKE:QUESTION:LEAVE_TYPE is provided',
    },
    {
      stepId: 'step-work-info',
      sort: 3,
      name: 'work-info',
      title: 'Work Information',
      semanticTag: 'INTAKE:STEP:WORK_INFO',
      rule: 'INTAKE:QUESTION:EXPECTED_DATE is provided',
    },
    {
      stepId: 'step-cfra',
      sort: 4,
      name: 'cfra-eligibility',
      title: 'CFRA Eligibility',
      semanticTag: 'INTAKE:STEP:CFRA',
      rule: 'INTAKE:QUESTION:LEAVE_TYPE equals "pregnancy-adoption" AND INTAKE:QUESTION:WORK_STATE equals "CA"',
    },
    {
      stepId: 'step-review',
      sort: 5,
      name: 'review',
      title: 'Review & Submit',
      semanticTag: 'INTAKE:STEP:REVIEW',
      // No rule - always shown as final step
    },
  ],
  elements: [
    // Step 1: Leave Type Selection
    {
      elementId: 'el-leave-type',
      stepId: 'step-leave-type',
      type: 'question',
      sort: 1,
      isVisible: true,
      attributes: {
        questionId: 'q-leave-type',
        semanticTag: 'INTAKE:QUESTION:LEAVE_TYPE',
        componentTypeKey: 'select',
        questionText: 'Select your leave type',
        options: [
          { optionId: 'opt-preg', sort: 1, label: 'Pregnancy & Adoption', value: 'pregnancy-adoption' },
          { optionId: 'opt-medical', sort: 2, label: 'Medical Leave', value: 'medical' },
          { optionId: 'opt-family', sort: 3, label: 'Family Care', value: 'family-care' },
        ],
        validation: ['required'],
      },
    },
    {
      elementId: 'el-leave-duration',
      stepId: 'step-leave-type',
      type: 'question',
      sort: 2,
      isVisible: true,
      attributes: {
        questionId: 'q-leave-duration',
        semanticTag: 'INTAKE:QUESTION:LEAVE_DURATION',
        componentTypeKey: 'select',
        questionText: 'How long do you plan to take leave?',
        options: [
          { optionId: 'opt-6w', sort: 1, label: '6 weeks', value: '6_weeks' },
          { optionId: 'opt-8w', sort: 2, label: '8 weeks', value: '8_weeks' },
          { optionId: 'opt-12w', sort: 3, label: '12 weeks', value: '12_weeks' },
        ],
        validation: ['required'],
      },
    },
    // Step 2: Leave Dates
    {
      elementId: 'el-expected-date',
      stepId: 'step-leave-dates',
      type: 'question',
      sort: 1,
      isVisible: true,
      attributes: {
        questionId: 'q-expected-date',
        semanticTag: 'INTAKE:QUESTION:EXPECTED_DATE',
        componentTypeKey: 'datePicker',
        questionText: 'What is your expected due date or adoption date?',
        helperText: 'Approximate date is fine.',
        validation: ['required', 'futureDate'],
      },
    },
    // Step 3: Work Information
    {
      elementId: 'el-work-state',
      stepId: 'step-work-info',
      type: 'question',
      sort: 1,
      isVisible: true,
      attributes: {
        questionId: 'q-work-state',
        semanticTag: 'INTAKE:QUESTION:WORK_STATE',
        componentTypeKey: 'select',
        questionText: 'In which state do you primarily work?',
        options: [
          { optionId: 'opt-ca', sort: 1, label: 'California', value: 'CA' },
          { optionId: 'opt-ny', sort: 2, label: 'New York', value: 'NY' },
          { optionId: 'opt-tx', sort: 3, label: 'Texas', value: 'TX' },
          { optionId: 'opt-other', sort: 4, label: 'Other', value: 'OTHER' },
        ],
        validation: ['required'],
      },
    },
    {
      elementId: 'el-manager-name',
      stepId: 'step-work-info',
      type: 'question',
      sort: 2,
      isVisible: true,
      attributes: {
        questionId: 'q-manager-name',
        semanticTag: 'INTAKE:QUESTION:MANAGER_NAME',
        componentTypeKey: 'text',
        questionText: 'What is your manager\'s name?',
        validation: ['required'],
      },
    },
    // Step 4: CFRA Eligibility (California + Pregnancy/Adoption only)
    {
      elementId: 'el-cfra-info',
      stepId: 'step-cfra',
      type: 'info',
      sort: 1,
      isVisible: true,
      attributes: {
        componentTypeKey: 'infoCard',
        infoId: 'info-cfra',
        title: 'California Family Rights Act (CFRA)',
        content: 'As a California employee, you may be eligible for additional leave protections under CFRA.',
      },
    },
    {
      elementId: 'el-cfra-acknowledge',
      stepId: 'step-cfra',
      type: 'question',
      sort: 2,
      isVisible: true,
      attributes: {
        questionId: 'q-cfra-acknowledge',
        semanticTag: 'INTAKE:QUESTION:CFRA_ACKNOWLEDGE',
        componentTypeKey: 'checkbox',
        questionText: 'I acknowledge that I have read the CFRA information.',
        validation: ['required'],
      },
    },
    // Step 5: Review
    {
      elementId: 'el-review-info',
      stepId: 'step-review',
      type: 'info',
      sort: 1,
      isVisible: true,
      attributes: {
        componentTypeKey: 'infoCard',
        infoId: 'info-review',
        title: 'Review Your Information',
        content: 'Please review your leave request details before submitting.',
      },
    },
  ],
};
