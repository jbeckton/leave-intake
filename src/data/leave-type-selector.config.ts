import type { WizardConfig } from '../schemas/wizard.types.js';

/**
 * Leave Type Selector - Step 0 wizard for selecting leave type
 */
export const leaveTypeSelectorConfig: WizardConfig = {
  wizardId: 'leave-type-selector',
  wizardName: 'Select Leave Type',
  steps: [
    {
      stepId: 'step-leave-type',
      sort: 0,
      name: 'leave-type-selection',
      title: 'What type of leave are you requesting?',
      semanticTag: 'INTAKE:STEP:LEAVE_TYPE',
    },
  ],
  elements: [
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
        semanticTag: 'PREG:QUESTION:LEAVE_DURATION',
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
  ],
};
