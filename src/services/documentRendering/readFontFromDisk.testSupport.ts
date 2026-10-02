// Tests only (Batch 391): reads a print font as the browser would fetch it: the
// URL "/fonts/..." is served from public/.
import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '../../..');
export const readFontFromDisk = async (url: string): Promise<Uint8Array> => new Uint8Array(fs.readFileSync(path.join(root, 'public', url)));
