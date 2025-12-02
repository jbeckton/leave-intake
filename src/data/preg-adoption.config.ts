import type { WizardConfig } from '../schemas/wizard.types.js';

/**
 * Pregnancy & Adoption Wizard - Full wizard with 3 steps for POC
 */
export const pregAdoptionConfig: WizardConfig = {
  wizardId: 'preg-adoption-v1',
  wizardName: 'Pregnancy & Adoption Leave',
  steps: [
    {
      stepId: 'step-001',
      sort: 1,
      name: 'leave-dates',
      title: 'Leave Dates',
      semanticTag: 'PREG:STEP:LEAVE_DATES',
      // No rule - always shown as first step
    },
    {
      stepId: 'step-002',
      sort: 2,
      name: 'work-info',
      title: 'Work Information',
      semanticTag: 'PREG:STEP:WORK_INFO',
      rule: 'PREG:QUESTION:EXPECTED_DATE is provided',
    },
    {
      stepId: 'step-cfra',
      sort: 3,
      name: 'cfra-eligibility',
      title: 'CFRA Eligibility',
      semanticTag: 'PREG:STEP:CFRA',
      rule: 'PREG:QUESTION:WORK_STATE equals "CA"',
    },
    {
      stepId: 'step-003',
      sort: 4,
      name: 'review',
      title: 'Review & Submit',
      semanticTag: 'PREG:STEP:REVIEW',
      // No rule - always shown as final step
    },
  ],
  elements: [
    // Step 1: Leave Dates
    {
      elementId: 'el-001',
      stepId: 'step-001',
      type: 'question',
      sort: 1,
      isVisible: true,
      attributes: {
        questionId: 'q-expected-date',
        semanticTag: 'PREG:QUESTION:EXPECTED_DATE',
        componentTypeKey: 'datePicker',
        questionText: 'What is your expected due date or adoption date?',
        helperText: 'Approximate date is fine.',
        validation: ['required', 'futureDate'],
      },
    },
    // Step 2: Work Information
    {
      elementId: 'el-003',
      stepId: 'step-002',
      type: 'question',
      sort: 1,
      isVisible: true,
      attributes: {
        questionId: 'q-work-state',
        semanticTag: 'PREG:QUESTION:WORK_STATE',
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
      elementId: 'el-004',
      stepId: 'step-002',
      type: 'question',
      sort: 2,
      isVisible: true,
      attributes: {
        questionId: 'q-manager-name',
        semanticTag: 'PREG:QUESTION:MANAGER_NAME',
        componentTypeKey: 'text',
        questionText: 'What is your manager\'s name?',
        validation: ['required'],
      },
    },
    // Step 3: CFRA Eligibility (California only)
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
      elementId: 'el-cfra-dummy',
      stepId: 'step-cfra',
      type: 'question',
      sort: 2,
      isVisible: true,
      attributes: {
        questionId: 'q-cfra-acknowledge',
        semanticTag: 'PREG:QUESTION:CFRA_ACKNOWLEDGE',
        componentTypeKey: 'checkbox',
        questionText: 'I acknowledge that I have read the CFRA information.',
        validation: ['required'],
      },
    },
    // Step 4: Review
    {
      elementId: 'el-005',
      stepId: 'step-003',
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
