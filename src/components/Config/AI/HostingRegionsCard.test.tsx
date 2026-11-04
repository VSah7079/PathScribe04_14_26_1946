// @vitest-environment happy-dom
// src/components/Config/AI/HostingRegionsCard.test.tsx (Batch 557)
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
import { HostingRegionsCard } from './HostingRegionsCard';

afterEach(() => cleanup());

describe('HostingRegionsCard', () => {
  it('shows the database and file storage regions from the server, and the AI region', () => {
    render(<HostingRegionsCard hosting={{ databaseRegion: 'UK South', blobRegion: 'UK West' }} aiRegion="eu-west-2" />);
    expect(screen.getByText('UK South')).toBeTruthy();
    expect(screen.getByText('UK West')).toBeTruthy();
    expect(screen.getByText('eu-west-2')).toBeTruthy();
  });
  it('says "not reported" for what the server didn\'t give (the demo has no server)', () => {
    render(<HostingRegionsCard hosting={{}} />);
    expect(screen.getAllByText('hostingRegions.notReported')).toHaveLength(3);
  });
});
