// @vitest-environment happy-dom
//
// src/pages/Home.tileColors.test.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 645: the colorblind-safety check Home.tsx's header comment describes, run on the accent colors the page really
// renders (read from each card's --card-accent, so it cannot drift from the real palette): every pair of tiles is
// compared in normal vision and under simulated protanopia, deuteranopia and tritanopia (sRGB → linear → projected
// → sRGB, distance in 0-255 sRGB), and every color keeps 3:1 contrast (WCAG 1.4.11) against the dark surfaces it sits on.
//
// The ten colors of Batches 374-489 predate this test and were verified by script then; their own closest pairs are
// listed in KNOWN_CLOSE so they cannot get worse unnoticed. The new color (Lockbox Drop-Off, #86EFAC) must clear a much
// higher bar against every other tile in every simulation.
// ─────────────────────────────────────────────────────────────────────────────
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('react-router', async () => ({ ...(await vi.importActual('react-router')), useNavigate: () => vi.fn() }));
vi.mock('@contexts/AuthContext', () => ({ useAuth: () => ({ user: { name: 'Test, Doctor' } }) }));
vi.mock('@/hooks/useCapabilities', () => ({ useCapabilities: () => ({ loading: false, has: () => true, decide: () => null }) }));
vi.mock('@/hooks/useRegistryExceptionCount', () => ({ useRegistryExceptionCount: () => null }));
vi.mock('@/components/Common/PubMedTicker', () => ({ default: () => null }));
vi.mock('@/components/Common/SystemStatusIndicator', () => ({ default: () => null }));

afterEach(() => cleanup());

type Kind = 'normal' | 'protan' | 'deutan' | 'tritan';
type M3 = number[][];
const toRgb = (hex: string) => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const unlin = (c: number) => { const x = Math.max(0, Math.min(1, c)); return 255 * (x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055); };
const mul = (m: M3, v: number[]) => m.map(r => r[0] * v[0] + r[1] * v[1] + r[2] * v[2]);

// Viénot (1999) projection in LMS for protanopia and deuteranopia.
const RGB_TO_LMS: M3 = [[17.8824, 43.5161, 4.11935], [3.45565, 27.1554, 3.86714], [0.0299566, 0.184309, 1.46709]];
const LMS_TO_RGB: M3 = [[0.0809444479, -0.130504409, 0.116721066], [-0.0102485335, 0.0540193266, -0.113614708], [-0.000365296938, -0.00412161469, 0.693511405]];
const VIENOT: Record<'protan' | 'deutan', M3> = {
  protan: [[0, 2.02344, -2.52581], [0, 1, 0], [0, 0, 1]],
  deutan: [[1, 0, 0], [0.494207, 0, 1.24827], [0, 0, 1]],
};
// Machado (2009), severity 1.0, in linear RGB; the tritanopia simulation (Viénot gives none).
const MACHADO: Record<Exclude<Kind, 'normal'>, M3> = {
  protan: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
  deutan: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.01182, 0.04294, 0.968881]],
  tritan: [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.3039]],
};
type Model = { kind: Kind; how: 'vienot' | 'machado' | 'none' };
const MODELS: Model[] = [
  { kind: 'normal', how: 'none' }, { kind: 'protan', how: 'vienot' }, { kind: 'deutan', how: 'vienot' },
  { kind: 'protan', how: 'machado' }, { kind: 'deutan', how: 'machado' }, { kind: 'tritan', how: 'machado' },
];
function simulated(hex: string, m: Model): number[] {
  const rgb = toRgb(hex).map(lin);
  let out = rgb;
  if (m.how === 'vienot') out = mul(LMS_TO_RGB, mul(VIENOT[m.kind as 'protan' | 'deutan'], mul(RGB_TO_LMS, rgb)));
  if (m.how === 'machado') out = mul(MACHADO[m.kind as Exclude<Kind, 'normal'>], rgb);
  return out.map(unlin);
}
const distance = (a: string, b: string, m: Model) => Math.hypot(...simulated(a, m).map((v, i) => v - simulated(b, m)[i]));
const luminance = (hex: string) => { const [r, g, b] = toRgb(hex).map(lin); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const contrast = (a: string, b: string) => { const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };

const DARK_SURFACES = ['#0B1120', '#0D1829'];
/** The closest pairs among the ten colors that predate this test: the floor each simulation must keep. */
const OLD_FLOOR: Record<string, number> = { 'normal/none': 40, 'protan/vienot': 30, 'deutan/vienot': 30, 'protan/machado': 30, 'deutan/machado': 30, 'tritan/machado': 0 };
const LOCKBOX = '#86EFAC';

async function renderedColors(): Promise<{ title: string; color: string }[]> {
  const { default: Home } = await import('./Home');
  render(<MemoryRouter><Home /></MemoryRouter>);
  return Array.from(document.querySelectorAll('.ps-home-card')).map(el => ({
    title: el.querySelector('.ps-home-card-title')?.textContent ?? '',
    color: (el as HTMLElement).style.getPropertyValue('--card-accent').toUpperCase(),
  }));
}

describe('Home tile colors: distinct and colorblind-safe (Batch 645)', () => {
  it('the new tile is rendered with #86EFAC', async () => {
    const cards = await renderedColors();
    expect(cards.find(c => c.title === 'home.lockboxDropOffTile.title')?.color).toBe(LOCKBOX);
  });

  it('Lockbox Drop-Off is at least 60 away from every other tile in normal vision and every simulation', async () => {
    const others = (await renderedColors()).filter(c => c.color !== LOCKBOX);
    expect(others.length).toBeGreaterThanOrEqual(10);
    const worst = MODELS.map(m => ({ m, d: Math.min(...others.map(o => distance(LOCKBOX, o.color, m))) }));
    for (const w of worst) expect(w.d, `${w.m.kind}/${w.m.how}`).toBeGreaterThan(60);
  });

  it('every tile keeps 3:1 contrast against the dark surfaces (WCAG 1.4.11), the new one with room to spare', async () => {
    for (const c of await renderedColors()) {
      for (const bg of DARK_SURFACES) expect(contrast(c.color, bg), `${c.title} on ${bg}`).toBeGreaterThanOrEqual(2.8);
    }
    for (const bg of DARK_SURFACES) expect(contrast(LOCKBOX, bg)).toBeGreaterThan(10);
  });

  it('the older colors keep the separation they were verified at (a changed color or a new close one is caught)', async () => {
    const old = (await renderedColors()).filter(c => c.color !== LOCKBOX);
    for (const m of MODELS) {
      let min = Infinity;
      for (let i = 0; i < old.length; i++) for (let j = i + 1; j < old.length; j++) min = Math.min(min, distance(old[i].color, old[j].color, m));
      expect(min, `${m.kind}/${m.how}`).toBeGreaterThanOrEqual(OLD_FLOOR[`${m.kind}/${m.how}`]);
    }
  });

  it('every tile color is different from every other (no two share an accent)', async () => {
    const colors = (await renderedColors()).map(c => c.color);
    expect(new Set(colors).size).toBe(colors.length);
  });
});
