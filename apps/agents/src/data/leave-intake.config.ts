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
      ruleContext: '',
    },
    {
      stepId: 'step-work-info',
      sort: 3,
      name: 'work-info',
      title: 'Work Information',
      semanticTag: 'INTAKE:STEP:WORK_INFO',
      rule: 'INTAKE:QUESTION:EXPECTED_DATE is provided',
      ruleContext: '',
    },
    // Step 4: Medical Documentation (medical leave only)
    {
      stepId: 'step-medical-docs',
      sort: 4,
      name: 'medical-documentation',
      title: 'Medical Documentation',
      semanticTag: 'INTAKE:STEP:MEDICAL_DOCS',
      rule: 'INTAKE:QUESTION:LEAVE_TYPE equals "medical"',
      ruleContext: 'This step collects medical documentation details for medical leave requests.',
    },
    // Step 5: Family Member Information (family care only)
    {
      stepId: 'step-family-member',
      sort: 5,
      name: 'family-member-info',
      title: 'Family Member Information',
      semanticTag: 'INTAKE:STEP:FAMILY_MEMBER',
      rule: 'INTAKE:QUESTION:LEAVE_TYPE equals "family-care"',
      ruleContext: 'This step collects information about the family member requiring care.',
    },
    // Step 6: CFRA Eligibility (CA + pregnancy/adoption only)
    {
      stepId: 'step-cfra',
      sort: 6,
      name: 'cfra-eligibility',
      title: 'CFRA Eligibility',
      semanticTag: 'INTAKE:STEP:CFRA',
      rule: 'INTAKE:QUESTION:LEAVE_TYPE equals "pregnancy-adoption" AND INTAKE:QUESTION:WORK_STATE equals "CA"',
      ruleContext: 'CFRA provides additional leave protections for California employees taking pregnancy/adoption leave.',
    },
    // Step 7: Extended Leave Approval (12 weeks + pregnancy or medical)
    {
      stepId: 'step-extended-leave',
      sort: 7,
      name: 'extended-leave-approval',
      title: 'Extended Leave Approval',
      semanticTag: 'INTAKE:STEP:EXTENDED_LEAVE',
      rule: 'INTAKE:QUESTION:LEAVE_DURATION equals "12_weeks" AND (INTAKE:QUESTION:LEAVE_TYPE equals "pregnancy-adoption" OR INTAKE:QUESTION:LEAVE_TYPE equals "medical")',
      ruleContext: 'Extended leave of 12 weeks requires additional approval and HR coordination.',
    },
    // Step 8: NY Paid Family Leave (NY + not family-care)
    {
      stepId: 'step-ny-pfl',
      sort: 8,
      name: 'ny-paid-family-leave',
      title: 'NY Paid Family Leave',
      semanticTag: 'INTAKE:STEP:NY_PFL',
      rule: 'INTAKE:QUESTION:WORK_STATE equals "NY" AND INTAKE:QUESTION:LEAVE_TYPE is NOT "family-care"',
      ruleContext: 'New York provides Paid Family Leave benefits for pregnancy and medical leave.',
    },
    // Step 9: Review & Submit (always shown)
    {
      stepId: 'step-review',
      sort: 9,
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
    // Step 4: Medical Documentation
    {
      elementId: 'el-medical-info',
      stepId: 'step-medical-docs',
      type: 'info',
      sort: 1,
      isVisible: true,
      attributes: {
        componentTypeKey: 'infoCard',
        infoId: 'info-medical',
        title: 'Medical Documentation Required',
        content: 'Please provide information about your medical provider and condition type. You will need to submit official documentation within 15 days of your leave start date.',
      },
    },
    {
      elementId: 'el-physician-name',
      stepId: 'step-medical-docs',
      type: 'question',
      sort: 2,
      isVisible: true,
      attributes: {
        questionId: 'q-physician-name',
        semanticTag: 'INTAKE:QUESTION:PHYSICIAN_NAME',
        componentTypeKey: 'text',
        questionText: 'What is your treating physician\'s name?',
        helperText: 'Enter the full name of your primary care provider or specialist.',
        validation: ['required'],
      },
    },
    {
      elementId: 'el-condition-type',
      stepId: 'step-medical-docs',
      type: 'question',
      sort: 3,
      isVisible: true,
      attributes: {
        questionId: 'q-condition-type',
        semanticTag: 'INTAKE:QUESTION:CONDITION_TYPE',
        componentTypeKey: 'select',
        questionText: 'What type of medical condition requires leave?',
        options: [
          { optionId: 'opt-surgery', sort: 1, label: 'Scheduled Surgery', value: 'surgery' },
          { optionId: 'opt-illness', sort: 2, label: 'Serious Illness', value: 'illness' },
          { optionId: 'opt-injury', sort: 3, label: 'Injury/Accident', value: 'injury' },
          { optionId: 'opt-chronic', sort: 4, label: 'Chronic Condition', value: 'chronic' },
        ],
        validation: ['required'],
      },
    },
    // Step 5: Family Member Information
    {
      elementId: 'el-family-info',
      stepId: 'step-family-member',
      type: 'info',
      sort: 1,
      isVisible: true,
      attributes: {
        componentTypeKey: 'infoCard',
        infoId: 'info-family',
        title: 'Family Care Leave',
        content: 'Family care leave allows you to care for a qualifying family member with a serious health condition.',
      },
    },
    {
      elementId: 'el-family-relationship',
      stepId: 'step-family-member',
      type: 'question',
      sort: 2,
      isVisible: true,
      attributes: {
        questionId: 'q-family-relationship',
        semanticTag: 'INTAKE:QUESTION:FAMILY_RELATIONSHIP',
        componentTypeKey: 'select',
        questionText: 'What is your relationship to the family member?',
        options: [
          { optionId: 'opt-spouse', sort: 1, label: 'Spouse/Domestic Partner', value: 'spouse' },
          { optionId: 'opt-child', sort: 2, label: 'Child', value: 'child' },
          { optionId: 'opt-parent', sort: 3, label: 'Parent', value: 'parent' },
          { optionId: 'opt-sibling', sort: 4, label: 'Sibling', value: 'sibling' },
        ],
        validation: ['required'],
      },
    },
    {
      elementId: 'el-family-condition',
      stepId: 'step-family-member',
      type: 'question',
      sort: 3,
      isVisible: true,
      attributes: {
        questionId: 'q-family-condition',
        semanticTag: 'INTAKE:QUESTION:FAMILY_CONDITION',
        componentTypeKey: 'select',
        questionText: 'What is the nature of their health condition?',
        options: [
          { optionId: 'opt-fam-surgery', sort: 1, label: 'Surgery/Recovery', value: 'surgery' },
          { optionId: 'opt-fam-illness', sort: 2, label: 'Serious Illness', value: 'illness' },
          { optionId: 'opt-fam-hospice', sort: 3, label: 'Hospice/End of Life', value: 'hospice' },
          { optionId: 'opt-fam-chronic', sort: 4, label: 'Chronic Condition', value: 'chronic' },
        ],
        validation: ['required'],
      },
    },
    // Step 7: Extended Leave Approval
    {
      elementId: 'el-extended-info',
      stepId: 'step-extended-leave',
      type: 'info',
      sort: 1,
      isVisible: true,
      attributes: {
        componentTypeKey: 'infoCard',
        infoId: 'info-extended',
        title: 'Extended Leave (12 Weeks)',
        content: 'Extended leave of 12 weeks requires additional coordination with HR and may affect your benefits. Please review the information below and acknowledge.',
      },
    },
    {
      elementId: 'el-extended-acknowledge',
      stepId: 'step-extended-leave',
      type: 'question',
      sort: 2,
      isVisible: true,
      attributes: {
        questionId: 'q-extended-acknowledge',
        semanticTag: 'INTAKE:QUESTION:EXTENDED_ACKNOWLEDGE',
        componentTypeKey: 'checkbox',
        questionText: 'I understand that 12-week leave requires HR approval and I will schedule a call with my HR representative.',
        validation: ['required'],
      },
    },
    {
      elementId: 'el-hr-contact-preference',
      stepId: 'step-extended-leave',
      type: 'question',
      sort: 3,
      isVisible: true,
      attributes: {
        questionId: 'q-hr-contact-preference',
        semanticTag: 'INTAKE:QUESTION:HR_CONTACT_PREFERENCE',
        componentTypeKey: 'select',
        questionText: 'How would you prefer HR to contact you?',
        options: [
          { optionId: 'opt-email', sort: 1, label: 'Email', value: 'email' },
          { optionId: 'opt-phone', sort: 2, label: 'Phone Call', value: 'phone' },
          { optionId: 'opt-video', sort: 3, label: 'Video Meeting', value: 'video' },
        ],
        validation: ['required'],
      },
    },
    // Step 8: NY Paid Family Leave
    {
      elementId: 'el-ny-pfl-info',
      stepId: 'step-ny-pfl',
      type: 'info',
      sort: 1,
      isVisible: true,
      attributes: {
        componentTypeKey: 'infoCard',
        infoId: 'info-ny-pfl',
        title: 'New York Paid Family Leave (NY PFL)',
        content: 'As a New York employee, you may be eligible for Paid Family Leave benefits which provide partial wage replacement during your leave. NY PFL covers up to 12 weeks of paid leave.',
      },
    },
    {
      elementId: 'el-ny-pfl-apply',
      stepId: 'step-ny-pfl',
      type: 'question',
      sort: 2,
      isVisible: true,
      attributes: {
        questionId: 'q-ny-pfl-apply',
        semanticTag: 'INTAKE:QUESTION:NY_PFL_APPLY',
        componentTypeKey: 'select',
        questionText: 'Would you like to apply for NY Paid Family Leave benefits?',
        options: [
          { optionId: 'opt-pfl-yes', sort: 1, label: 'Yes, I want to apply for NY PFL', value: 'yes' },
          { optionId: 'opt-pfl-no', sort: 2, label: 'No, I do not need PFL benefits', value: 'no' },
          { optionId: 'opt-pfl-later', sort: 3, label: 'I\'ll decide later', value: 'later' },
        ],
        validation: ['required'],
      },
    },
    // Step 9: Review
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
