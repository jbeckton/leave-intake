# Demo Test Flows

Test flows for demonstrating the Leave Intake Wizard's conditional step navigation.

## Quick Reference: Rules by Step

| Step | Rule | Shows When |
|------|------|------------|
| Leave Type | (none) | Always first |
| Leave Dates | `LEAVE_TYPE is provided` | After leave type selected |
| Work Info | `EXPECTED_DATE is provided` | After dates entered |
| Medical Docs | `LEAVE_TYPE equals "medical"` | Medical leave only |
| Family Member | `LEAVE_TYPE equals "family-care"` | Family care only |
| CFRA | `LEAVE_TYPE equals "pregnancy-adoption" AND WORK_STATE equals "CA"` | Pregnancy + California |
| Extended Leave | `LEAVE_DURATION equals "12_weeks" AND (LEAVE_TYPE equals "pregnancy-adoption" OR LEAVE_TYPE equals "medical")` | 12 weeks + pregnancy/medical |
| NY PFL | `WORK_STATE equals "NY" AND LEAVE_TYPE is NOT "family-care"` | New York + not family care |
| Review | (none) | Always last |

---

## All Steps in Config

**Leave Type** → **Leave Dates** → **Work Info** → Medical Docs → Family Member → CFRA → Extended Leave → NY PFL → **Review**

*Bold steps are always shown. Non-bold steps are conditional.*

---

## Flow 1: Pregnancy + California + 12 Weeks

**Expected Flow:** Leave Type → Leave Dates → Work Info → CFRA → Extended Leave → Review

**Skipped Steps:**
- Medical Docs (not medical leave)
- Family Member (not family care)
- NY PFL (not NY)

---

### Step 1: Initialize
```json
{ "wizardAction": "init" }
```

### Step 2: Leave Type
```json
{
  "wizardAction": "respond",
  "inputStepId": "step-leave-type",
  "inputResponses": [
    { "questionId": "q-leave-type", "value": "pregnancy-adoption" },
    { "questionId": "q-leave-duration", "value": "12_weeks" }
  ]
}
```

### Step 3: Leave Dates
```json
{
  "wizardAction": "respond",
  "inputStepId": "step-leave-dates",
  "inputResponses": [
    { "questionId": "q-expected-date", "value": "2025-08-15" }
  ]
}
```

### Step 4: Work Information
```json
{
  "wizardAction": "respond",
  "inputStepId": "step-work-info",
  "inputResponses": [
    { "questionId": "q-work-state", "value": "CA" },
    { "questionId": "q-manager-name", "value": "Jane Smith" }
  ]
}
```

### Step 5: CFRA Eligibility
```json
{
  "wizardAction": "respond",
  "inputStepId": "step-cfra",
  "inputResponses": [
    { "questionId": "q-cfra-acknowledge", "value": "true" }
  ]
}
```

### Step 6: Extended Leave Approval
```json
{
  "wizardAction": "respond",
  "inputStepId": "step-extended-leave",
  "inputResponses": [
    { "questionId": "q-extended-acknowledge", "value": "true" },
    { "questionId": "q-hr-contact-preference", "value": "email" }
  ]
}
```

### Step 7: Review
Wizard complete.

---

## Flow 2: Medical + New York + 8 Weeks

**Expected Flow:** Leave Type → Leave Dates → Work Info → Medical Docs → NY PFL → Review

**Skipped Steps:**
- Family Member (not family care)
- CFRA (not CA or not pregnancy)
- Extended Leave (not 12 weeks)

---

### Step 1: Initialize
```json
{ "wizardAction": "init" }
```

### Step 2: Leave Type
```json
{
  "wizardAction": "respond",
  "inputStepId": "step-leave-type",
  "inputResponses": [
    { "questionId": "q-leave-type", "value": "medical" },
    { "questionId": "q-leave-duration", "value": "8_weeks" }
  ]
}
```

### Step 3: Leave Dates
```json
{
  "wizardAction": "respond",
  "inputStepId": "step-leave-dates",
  "inputResponses": [
    { "questionId": "q-expected-date", "value": "2025-07-01" }
  ]
}
```

### Step 4: Work Information
```json
{
  "wizardAction": "respond",
  "inputStepId": "step-work-info",
  "inputResponses": [
    { "questionId": "q-work-state", "value": "NY" },
    { "questionId": "q-manager-name", "value": "John Doe" }
  ]
}
```

### Step 5: Medical Documentation
```json
{
  "wizardAction": "respond",
  "inputStepId": "step-medical-docs",
  "inputResponses": [
    { "questionId": "q-physician-name", "value": "Dr. Sarah Johnson" },
    { "questionId": "q-condition-type", "value": "surgery" }
  ]
}
```

### Step 6: NY Paid Family Leave
```json
{
  "wizardAction": "respond",
  "inputStepId": "step-ny-pfl",
  "inputResponses": [
    { "questionId": "q-ny-pfl-apply", "value": "yes" }
  ]
}
```

### Step 7: Review
Wizard complete.

---

## Flow 3: Family Care + Texas

**Expected Flow:** Leave Type → Leave Dates → Work Info → Family Member → Review

**Skipped Steps:**
- Medical Docs (not medical leave)
- CFRA (not pregnancy + not CA)
- Extended Leave (family-care excluded from rule)
- NY PFL (not NY + family-care excluded)

---

### Step 1: Initialize
```json
{ "wizardAction": "init" }
```

### Step 2: Leave Type
```json
{
  "wizardAction": "respond",
  "inputStepId": "step-leave-type",
  "inputResponses": [
    { "questionId": "q-leave-type", "value": "family-care" },
    { "questionId": "q-leave-duration", "value": "6_weeks" }
  ]
}
```

### Step 3: Leave Dates
```json
{
  "wizardAction": "respond",
  "inputStepId": "step-leave-dates",
  "inputResponses": [
    { "questionId": "q-expected-date", "value": "2025-06-01" }
  ]
}
```

### Step 4: Work Information
```json
{
  "wizardAction": "respond",
  "inputStepId": "step-work-info",
  "inputResponses": [
    { "questionId": "q-work-state", "value": "TX" },
    { "questionId": "q-manager-name", "value": "Bob Wilson" }
  ]
}
```

### Step 5: Family Member Information
```json
{
  "wizardAction": "respond",
  "inputStepId": "step-family-member",
  "inputResponses": [
    { "questionId": "q-family-relationship", "value": "parent" },
    { "questionId": "q-family-condition", "value": "surgery" }
  ]
}
```

### Step 6: Review
Wizard complete.

---

## Flow 4: Medical + New York + 12 Weeks

**Expected Flow:** Leave Type → Leave Dates → Work Info → Medical Docs → Extended Leave → NY PFL → Review

**Skipped Steps:**
- Family Member (not family care)
- CFRA (not CA or not pregnancy)

---

### Step 1: Initialize
```json
{ "wizardAction": "init" }
```

### Step 2: Leave Type
```json
{
  "wizardAction": "respond",
  "inputStepId": "step-leave-type",
  "inputResponses": [
    { "questionId": "q-leave-type", "value": "medical" },
    { "questionId": "q-leave-duration", "value": "12_weeks" }
  ]
}
```

### Step 3: Leave Dates
```json
{
  "wizardAction": "respond",
  "inputStepId": "step-leave-dates",
  "inputResponses": [
    { "questionId": "q-expected-date", "value": "2025-09-01" }
  ]
}
```

### Step 4: Work Information
```json
{
  "wizardAction": "respond",
  "inputStepId": "step-work-info",
  "inputResponses": [
    { "questionId": "q-work-state", "value": "NY" },
    { "questionId": "q-manager-name", "value": "Alice Brown" }
  ]
}
```

### Step 5: Medical Documentation
```json
{
  "wizardAction": "respond",
  "inputStepId": "step-medical-docs",
  "inputResponses": [
    { "questionId": "q-physician-name", "value": "Dr. Michael Chen" },
    { "questionId": "q-condition-type", "value": "chronic" }
  ]
}
```

### Step 6: Extended Leave Approval
```json
{
  "wizardAction": "respond",
  "inputStepId": "step-extended-leave",
  "inputResponses": [
    { "questionId": "q-extended-acknowledge", "value": "true" },
    { "questionId": "q-hr-contact-preference", "value": "video" }
  ]
}
```

### Step 7: NY Paid Family Leave
```json
{
  "wizardAction": "respond",
  "inputStepId": "step-ny-pfl",
  "inputResponses": [
    { "questionId": "q-ny-pfl-apply", "value": "yes" }
  ]
}
```

### Step 8: Review
Wizard complete.

---

## Chat Integration Test

Test asking questions mid-wizard while maintaining session state.

### Step 1: Initialize wizard
```json
{ "wizardAction": "init" }
```

### Step 2: Submit leave type
```json
{
  "wizardAction": "respond",
  "inputStepId": "step-leave-type",
  "inputResponses": [
    { "questionId": "q-leave-type", "value": "pregnancy-adoption" },
    { "questionId": "q-leave-duration", "value": "12_weeks" }
  ]
}
```

### Step 3: Ask a question (no wizardAction)
```json
{
  "messages": [
    { "role": "user", "content": "What is CFRA and am I eligible?" }
  ]
}
```

**Expected:** Chat agent uses `getWizardContext` tool to see user selected pregnancy-adoption, responds about CFRA eligibility depending on work state.

### Step 4: Continue wizard
```json
{
  "wizardAction": "respond",
  "inputStepId": "step-leave-dates",
  "inputResponses": [
    { "questionId": "q-expected-date", "value": "2025-08-15" }
  ]
}
```

**Expected:** Wizard continues from where it left off (session preserved via checkpointer).

---

## Rule Complexity Summary

| Complexity | Example | Rule |
|------------|---------|------|
| Simple equality | Medical Docs | `LEAVE_TYPE equals "medical"` |
| AND condition | CFRA | `LEAVE_TYPE equals "pregnancy-adoption" AND WORK_STATE equals "CA"` |
| AND + OR | Extended Leave | `LEAVE_DURATION equals "12_weeks" AND (LEAVE_TYPE equals "pregnancy-adoption" OR LEAVE_TYPE equals "medical")` |
| AND + NOT | NY PFL | `WORK_STATE equals "NY" AND LEAVE_TYPE is NOT "family-care"` |
