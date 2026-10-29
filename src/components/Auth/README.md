# components/Auth/

Sign-in page steps that sit inside `pages/LoginPage.tsx`.

- **`MfaSignInStep.tsx`**: the second-factor step (enrolment, recovery codes, code entry).
- **`PasswordResetRequest.tsx`** (Batch 711): Forgot password? on the sign-in page. Takes the sign-in email, calls `passwordResetRequestService.request`, and shows the same confirmation whether or not the email has an account. Password sign-in only (the demo); the service refuses under SSO. Renders and dispatches; the decisions are in `services/staffPasswords/`.
