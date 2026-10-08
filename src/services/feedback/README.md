

# services/feedback

## Batch 447: the QA feedback button is a Configuration setting

It used to be the build settings `VITE_QA_ENABLED`, `VITE_QA_EMAIL` and `VITE_QA_ADMIN_CC`. Changing those meant a rebuild, they were the same for every site using the build, and nobody could see who changed them.

- **`feedbackSettingsRules.ts`** (pure, tested):
  - `qaButtonShown(settings, instanceRole)`: `default` follows the instance (shown on validation, hidden in production); `on` and `off` override it.
  - `feedbackSettingsProblem`: email addresses must be valid, and recipients are required whenever the button shows.
  - `parseEmailList` and `feedbackSettingsChange` (the English audit text).
- **`mockFeedbackSettingsService.ts`**: `get`, `save` and `qaButtonShown`. Saving needs `config:feedback:manage`, is validated, and is audited as `FEEDBACK_SETTINGS_CHANGED`. In production this is an organisation setting on the API server.
