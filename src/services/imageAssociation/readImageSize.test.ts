// Batch 609 (PS-44): what an attached image is, read from its bytes.
import { describe, it, expect } from 'vitest';
import { detectImageFormat, readImageSize } from './readImageSize';

const RED_PNG = Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64'));

/** A JPEG with only the markers the reader looks at: SOI, JFIF header, SOF0 (3 components), EOI. */
export function syntheticJpeg(width: number, height: number, sof = 0xc0): Uint8Array {
  const jfif = [0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00];
  const frame = [0xff, sof, 0x00, 0x11, 0x08, height >> 8, height & 255, width >> 8, width & 255, 0x03, 0x01, 0x22, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01];
  return Uint8Array.from([0xff, 0xd8, ...jfif, ...frame, 0xff, 0xd9]);
}

describe('detectImageFormat', () => {
  it('knows a PNG and a JPEG by their first bytes, not by a file name', () => {
    expect(detectImageFormat(RED_PNG)).toBe('png');
    expect(detectImageFormat(syntheticJpeg(10, 10))).toBe('jpeg');
  });
  it('refuses anything else', () => {
    expect(detectImageFormat(new TextEncoder().encode('%PDF-1.4'))).toBeNull();
    expect(detectImageFormat(new TextEncoder().encode('GIF89a......'))).toBeNull();
    expect(detectImageFormat(new Uint8Array())).toBeNull();
    expect(detectImageFormat(Uint8Array.from([0x89, 0x50]))).toBeNull();
  });
});

describe('readImageSize', () => {
  it('reads a PNG\'s size from its header', () => {
    expect(readImageSize(RED_PNG)).toEqual({ format: 'png', width: 1, height: 1 });
  });
  it('reads a JPEG\'s size from its start-of-frame marker, past other markers', () => {
    expect(readImageSize(syntheticJpeg(4032, 3024))).toEqual({ format: 'jpeg', width: 4032, height: 3024 });
    expect(readImageSize(syntheticJpeg(640, 480, 0xc2))).toEqual({ format: 'jpeg', width: 640, height: 480 }); // progressive
  });
  it('gives null for a file that is cut short or has a zero size', () => {
    expect(readImageSize(RED_PNG.slice(0, 20))).toBeNull();
    expect(readImageSize(syntheticJpeg(10, 10).slice(0, 12))).toBeNull();
    expect(readImageSize(syntheticJpeg(0, 0))).toBeNull();
    expect(readImageSize(new Uint8Array())).toBeNull();
  });
  it('does not mistake the DHT marker (0xC4) for a frame', () => {
    expect(readImageSize(syntheticJpeg(10, 10, 0xc4))).toBeNull();
  });
});
