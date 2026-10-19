// src/services/auth/demo/demoAccounts.ts
// ─────────────────────────────────────────────────────────────────────────────
// PS-60 (Batch 343): the demo and review accounts for email + password
// sign-in. Moved out of AuthContext, where the passwords sat in plain text
// and shipped in every production bundle.
//
//   • Passwords are stored as PBKDF2-SHA256 hashes (600,000 iterations,
//     one random salt each), made with scripts/auth/hash-demo-password.mjs.
//   • This module is loaded only in the demo build (__DEMO_TOOLS__) when
//     VITE_AUTH_MODE is not "sso" (authSessionInstance.ts). Batch 547: a
//     server build (npm run build:server) leaves it out of the bundle
//     entirely, whatever its config.json says; check-production-bundle.mjs
//     fails the build if it isn't. *(Before Batch 547 an "sso" build left it
//     out; the mode now comes from config.json at start-up.)*
//   • The passwords themselves were in the shipped bundle until Batch 343,
//     so treat them as known.
//   • Batch 448: these are only the starting passwords. An administrator
//     sets or resets anyone's password from Staff → edit → Sign-in password
//     (services/staffPasswords/); once set there, the built-in one stops
//     working for that account. Full Reset returns to these.
//
// Role guide:
//   "pathologist"       → clinical cases + reporting only
//   "admin"             → configuration + user management only
//   "pathologist-admin" → both (route guards treat it as both)
//   "superadmin"        → PathScribe platform support: every tenant
//
// Batch 371 (Pete): Superadmin is reserved for ForMedrixAI support staff.
// Kept as superadmin: Pete Nimmo (both emails), System Admin, Paul Carter,
// Amber Fehrs-Battey, Bronwyn Prior and Rossana Babakhani. Everyone else
// signs in with the hospital role their staff record gives them, so they
// see the product the way their own staff would: Dr. Sarah Johnson,
// Dr. Oliver Pemberton and Dr. J. Mark Tuthill as pathologists.
// ─────────────────────────────────────────────────────────────────────────────

import type { VoiceProfileId } from '../../../constants/voiceProfiles';
import type { AppRole } from '../sessionProfile';
import { verifyPasswordHash, type StoredPasswordHash } from './passwordHash';
import { appEnv } from '@/services/runtimeConfig/runtimeEnv';

export interface DemoAccount {
  email: string;
  id: string;
  name: string;
  role: AppRole;
  initials: string;
  voiceProfile: VoiceProfileId;
  password: StoredPasswordHash;
}

export const DEMO_ACCOUNTS: readonly DemoAccount[] = [
  { email: 'pete.nimmo@pathscribe.ai', id: 'PATH-001', name: 'Pete Nimmo', role: 'superadmin', initials: 'PN', voiceProfile: 'EN-US',
    password: { iterations: 600000, salt: 'VHrOPwu0dqRguJi6SEnzfA==', hash: 'sEjrnUppyyn0dJB8jmc/DIDhhxbgRA9ACpkHeH1sWKM=' } },
  { email: 'demo@pathscribe.ai', id: 'PATH-001', name: 'Pete Nimmo', role: 'superadmin', initials: 'PN', voiceProfile: 'EN-US',
    password: { iterations: 600000, salt: '98ViO9Av3WRyzHfRyjyNhQ==', hash: 'HDcHl0PF53OAXON2MsD++bPdP3/szKsAl56xIwoAnTA=' } },
  { email: 'sarah.johnson@demo.pathscribe.ai', id: 'PATH-SJ-001', name: 'Dr. Sarah Johnson', role: 'pathologist', initials: 'SJ', voiceProfile: 'EN-US',
    password: { iterations: 600000, salt: 'MYdQ+CXRlWPlRMf3BCtBJw==', hash: 'RK2gCXwbvxTXiKBSK/Xf7e3maqiIjVGYVzWK2l4ECzg=' } },
  { email: 'admin@pathscribe.ai', id: 'u3', name: 'System Admin', role: 'superadmin', initials: 'SA', voiceProfile: 'EN-US',
    password: { iterations: 600000, salt: 'wPPBq65tJV9Fa5fBQZMCnw==', hash: '0S/9fhTFW88UHfuToglZj88thYz4cOxRYkKDkyYHceY=' } },
  { email: 'paul.carter@mft.nhs.uk', id: 'PATH-UK-001', name: 'Paul Carter', role: 'superadmin', initials: 'PC', voiceProfile: 'EN-GB',
    password: { iterations: 600000, salt: 'XVUGeEa6qL+qyCwiHMIpnA==', hash: 'ZOgtCeIdbYxAxy1gHCEnPIU62Lh9wRTHoMQxOcWblIo=' } },
  { email: 'bronwyn.prior@mft.nhs.uk', id: 'PATH-UK-003', name: 'Bronwyn Prior', role: 'superadmin', initials: 'BP', voiceProfile: 'EN-GB',
    password: { iterations: 600000, salt: 'JOwlIjqHtjj0AS8PS8wztw==', hash: '6flaOlFocCYfeUlHPkNGdJFkCMfhFXiyNRNFGPtLk10=' } },
  { email: 'oliver.pemberton@mft.nhs.uk', id: 'PATH-UK-002', name: 'Dr. Oliver Pemberton', role: 'pathologist', initials: 'OP', voiceProfile: 'EN-GB',
    password: { iterations: 600000, salt: '2OfzfoNJv64zL2KDyx+PUg==', hash: 'EImnUDVar5bjk0xhMNclfUyrT6cntcEL1rVTlwEquXU=' } },
  { email: 'amber.fehrs@demo.pathscribe.ai', id: 'PATH-US-001', name: 'Amber Fehrs-Battey', role: 'superadmin', initials: 'AF', voiceProfile: 'EN-US',
    password: { iterations: 600000, salt: 'YXOo5/Oho4EMvSOiGgLZtg==', hash: '//aycKGHDWa06Qyt6AKVRslPfOcD6R6WQaGewAFFwKg=' } },
  { email: 'mark.tuthill@hfhs-demo.pathscribe.ai', id: 'PATH-US-002', name: 'Dr. J. Mark Tuthill', role: 'pathologist', initials: 'MT', voiceProfile: 'EN-US',
    password: { iterations: 600000, salt: '6RoUd+kv3wAf2w43JBsriw==', hash: 'rx+AoGDty1oJkOjhf3/lG4bbQhbDzqZFzsozm3XeF4o=' } },
  { email: (appEnv().VITE_BABAKHANI_EMAIL ?? 'rossana.babakhani@pathscribe.ai').toLowerCase(), id: 'PATH-RB-001', name: 'Rossana Babakhani', role: 'superadmin', initials: 'RB', voiceProfile: 'EN-US',
    password: { iterations: 600000, salt: 'odzRFd6XC3lJdcDteGQ4Rg==', hash: 'TBJNaS9kGBSXKTLG1ylG6tuqSeQIJoDSSgvnkVHNU0Q=' } },
  // Batch 374: bench and PA sign-ins, so the Home page's per-role tiles can be
  // demoed. Same password as demo@pathscribe.ai.
  { email: 'maria.lopez@demo.pathscribe.ai', id: 'ACC-001', name: 'Maria Lopez', role: 'pathologist', initials: 'ML', voiceProfile: 'EN-US',
    password: { iterations: 600000, salt: 'ehEGNcnrEwDfiFjuWHGjiA==', hash: '22QG4t3065KUjDJgbg7xFBQUfsrHUpizo/HVIckYDhY=' } },
  { email: 'kevin.brooks@demo.pathscribe.ai', id: 'HT-001', name: 'Kevin Brooks', role: 'pathologist', initials: 'KB', voiceProfile: 'EN-US',
    password: { iterations: 600000, salt: 'H7XVW0Mpa9AKeeYQmOlCEA==', hash: 'pF17OaObFAgyAJBDiKYzB3vFReeEp/ox4e+l84vY/j0=' } },
  { email: 'priya.desai@demo.pathscribe.ai', id: 'CT-001', name: 'Priya Desai', role: 'pathologist', initials: 'PD', voiceProfile: 'EN-US',
    password: { iterations: 600000, salt: 'FAQuhlS3JlzgLmqLELNsrQ==', hash: 'NTg8uYu/+m5jy9Dlf1z/U7ohrxxt/PLiX2r4L0FQ1WY=' } },
  { email: 'daniel.kim@demo.pathscribe.ai', id: 'MT-001', name: 'Daniel Kim', role: 'pathologist', initials: 'DK', voiceProfile: 'EN-US',
    password: { iterations: 600000, salt: 'SPN5kC+6IwCXztwOvMrCsA==', hash: 'Cs6ORMo/Ai9fIIftrLnPjKjfv1h2Lb+eolk0MEQ+nYc=' } },
  { email: 'connor.whitlock@pathscribe.ai', id: 'PA-001', name: 'Connor Whitlock', role: 'pathologist', initials: 'CW', voiceProfile: 'EN-US',
    password: { iterations: 600000, salt: 'BW6UbPcfctpi2AGqs3pP3Q==', hash: 'HxfyWumohGb5Mfmv/wTtlt3R9RulynQ6uiixtD7D7mQ=' } },
  { email: 'michelle.nimmo@ai.com', id: 'PATH-MN-001', name: 'Michelle Nimmo', role: 'pathologist-admin', initials: 'MN', voiceProfile: 'EN-US',
    password: { iterations: 600000, salt: 'NEV6v3TdVFZRqfKRGYUnZw==', hash: 'UJkKSg81VbsWvNt41slFyagi7r3nmRs0q8hfQgj1yjo=' } },
  // Batch 455 (Pete: "Some workflows require a second staff person with the
  // appropriate RBPs"): a sign-in for every built-in role nobody could demo,
  // so each two-person workflow has two real people. Same password as
  // demo@pathscribe.ai (each hashed with its own salt). Built in, so a Full
  // Reset, which clears passwords set on the Staff screen, can't lock them out.
  // The session role is what their staff roles give (sessionRole.ts); what they
  // may do comes from those staff roles.
  { email: 'rachel.okafor@demo.pathscribe.ai', id: 'LD-001', name: 'Dr. Rachel Okafor', role: 'admin', initials: 'RO', voiceProfile: 'EN-US',
    password: { iterations: 600000, salt: 'BRs+bgTOn+h9O7QJQo/K+g==', hash: 'JXgVWl7/CcR45ynpfRQ0ZEY7ROUArQnSPQybJKEoEsg=' } },
  { email: 'james.okafor@demo.pathscribe.ai', id: '2', name: 'Dr. James Okafor', role: 'pathologist', initials: 'JO', voiceProfile: 'EN-US',
    password: { iterations: 600000, salt: '9dJCrOwDXXASeVNr08zdqQ==', hash: 'QZ9TtRQGYt15AMr5i4z00toCalq7YH2WH8Qv0nZdf+0=' } },
  { email: 'lucas.moreau@demo.pathscribe.ai', id: 'FEL-001', name: 'Dr. Lucas Moreau', role: 'pathologist', initials: 'LM', voiceProfile: 'EN-US',
    password: { iterations: 600000, salt: 'LkkjQih8JGqpRK7CCi29hw==', hash: 'FVN4yM3YiVeaRs+SKKiXNknIWj2DRzmzQLX7+3T9kXU=' } },
  { email: 'nadia.rahman@demo.pathscribe.ai', id: 'CT-002', name: 'Nadia Rahman', role: 'pathologist', initials: 'NR', voiceProfile: 'EN-US',
    password: { iterations: 600000, salt: 'JUUpWPFzLkRiSztDFRW5Gg==', hash: '9M9+chfKH7tquSv+Bp/pKGrBSK9wBvQtP7/VNz16T1k=' } },
  { email: 'hannah.price@demo.pathscribe.ai', id: 'TA-001', name: 'Hannah Price', role: 'admin', initials: 'HP', voiceProfile: 'EN-US',
    password: { iterations: 600000, salt: 'mdT6kdPJ7sWjwpBIdXS6Ew==', hash: 'WtpxldKZQ3yQhr25Q/mw80M25q1+C35i7U0bPLRvQRQ=' } },
  { email: 'samuel.osei@demo.pathscribe.ai', id: 'TAP-001', name: 'Dr. Samuel Osei', role: 'admin', initials: 'SO', voiceProfile: 'EN-US',
    password: { iterations: 600000, salt: '15e9hKDlTmhfhKko8yvliw==', hash: 'pFFJi+yoDSXKZL5r8I6bPWDaIlfQ3Rd+Hx61aOWqpIk=' } },
  { email: 'grace.liu@demo.pathscribe.ai', id: 'QA-001', name: 'Grace Liu', role: 'pathologist', initials: 'GL', voiceProfile: 'EN-US',
    password: { iterations: 600000, salt: 'Smv3/DzDZgoCo/KYrzt6dA==', hash: 'MjtxMX+UpCc1jJtBJfdujhesbd7v3sm1w4dkA0j+a68=' } },
];

/** Checked when the email matches no account, so an unknown email takes as long as a wrong password. */
const NO_ACCOUNT: StoredPasswordHash = { iterations: 600000, salt: 'uZcBfjDeAK+0yh4OHOhC7Q==', hash: 'EEPiWPbQZ3YGIV+tcrKwZmsgRRhufzkxnVt9WCAquHw=' };

/**
 * The account for this email and password, or null. The email is matched
 * without regard to case or surrounding spaces; the password is trimmed,
 * as it was before Batch 343.
 */
export async function verifyDemoCredentials(email: string, password: string, accounts: readonly DemoAccount[] = DEMO_ACCOUNTS): Promise<DemoAccount | null> {
  const wanted = email.trim().toLowerCase();
  const account = accounts.find(a => a.email.toLowerCase() === wanted);
  const ok = await verifyPasswordHash(password.trim(), account?.password ?? NO_ACCOUNT);
  return account && ok ? account : null;
}

// ── Batch 611 (#157): the Simulated second factor ──────────────────────────
// A documented demo secret per account, so the multi-factor sign-in can be
// shown without a phone. It is derived from a seed that is written here and in
// docs/architecture/MFA.md, so treat it as known: it protects nothing and
// exists only in the demo build. Add the secret to an authenticator app, or use
// the "Show demo code (Simulated)" button on the screen.
export const DEMO_MFA_SEED = 'pathscribe-demo-mfa-v1';

/** The base32 demo secret for a staff id (20 bytes of SHA-256(seed:id)); the same for every id, so staff whose password was set on the Staff screen are covered too. */
export async function demoMfaSecretFor(accountId: string): Promise<string | null> {
  if (!accountId) return null;
  const digest = new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${DEMO_MFA_SEED}:${accountId}`) as BufferSource));
  const { base32Encode } = await import('../mfa/totp');
  return base32Encode(digest.slice(0, 20));
}
