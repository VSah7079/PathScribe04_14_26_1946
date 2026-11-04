// Batch 710 (Pete, Oct 28 2026: "Shorten the description"): Home, Pathology
// Workspace and Quality & Compliance cards share one fixed-size card
// (.ps-home-card, ~282x160px at 1280x720; the text block is 100px high after
// padding). A two-line title leaves room for exactly ONE description line, so
// every tile description must fit a single line (~222px wide at 14px).
//
// The budgets below come from measuring the real cards in Chromium at
// 1280x720: the longest strings that stayed on one line were 31 characters in
// Latin-script locales (en, de, nl, fr, es) and 15 in Korean (full-width
// glyphs). The budget is set one character under the Latin maximum so a wider
// letter mix still fits. If this test fails, shorten the description; do not
// raise the budget without re-measuring (see src/pages/README.md, Home cards).
import { describe, expect, it } from 'vitest';
import en from './locales/en.json';
import de from './locales/de.json';
import nl from './locales/nl.json';
import fr from './locales/fr.json';
import es from './locales/es.json';
import ko from './locales/ko.json';

type Tree = { [k: string]: unknown };
const LOCALES: Record<string, Tree> = { en, de, nl, fr, es, ko };
const BUDGET: Record<string, number> = { en: 30, de: 30, nl: 30, fr: 30, es: 30, ko: 15 };

const GROUPS: Array<[string, string[]]> = [
  ['home', ['accession', 'worklist', 'benchContributions', 'configuration', 'intraopQueue', 'lockboxDropOff',
    'myContribution', 'pathologyWorkspace', 'qualityCompliance', 'search', 'tumorBoard']],
  ['pathologyWorkspace', ['batchManagement', 'cytology', 'marginExceptionReview', 'embedding', 'microtomy', 'molecular', 'slideDistribution']],
  ['qualityComplianceHub', ['audit', 'qualityAssurance', 'registryExceptions', 'autopsyDashboards',
    'outboundQueue']],
];

describe('card tile descriptions fit one line (Batch 710)', () => {
  for (const [loc, tree] of Object.entries(LOCALES)) {
    for (const [group, tiles] of GROUPS) {
      for (const tile of tiles) {
        const key = `${group}.${tile}Tile.description`;
        it(`${loc}: ${key} is within ${BUDGET[loc]} characters`, () => {
          const text = (((tree[group] as Tree)[`${tile}Tile`]) as { description: string }).description;
          expect(typeof text).toBe('string');
          expect(text.length).toBeGreaterThan(0);
          expect([...text].length).toBeLessThanOrEqual(BUDGET[loc]);
        });
      }
    }
  }
});
