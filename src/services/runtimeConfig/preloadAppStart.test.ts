import { describe, expect, it } from 'vitest';
import { staticChunkClosure } from '../../../scripts/static-chunk-closure.mjs';

// Batch 549 (carried over from Batch 547): the app's code downloads while config.json is read.
describe('preloading the app\'s code (build plugin)', () => {
  const bundle = {
    'assets/startApp-a.js': { type: 'chunk', fileName: 'assets/startApp-a.js', facadeModuleId: '/repo/src/startApp.tsx', imports: ['assets/react-b.js', 'assets/App-c.js'] },
    'assets/App-c.js': { type: 'chunk', fileName: 'assets/App-c.js', facadeModuleId: '/repo/src/App.tsx', imports: ['assets/react-b.js'] },
    'assets/react-b.js': { type: 'chunk', fileName: 'assets/react-b.js', facadeModuleId: null, imports: [] },
    'assets/LoginPage-d.js': { type: 'chunk', fileName: 'assets/LoginPage-d.js', facadeModuleId: '/repo/src/pages/LoginPage.tsx', imports: [] },
    'assets/index.css': { type: 'asset', fileName: 'assets/index.css' },
  };
  it('preloads the app start and everything it imports statically, each once, and nothing else', () => {
    expect(staticChunkClosure(bundle, '/src/startApp.tsx')).toEqual(['assets/startApp-a.js', 'assets/react-b.js', 'assets/App-c.js']);
  });
  it('a build without that entry preloads nothing', () => {
    expect(staticChunkClosure(bundle, '/src/nope.tsx')).toEqual([]);
  });
  it('works with Windows paths', () => {
    expect(staticChunkClosure({ x: { type: 'chunk', fileName: 'x', facadeModuleId: 'C:\\repo\\src\\startApp.tsx', imports: [] } }, '/src/startApp.tsx')).toEqual(['x']);
  });
});
