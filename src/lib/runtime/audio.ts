// Pure TypeScript Web Audio synthesizer for 8-bit SFX and chiptune loops.
import type { SoundEffectParam } from "./schema";

export class ForgeAudioEngine {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;
  private volume: number = 0.5;
  private musicTimer: ReturnType<typeof setInterval> | null = null;
  private currentTrack: string = "none";
  private noteIndex: number = 0;

  private ensureContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setMuted(muted: boolean) {
    this.muted = muted;
    if (muted) {
      this.stopMusic();
    } else if (this.currentTrack !== "none") {
      this.startMusic(this.currentTrack);
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
  }

  public getVolume(): number {
    return this.volume;
  }

  public playSound(param?: SoundEffectParam) {
    if (this.muted || !param) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = param.wave;
      osc.frequency.setValueAtTime(Math.max(40, param.freq), now);
      const endFreq = Math.max(30, Math.min(4000, param.freq + param.slide));
      osc.frequency.exponentialRampToValueAtTime(endFreq, now + param.decay);

      if (param.vibrato > 0) {
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        lfo.frequency.value = 18;
        lfoGain.gain.value = param.vibrato;
        lfo.connect(osc.frequency);
        lfo.start(now);
        lfo.stop(now + param.decay);
      }

      const peakGain = 0.25 * this.volume;
      gain.gain.setValueAtTime(peakGain, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + param.decay);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + param.decay);
    } catch {
      // Ignore audio errors on locked contexts
    }
  }

  public startMusic(track: string) {
    this.currentTrack = track;
    if (this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
    if (track === "none" || this.muted) return;

    const melodies: Record<string, number[]> = {
      adventure: [261.6, 329.6, 392.0, 523.3, 392.0, 329.6, 293.7, 349.2],
      dungeon: [146.8, 174.6, 164.8, 130.8, 146.8, 220.0, 196.0, 146.8],
      cyber: [220.0, 220.0, 440.0, 329.6, 261.6, 293.7, 392.0, 329.6],
      boss: [196.0, 207.7, 196.0, 185.0, 233.1, 220.0, 196.0, 164.8],
    };

    const notes = melodies[track] || melodies.adventure!;
    this.noteIndex = 0;

    this.musicTimer = setInterval(() => {
      if (this.muted) return;
      const ctx = this.ensureContext();
      if (!ctx) return;
      const freq = notes[this.noteIndex % notes.length]!;
      this.noteIndex++;

      try {
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = track === "dungeon" ? "triangle" : "square";
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(0.05 * this.volume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.19);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.2);
      } catch {
        // Ignore
      }
    }, 220);
  }

  public stopMusic() {
    if (this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  public destroy() {
    this.stopMusic();
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
  }
}

export function randomizeSoundParam(id: string, name: string, seed = Date.now()): SoundEffectParam {
  const waves: Array<SoundEffectParam["wave"]> = ["square", "sawtooth", "triangle", "sine"];
  const s = Math.abs(Math.sin(seed) * 10000);
  const wave = waves[Math.floor(s) % waves.length]!;
  const freq = 140 + Math.floor((s * 17) % 680);
  const slide = -300 + Math.floor((s * 31) % 850);
  const decay = Number((0.1 + ((s * 13) % 35) / 100).toFixed(2));
  const vibrato = Math.floor((s * 7) % 25);
  return { id, name, wave, freq, slide, decay, vibrato };
}
