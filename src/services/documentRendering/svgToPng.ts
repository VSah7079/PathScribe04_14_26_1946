// src/services/documentRendering/svgToPng.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 461: a standalone SVG drawn to a PNG data URL (300 DPI-class: the map
// is drawn at 4× its size), for the report PDF. Browser only; where there is
// no canvas (tests, server), it resolves to undefined and the figure keeps
// its SVG alone (the API server can rasterise it).
// ─────────────────────────────────────────────────────────────────────────────

export async function svgToPngDataUrl(svg: string, scale = 4): Promise<string | undefined> {
  if (typeof document === 'undefined' || typeof Image === 'undefined') return undefined;
  const m = /width="(\d+(?:\.\d+)?)"\s+height="(\d+(?:\.\d+)?)"/.exec(svg);
  if (!m) return undefined;
  const w = Number(m[1]) * scale; const h = Number(m[2]) * scale;
  try {
    const img = new Image();
    const loaded = new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = () => reject(new Error('svg')); });
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    await loaded;
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;
    ctx.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL('image/png');
  } catch {
    return undefined;
  }
}
