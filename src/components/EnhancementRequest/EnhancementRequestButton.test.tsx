// @vitest-environment happy-dom
// Batch 499: Configuration → System → Feedback alone decides whether the QA
// button shows. The button used to hide itself whenever the build mode was
// 'production', which every built bundle is, validation instances included.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { EnhancementRequestButton } from './EnhancementRequestButton';

afterEach(cleanup);

describe('EnhancementRequestButton', () => {
  it('renders in QA mode when it is placed (NavBar places it only when the setting says so)', () => {
    render(<EnhancementRequestButton mode="qa" />);
    expect(screen.getByRole('button')).toBeTruthy();
  });

  it('does not consult the build mode', () => {
    const src = readFileSync(resolve(process.cwd(), 'src/components/EnhancementRequest/EnhancementRequestButton.tsx'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    expect(src).not.toMatch(/import\.meta\.env/);
  });
});
