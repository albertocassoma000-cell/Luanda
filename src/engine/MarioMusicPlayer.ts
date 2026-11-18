// 8-bit Chiptune Web Audio API player for the Super Mario Overworld theme

interface NoteEvent {
  freq: number; // Hz (0 = rest)
  beats: number; // duration in 16th-note steps
}

// Note frequencies in Hz
const N: Record<string, number> = {
  R: 0,
  G2: 98.0,
  A2: 110.0,
  B2: 123.47,
  C3: 130.81,
  D3: 146.83,
  E3: 164.81,
  F3: 174.61,
  Fs3: 185.0,
  G3: 196.0,
  Gs3: 207.65,
  A3: 220.0,
  As3: 233.08,
  B3: 246.94,
  C4: 261.63,
  Cs4: 277.18,
  D4: 293.66,
  Ds4: 311.13,
  E4: 329.63,
  F4: 349.23,
  Fs4: 369.99,
  G4: 392.0,
  Gs4: 415.3,
  A4: 440.0,
  As4: 466.16,
  B4: 493.88,
  C5: 523.25,
  Cs5: 554.37,
  D5: 587.33,
  Ds5: 622.25,
  E5: 659.25,
  F5: 698.46,
  Fs5: 739.99,
  G5: 783.99,
  A5: 880.0,
  B5: 987.77,
  C6: 1046.5,
};

// Super Mario Bros. Overworld Theme - Lead Melody (in 16th-note steps)
const MELODY: NoteEvent[] = [
  // Intro
  { freq: N.E5, beats: 1 }, { freq: N.E5, beats: 2 }, { freq: N.E5, beats: 2 },
  { freq: N.C5, beats: 1 }, { freq: N.E5, beats: 2 },
  { freq: N.G5, beats: 4 }, { freq: N.G4, beats: 4 },

  // Section A (part 1)
  { freq: N.C5, beats: 3 }, { freq: N.G4, beats: 3 }, { freq: N.E4, beats: 3 },
  { freq: N.A4, beats: 2 }, { freq: N.B4, beats: 2 }, { freq: N.As4, beats: 1 }, { freq: N.A4, beats: 2 },
  { freq: N.G4, beats: 1.5 }, { freq: N.E5, beats: 1.5 }, { freq: N.G5, beats: 1 },
  { freq: N.A5, beats: 2 }, { freq: N.F5, beats: 1 }, { freq: N.G5, beats: 2 },
  { freq: N.E5, beats: 2 }, { freq: N.C5, beats: 1 }, { freq: N.D5, beats: 1 }, { freq: N.B4, beats: 3 },

  // Section A (part 2)
  { freq: N.C5, beats: 3 }, { freq: N.G4, beats: 3 }, { freq: N.E4, beats: 3 },
  { freq: N.A4, beats: 2 }, { freq: N.B4, beats: 2 }, { freq: N.As4, beats: 1 }, { freq: N.A4, beats: 2 },
  { freq: N.G4, beats: 1.5 }, { freq: N.E5, beats: 1.5 }, { freq: N.G5, beats: 1 },
  { freq: N.A5, beats: 2 }, { freq: N.F5, beats: 1 }, { freq: N.G5, beats: 2 },
  { freq: N.E5, beats: 2 }, { freq: N.C5, beats: 1 }, { freq: N.D5, beats: 1 }, { freq: N.B4, beats: 3 },

  // Section B (part 1)
  { freq: N.R, beats: 2 }, { freq: N.G5, beats: 1 }, { freq: N.Fs5, beats: 1 }, { freq: N.F5, beats: 1 }, { freq: N.Ds5, beats: 2 }, { freq: N.E5, beats: 2 },
  { freq: N.Gs4, beats: 1 }, { freq: N.A4, beats: 1 }, { freq: N.C5, beats: 2 }, { freq: N.A4, beats: 1 }, { freq: N.C5, beats: 1 }, { freq: N.D5, beats: 2 },
  { freq: N.R, beats: 2 }, { freq: N.G5, beats: 1 }, { freq: N.Fs5, beats: 1 }, { freq: N.F5, beats: 1 }, { freq: N.Ds5, beats: 2 }, { freq: N.E5, beats: 2 },
  { freq: N.C6, beats: 2 }, { freq: N.C6, beats: 1 }, { freq: N.C6, beats: 4 },

  // Section B (part 2)
  { freq: N.R, beats: 2 }, { freq: N.G5, beats: 1 }, { freq: N.Fs5, beats: 1 }, { freq: N.F5, beats: 1 }, { freq: N.Ds5, beats: 2 }, { freq: N.E5, beats: 2 },
  { freq: N.Gs4, beats: 1 }, { freq: N.A4, beats: 1 }, { freq: N.C5, beats: 2 }, { freq: N.A4, beats: 1 }, { freq: N.C5, beats: 1 }, { freq: N.D5, beats: 2 },
  { freq: N.R, beats: 2 }, { freq: N.Ds5, beats: 3 }, { freq: N.D5, beats: 3 }, { freq: N.C5, beats: 6 },
];

// Simple rhythmic bassline matching the theme
const BASS: NoteEvent[] = [
  // Intro
  { freq: N.D3, beats: 1 }, { freq: N.D3, beats: 2 }, { freq: N.D3, beats: 2 },
  { freq: N.D3, beats: 1 }, { freq: N.D3, beats: 2 },
  { freq: N.G3, beats: 4 }, { freq: N.G2, beats: 4 },

  // Section A (part 1)
  { freq: N.G3, beats: 3 }, { freq: N.E3, beats: 3 }, { freq: N.C3, beats: 3 },
  { freq: N.F3, beats: 2 }, { freq: N.G3, beats: 2 }, { freq: N.Fs3, beats: 1 }, { freq: N.F3, beats: 2 },
  { freq: N.E3, beats: 1.5 }, { freq: N.C4, beats: 1.5 }, { freq: N.E4, beats: 1 },
  { freq: N.F4, beats: 2 }, { freq: N.D4, beats: 1 }, { freq: N.E4, beats: 2 },
  { freq: N.C4, beats: 2 }, { freq: N.A3, beats: 1 }, { freq: N.B3, beats: 1 }, { freq: N.G3, beats: 3 },

  // Section A (part 2)
  { freq: N.G3, beats: 3 }, { freq: N.E3, beats: 3 }, { freq: N.C3, beats: 3 },
  { freq: N.F3, beats: 2 }, { freq: N.G3, beats: 2 }, { freq: N.Fs3, beats: 1 }, { freq: N.F3, beats: 2 },
  { freq: N.E3, beats: 1.5 }, { freq: N.C4, beats: 1.5 }, { freq: N.E4, beats: 1 },
  { freq: N.F4, beats: 2 }, { freq: N.D4, beats: 1 }, { freq: N.E4, beats: 2 },
  { freq: N.C4, beats: 2 }, { freq: N.A3, beats: 1 }, { freq: N.B3, beats: 1 }, { freq: N.G3, beats: 3 },

  // Section B (part 1)
  { freq: N.C3, beats: 3 }, { freq: N.G3, beats: 3 }, { freq: N.C4, beats: 3 },
  { freq: N.F3, beats: 3 }, { freq: N.C4, beats: 2 }, { freq: N.F3, beats: 3 },
  { freq: N.C3, beats: 3 }, { freq: N.G3, beats: 3 }, { freq: N.C4, beats: 3 },
  { freq: N.G3, beats: 3 }, { freq: N.G3, beats: 4 },

  // Section B (part 2)
  { freq: N.C3, beats: 3 }, { freq: N.G3, beats: 3 }, { freq: N.C4, beats: 3 },
  { freq: N.F3, beats: 3 }, { freq: N.C4, beats: 2 }, { freq: N.F3, beats: 3 },
  { freq: N.Gs3, beats: 4 }, { freq: N.As3, beats: 4 }, { freq: N.C4, beats: 6 },
];

export class MarioMusicPlayer {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isPlaying = false;
  private timerId: number | null = null;
  private melodyIdx = 0;
  private bassIdx = 0;
  private nextMelodyTime = 0;
  private nextBassTime = 0;
  private readonly stepSec = 0.145; // upbeat chiptune tempo (~103 BPM 16ths)

  public getPlaying(): boolean {
    return this.isPlaying;
  }

  public start(): void {
    if (this.isPlaying) return;
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    if (!this.ctx) {
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.14;
      this.masterGain.connect(this.ctx.destination);
    }

    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }

    this.isPlaying = true;
    const now = this.ctx.currentTime + 0.05;
    this.melodyIdx = 0;
    this.bassIdx = 0;
    this.nextMelodyTime = now;
    this.nextBassTime = now;

    this.scheduler();
    this.timerId = window.setInterval(() => this.scheduler(), 50);
  }

  public stop(): void {
    this.isPlaying = false;
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    if (this.ctx && this.ctx.state === 'running') {
      void this.ctx.suspend();
    }
  }

  public toggle(): boolean {
    if (this.isPlaying) {
      this.stop();
    } else {
      this.start();
    }
    return this.isPlaying;
  }

  public dispose(): void {
    this.stop();
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
      this.masterGain = null;
    }
  }

  private scheduler(): void {
    if (!this.ctx || !this.masterGain || !this.isPlaying) return;
    const lookahead = 0.25;
    const now = this.ctx.currentTime;

    while (this.nextMelodyTime < now + lookahead) {
      const note = MELODY[this.melodyIdx];
      const dur = note.beats * this.stepSec;
      if (note.freq > 0) {
        this.playTone(note.freq, this.nextMelodyTime, dur * 0.85, 'square', 0.45);
      }
      this.nextMelodyTime += dur;
      this.melodyIdx = (this.melodyIdx + 1) % MELODY.length;
    }

    while (this.nextBassTime < now + lookahead) {
      const note = BASS[this.bassIdx];
      const dur = note.beats * this.stepSec;
      if (note.freq > 0) {
        this.playTone(note.freq, this.nextBassTime, dur * 0.8, 'triangle', 0.65);
      }
      this.nextBassTime += dur;
      this.bassIdx = (this.bassIdx + 1) % BASS.length;
    }
  }

  private playTone(
    freq: number,
    startTime: number,
    duration: number,
    type: OscillatorType,
    volume: number
  ): void {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(volume, startTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.02);
  }
}
