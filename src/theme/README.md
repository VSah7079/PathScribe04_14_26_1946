# src/theme/

One file: `pathscribeTheme.ts` — the `t.colors.*`/`t.gradients.*`
design-token object referenced across a few dashboard components
(`ContributionDashboardPage.tsx` and its sub-components in
particular).

Clean — no `any` casts, no dead code. The token *values* here are
fine; where this file's tokens were previously being applied via
inline `style={{}}` objects referencing them directly (rather than
through a real CSS class), that was fixed at the call sites during the
`ContributionDashboardPage.tsx` review earlier in this pass — the
actual hex/gradient values from this file were baked into real,
named `.ps-contrib-*` CSS classes instead, since CSS can't reference a
JS module at build time. This file itself needed no changes.
