// src/utils/alertTone.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 503 (PS-474): the urgent-message alert sound, made in the browser
// (Web Audio) instead of downloaded from actions.google.com — an outside
// address the Content-Security-Policy blocks, that a hospital network may
// block too, and that told Google whenever a PathScribe user got an urgent
// message. Two short beeps at 880 Hz. Silent where audio isn't allowed yet
// (browsers need a click on the page first), as before.
// ─────────────────────────────────────────────────────────────────────────────

type AudioContextCtor = new () => AudioContext;

let ctx: AudioContext | null = null;

export function playAlertTone(win: { AudioContext?: AudioContextCtor; webkitAudioContext?: AudioContextCtor } = window as never): void {
  try {
    const Ctor = win.AudioContext ?? win.webkitAudioContext;
    if (!Ctor) return;
    ctx = ctx ?? new Ctor();
    if (ctx.state === 'suspended') void ctx.resume().catch(() => {});
    const start = ctx.currentTime;
    for (const offset of [0, 0.2]) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, start + offset);
      gain.gain.exponentialRampToValueAtTime(0.25, start + offset + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + offset + 0.15);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start + offset);
      osc.stop(start + offset + 0.16);
    }
  } catch { /* no audio: the alert still shows */ }
}
