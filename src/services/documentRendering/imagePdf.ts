// src/services/documentRendering/imagePdf.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 751: a one-page PDF holding one JPEG picture, for the organ map file a site may ask to receive as a PDF
// (services/organMapping/organMapDelivery.ts). The JPEG goes in as it is (DCTDecode), so no image library is needed.
// Pure: base64 in, base64 out. The page is the picture's size at the given resolution.
// ─────────────────────────────────────────────────────────────────────────────

/** The JPEG's own pixel size, read from its start-of-frame marker; undefined if it isn't a JPEG. */
export function jpegSize(bytes: string): { width: number; height: number } | undefined {
  if (bytes.charCodeAt(0) !== 0xff || bytes.charCodeAt(1) !== 0xd8) return undefined;
  let i = 2;
  while (i + 9 < bytes.length) {
    if (bytes.charCodeAt(i) !== 0xff) return undefined;
    const marker = bytes.charCodeAt(i + 1);
    const length = (bytes.charCodeAt(i + 2) << 8) + bytes.charCodeAt(i + 3);
    if (marker >= 0xc0 && marker <= 0xc3) {
      return { height: (bytes.charCodeAt(i + 5) << 8) + bytes.charCodeAt(i + 6), width: (bytes.charCodeAt(i + 7) << 8) + bytes.charCodeAt(i + 8) };
    }
    i += 2 + length;
  }
  return undefined;
}

/** The PDF (base64) showing the JPEG (base64) on one page; undefined if the JPEG can't be read. */
export function jpegPdfBase64(jpegBase64: string, dpi = 300): string | undefined {
  const jpeg = atob(jpegBase64);
  const size = jpegSize(jpeg);
  if (!size) return undefined;
  const w = Math.round((size.width * 72) / dpi * 100) / 100;
  const h = Math.round((size.height * 72) / dpi * 100) / 100;
  const content = `q ${w} 0 0 ${h} 0 0 cm /Im0 Do Q`;
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${w} ${h}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`,
    `<< /Type /XObject /Subtype /Image /Width ${size.width} /Height ${size.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n${jpeg}\nendstream`,
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
  ];
  let out = '%PDF-1.4\n%\xe2\xe3\xcf\xd3\n';
  const offsets: number[] = [];
  objects.forEach((body, n) => { offsets.push(out.length); out += `${n + 1} 0 obj\n${body}\nendobj\n`; });
  const xref = out.length;
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map(o => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}`;
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return btoa(out);
}
