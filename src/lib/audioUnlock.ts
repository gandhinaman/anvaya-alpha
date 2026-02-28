/**
 * Unlocks audio playback on iOS by creating and resuming an AudioContext
 * and playing a silent Audio element — must be called inside a user gesture handler.
 *
 * Returns a pre-warmed Audio element that can later have its .src changed
 * to play TTS without hitting iOS autoplay restrictions.
 */

// Tiny silent WAV (44-byte header + 1 sample)
const SILENT_WAV =
  "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=";

let _unlocked = false;

export async function unlockAudio(): Promise<HTMLAudioElement> {
  // Create + resume an AudioContext so future AudioContext instances work
  const AC = window.AudioContext || (window as any).webkitAudioContext;
  if (AC) {
    try {
      const ctx = new AC();
      await ctx.resume();
      ctx.close();
    } catch {}
  }

  // Pre-warm an Audio element with a silent play — iOS remembers this
  const audio = new Audio(SILENT_WAV);
  audio.volume = 0;
  try {
    await audio.play();
  } catch {}
  audio.pause();
  audio.volume = 1;

  _unlocked = true;
  return audio;
}

export function isAudioUnlocked(): boolean {
  return _unlocked;
}
