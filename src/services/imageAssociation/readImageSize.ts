// src/services/imageAssociation/readImageSize.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 609 (PS-44): what an attached image is, read from its own bytes: PNG or
// JPEG (the two formats pdf-lib embeds without re-compressing), and its size in
// pixels. Pure, so the Attach images screen can warn about resolution before
// anything is stored, and so a file renamed to .png that is really a JPEG is
// embedded as what it is.
// ─────────────────────────────────────────────────────────────────────────────

export type EmbeddableImageFormat = 'png' | 'jpeg';

export interface ImageSize { format: EmbeddableImageFormat; width: number; height: number; }

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** The format of PNG or JPEG bytes, or null for anything else. */
export function detectImageFormat(bytes: Uint8Array): EmbeddableImageFormat | null {
  if (bytes.length >= 8 && PNG_SIGNATURE.every((b, i) => bytes[i] === b)) return 'png';
  if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'jpeg';
  return null;
}

const be32 = (b: Uint8Array, at: number) => ((b[at] << 24) | (b[at + 1] << 16) | (b[at + 2] << 8) | b[at + 3]) >>> 0;
const be16 = (b: Uint8Array, at: number) => (b[at] << 8) | b[at + 1];

/** Start-of-frame markers that carry the JPEG's size (all but DHT 0xC4, JPG 0xC8 and DAC 0xCC). */
const isSofMarker = (m: number) => m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc;

/** Format and pixel size of a PNG or JPEG, or null when the bytes are neither or the size can't be read. */
export function readImageSize(bytes: Uint8Array): ImageSize | null {
  const format = detectImageFormat(bytes);
  if (format === 'png') {
    // 8-byte signature, then the IHDR chunk: length(4) "IHDR"(4) width(4) height(4).
    if (bytes.length < 24 || String.fromCharCode(bytes[12], bytes[13], bytes[14], bytes[15]) !== 'IHDR') return null;
    const width = be32(bytes, 16);
    const height = be32(bytes, 20);
    return width > 0 && height > 0 ? { format, width, height } : null;
  }
  if (format === 'jpeg') {
    let at = 2;
    while (at + 9 < bytes.length) {
      if (bytes[at] !== 0xff) { at += 1; continue; }
      const marker = bytes[at + 1];
      if (marker === 0xff) { at += 1; continue; } // fill byte
      if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) { at += 2; continue; } // markers without a length
      const length = be16(bytes, at + 2);
      if (isSofMarker(marker)) {
        const height = be16(bytes, at + 5);
        const width = be16(bytes, at + 7);
        return width > 0 && height > 0 ? { format, width, height } : null;
      }
      if (length < 2) return null;
      at += 2 + length;
    }
    return null;
  }
  return null;
}
