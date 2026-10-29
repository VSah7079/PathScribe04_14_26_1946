

# services/feedback

## Batch 447: the QA feedback button is a Configuration setting

It used to be the build settings `VITE_QA_ENABLED`, `VITE_QA_EMAIL` and `VITE_QA_ADMIN_CC`. Changing those meant a rebuild, they were the same for every site using the build, and nobody could see who changed them.

- **`feedbackSettingsRules.ts`** (pure, tested):
  - `qaButtonShown(settings, instanceRole)`: `default` follows the instance (shown on validation, hidden in production); `on` and `off` override it.
  - `feedbackSettingsProblem`: email addresses must be valid, and recipients are required whenever the button shows.
  - `parseEmailList` and `feedbackSettingsChange` (the English audit text).
- **`mockFeedbackSettingsService.ts`**: `get`, `save` and `qaButtonShown`. Saving needs `config:feedback:manage`, is validated, and is audited as `FEEDBACK_SETTINGS_CHANGED`. In production this is an organisation setting on the API server.

## Batch 617 (part B): server version (PS-514)

The feedback settings service now has an API-server version, `http<Name>Service.ts`, chosen by `<name>ServiceInstance.ts` (mock without an API server address, server version with one). One route per interface method; the calls are in `docs/architecture/CONFIG_DICTIONARIES_API.md`. The interface (`IFeedbackSettingsService`) moved out of the mock into its own file.

## Feedback destination and validation routing (Oct 28, 2026)

- **`FeedbackSettings`** gained `validationRecipients` and `enhancementUrl` (`feedbackSettingsRules.ts`: `enhancementUrlProblem`, the two new problem codes, the audit text). Old stored settings read as empty.
- **`validationRouting.ts`**: the `AI / Template validation` category: recipients with the QA fallback (`validationRecipientsFor`), the `FEEDBACK_ROUTED_TO_VALIDATION` audit text, the picker options (`loadValidationLinkOptions`: active studies, published templates; `templatesForStudy`, `buildValidationLinks`).
- **`enhancementDestination.ts`**: the address (`effectiveEnhancementUrl`: the administrator's entry, else `VITE_ENHANCEMENT_REQUEST_URL`, else none), the JSON body (no user id), and delivery with the shared HTTP client and no access token.
- Tests: `enhancementDestination.test.ts`, `feedbackUrls.guard.test.ts` (no web address in the routing files or the new locale strings), `../enhancementRequestService.routing.test.ts`. Design: `docs/architecture/FEEDBACK_DESTINATION.md`.
- Not built: a list of feedback inside PathScribe; the validation study page does not show linked feedback.
