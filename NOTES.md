# Leave Intake Wizard - Data Structures

## Step

```json
{
  "stepId": "step-leave-type",
  "sort": 1,
  "name": "leave-type-selection",
  "title": "Leave Type",
  "semanticTag": "INTAKE:STEP:LEAVE_TYPE"
}
```

## Elements

```json
[
  {
    "elementId": "el-leave-type",
    "stepId": "step-leave-type",
    "type": "question",
    "sort": 1,
    "isVisible": true,
    "attributes": {
      "componentTypeKey": "select",
      "questionId": "q-leave-type",
      "semanticTag": "INTAKE:QUESTION:LEAVE_TYPE",
      "questionText": "Select your leave type",
      "options": [
        {
          "optionId": "opt-preg",
          "sort": 1,
          "label": "Pregnancy & Adoption",
          "value": "pregnancy-adoption"
        },
        {
          "optionId": "opt-medical",
          "sort": 2,
          "label": "Medical Leave",
          "value": "medical"
        },
        {
          "optionId": "opt-family",
          "sort": 3,
          "label": "Family Care",
          "value": "family-care"
        }
      ],
      "validation": ["required"]
    }
  },
  {
    "elementId": "el-leave-duration",
    "stepId": "step-leave-type",
    "type": "question",
    "sort": 2,
    "isVisible": true,
    "attributes": {
      "componentTypeKey": "select",
      "questionId": "q-leave-duration",
      "semanticTag": "INTAKE:QUESTION:LEAVE_DURATION",
      "questionText": "How long do you plan to take leave?",
      "options": [
        {
          "optionId": "opt-6w",
          "sort": 1,
          "label": "6 weeks",
          "value": "6_weeks"
        },
        {
          "optionId": "opt-8w",
          "sort": 2,
          "label": "8 weeks",
          "value": "8_weeks"
        },
        {
          "optionId": "opt-12w",
          "sort": 3,
          "label": "12 weeks",
          "value": "12_weeks"
        }
      ],
      "validation": ["required"]
    }
  }
]
```

## Session

```json
{
  "sessionId": "sess-1765396133946-57ucaaf",
  "wizardId": "leave-intake-v1",
  "employeeId": "unknown",
  "createdAt": "2025-12-10T19:48:53.946Z",
  "updatedAt": "2025-12-10T19:48:53.946Z",
  "currentStepId": "step-leave-type",
  "status": "in-progress",
  "responses": []
}
```