type Theme = "day" | "cellar";

const DAY = [392, 392, 349, 330, 294, 330, 349, 392, 440, 392, 349, 330, 294, 262, 294, 330];
const DAY_BASS = [196, 147, 175, 131];
const CELLAR = [220, 196, 174, 196, 165, 146, 174, 196, 220, 247, 220, 196, 174, 165, 146, 174];
const CELLAR_BASS = [110, 87, 98, 82];

export class AudioBus {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  muted = false;
  private musicOn = false;
  private theme: Theme = "day";
  private step = 0;
  private nextAt = 0;
  hurry = false;
  private yellSrc: AudioBufferSourceNode | null = null;
  private yellBytes: Promise<ArrayBuffer> | null = null;
  private yellDecode: Promise<void> | null = null;
  ready = false;
  failed = false;
  lastVoiceAt = -1;
  voiceCount = 0;

  /** Fetch on the title screen; decoding never happens inside the hit handler. */
  preloadCurse() {
    if (!this.yellBytes) {
      this.yellBytes = fetch("/damage-voice.wav", { signal: AbortSignal.timeout(8000) }).then(
        (r) => {
          if (!r.ok) throw new Error("Damage sound unavailable");
          return r.arrayBuffer();
        },
      );
      void this.yellBytes.catch(() => {
        this.failed = true;
      });
    }
    if (this.ctx && !this.yellDecode) {
      const ctx = this.ctx;
      this.yellDecode = this.yellBytes
        .then((b) => ctx.decodeAudioData(b.slice(0)))
        .then((buffer) => {
          this.yellBuf = buffer;
          this.ready = true;
        })
        .catch(() => {
          this.failed = true;
        });
    }
  }

  unlock() {
    try {
      const Ctor =
        window.AudioContext ||
        (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) {
        this.failed = true;
        return;
      }
      if (!this.ctx) {
        this.ctx = new Ctor({ latencyHint: "interactive" });
        this.master = this.ctx.createGain();
        this.musicGain = this.ctx.createGain();
        this.sfxGain = this.ctx.createGain();
        this.musicGain.gain.value = 0.07;
        this.sfxGain.gain.value = 0.14;
        this.musicGain.connect(this.master);
        this.sfxGain.connect(this.master);
        this.master.connect(this.ctx.destination);
      }
      if (this.ctx.state === "suspended") void this.ctx.resume();
      this.preloadCurse();
    } catch {
      this.failed = true;
    }
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    if (muted) this.stopVoice();
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(muted ? 0 : 1, this.ctx.currentTime, 0.03);
    }
  }

  startMusic(theme: Theme) {
    this.unlock();
    this.preloadCurse();
    this.theme = theme;
    this.musicOn = true;
    this.step = 0;
    this.nextAt = (this.ctx?.currentTime ?? 0) + 0.05;
  }

  stopMusic() {
    this.musicOn = false;
  }

  stopVoice() {
    if (this.yellSrc) {
      this.yellSrc.onended = null;
      try {
        this.yellSrc.stop();
      } catch {
        /* already ended */
      }
      this.yellSrc.disconnect();
      this.yellSrc = null;
    }
  }

  destroy() {
    this.stopVoice();
    if (this.ctx) void this.ctx.close();
  }

  whoosh() {
    this.noise(0.11, 0.16, 1000);
  }
  cloth() {
    this.noise(0.2, 0.045, 2200);
  }
  thud() {
    this.noise(0.08, 0.2, 200);
    this.blip(90, 0.12, "sine", 0.7, 38);
  }
  fizz() {
    this.noise(0.14, 0.1, 3600);
  }
  splat() {
    this.noise(0.1, 0.16, 600);
    this.blip(150, 0.08, "sine", 0.3, 50);
  }

  private noise(duration: number, gain: number, cutoff: number) {
    if (!this.ctx || !this.sfxGain || this.muted) return;
    const ctx = this.ctx;
    const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * duration), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++)
      data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) ** 2;
    const source = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const volume = ctx.createGain();
    filter.type = "lowpass";
    filter.frequency.value = cutoff;
    volume.gain.value = gain;
    source.buffer = buffer;
    source.connect(filter);
    filter.connect(volume);
    volume.connect(this.sfxGain);
    source.start();
    source.onended = () => {
      source.disconnect();
      filter.disconnect();
      volume.disconnect();
    };
  }

  tick() {
    if (!this.ctx || !this.musicGain || !this.musicOn || this.muted) return;
    const beat = (this.theme === "cellar" ? 0.21 : 0.17) * (this.hurry ? 0.78 : 1);
    const mel = this.theme === "cellar" ? CELLAR : DAY;
    const bass = this.theme === "cellar" ? CELLAR_BASS : DAY_BASS;
    const now = this.ctx.currentTime;
    while (this.nextAt < now + 0.28) {
      const f = mel[this.step % mel.length];
      this.tone(f, this.nextAt, beat * 0.86, "square", 0.1, this.musicGain);
      if (this.step % 2 === 0) {
        const b = bass[(this.step / 2) % bass.length];
        this.tone(b, this.nextAt, beat * 1.7, "triangle", 0.09, this.musicGain);
      }
      this.nextAt += beat;
      this.step++;
    }
  }

  jump() {
    this.blip(620, 0.09, "square", 0.16, 380);
  }
  coin() {
    this.blip(988, 0.06, "square", 0.14);
    this.blip(1312, 0.08, "square", 0.12, undefined, 0.05);
  }
  stomp() {
    this.blip(180, 0.07, "square", 0.16, 90);
  }
  bump() {
    this.blip(160, 0.05, "square", 0.12);
  }
  smash() {
    this.blip(110, 0.08, "sawtooth", 0.1, 60);
  }
  kick() {
    this.blip(240, 0.07, "square", 0.14, 420);
  }
  fire() {
    this.blip(740, 0.07, "square", 0.1, 480);
  }
  snot() {
    this.blip(210, 0.09, "sawtooth", 0.08, 90);
    this.blip(140, 0.06, "square", 0.06, 70, 0.04);
  }
  slam() {
    this.blip(90, 0.16, "sawtooth", 0.16, 40);
    this.blip(180, 0.1, "square", 0.1, 70, 0.05);
  }
  power() {
    const t0 = this.ctx?.currentTime ?? 0;
    [523, 659, 784, 1046].forEach((f, i) =>
      this.blip(f, 0.1, "square", 0.12, undefined, i * 0.07, t0),
    );
  }
  oneUp() {
    [523, 659, 784, 1046, 784, 1046].forEach((f, i) =>
      this.blip(f, 0.09, "square", 0.12, undefined, i * 0.06),
    );
  }
  die() {
    [494, 392, 330, 262, 196].forEach((f, i) =>
      this.blip(f, 0.16, "square", 0.14, undefined, i * 0.1),
    );
  }
  clear() {
    [392, 494, 587, 784].forEach((f, i) => this.blip(f, 0.14, "square", 0.13, undefined, i * 0.09));
  }
  private yellBuf: AudioBuffer | null = null;

  curse() {
    if (this.muted) return;
    this.stopVoice();
    if (this.yellBuf && this.ctx && this.master) {
      const at = this.ctx.currentTime;
      const src = this.ctx.createBufferSource();
      src.buffer = this.yellBuf;
      src.connect(this.master);
      this.yellSrc = src;
      this.lastVoiceAt = at;
      this.voiceCount++;
      const music = this.musicGain?.gain;
      music?.cancelScheduledValues(at);
      music?.setValueAtTime(0.025, at);
      music?.setTargetAtTime(0.07, at + this.yellBuf.duration, 0.12);
      src.onended = () => {
        src.disconnect();
        if (this.yellSrc === src) this.yellSrc = null;
      };
      src.start(at);
      return;
    }
    this.thud();
  }

  tickSfx() {
    this.blip(880, 0.03, "square", 0.08);
  }

  private blip(
    freq: number,
    dur: number,
    type: OscillatorType,
    gain: number,
    slideTo?: number,
    delay = 0,
    from?: number,
  ) {
    if (!this.ctx || !this.sfxGain || this.muted) return;
    const when = (from ?? this.ctx.currentTime) + delay;
    this.tone(freq, when, dur, type, gain, this.sfxGain, slideTo);
  }

  private tone(
    freq: number,
    when: number,
    dur: number,
    type: OscillatorType,
    gain: number,
    bus: GainNode,
    slideTo?: number,
  ) {
    if (!this.ctx) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, when);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(40, slideTo), when + dur);
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(Math.max(0.001, gain), when + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    o.connect(g);
    g.connect(bus);
    o.start(when);
    o.stop(when + dur + 0.02);
    o.onended = () => {
      o.disconnect();
      g.disconnect();
    };
  }
}
