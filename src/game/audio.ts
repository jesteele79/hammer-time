import {
  TAUNT_FILES,
  TAUNT_CHANCE,
  TAUNT_GAP_SECONDS,
  TauntRotation,
  type TauntId,
  type TauntTarget,
} from "./taunts";

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
  tauntCount = 0;
  lastTaunt: TauntId | null = null;
  private tauntBytes = new Map<TauntId, Promise<ArrayBuffer | null>>();
  private tauntBuffers = new Map<TauntId, AudioBuffer>();
  private tauntDecodes = new Set<TauntId>();
  private nextTauntAt = 0;
  private taunts: TauntRotation;
  private destroyed = false;

  constructor(private random: () => number = Math.random) {
    this.taunts = new TauntRotation(random);
  }

  get tauntsReady() {
    return this.tauntBuffers.size === Object.keys(TAUNT_FILES).length;
  }

  /** Optional lines load alongside the damage voice without delaying the start. */
  preloadTaunts() {
    for (const [key, url] of Object.entries(TAUNT_FILES)) {
      const id = key as TauntId;
      if (!this.tauntBytes.has(id)) {
        this.tauntBytes.set(
          id,
          fetch(url, { signal: AbortSignal.timeout(8000) })
            .then((r) => (r.ok ? r.arrayBuffer() : null))
            .catch(() => null),
        );
      }
      if (this.ctx && !this.tauntDecodes.has(id)) {
        const ctx = this.ctx;
        this.tauntDecodes.add(id);
        void this.tauntBytes
          .get(id)!
          .then((bytes) => (bytes && !this.destroyed ? ctx.decodeAudioData(bytes.slice(0)) : null))
          .then((buffer) => {
            if (buffer && !this.destroyed) this.tauntBuffers.set(id, buffer);
          })
          .catch(() => {
            /* An optional missing clip must not break gameplay. */
          });
      }
    }
  }

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
      this.preloadTaunts();
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
    if (this.musicGain && this.ctx) {
      const at = this.ctx.currentTime;
      this.musicGain.gain.cancelScheduledValues(at);
      this.musicGain.gain.setTargetAtTime(0.07, at, 0.08);
    }
  }

  destroy() {
    this.destroyed = true;
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
  /** Mallet on a person: low body thump, a dry wood knock and a little grit. */
  bonk() {
    this.blip(118, 0.16, "sine", 0.75, 42);
    this.blip(660, 0.05, "triangle", 0.32, 300);
    this.noise(0.05, 0.16, 1400, "bandpass");
  }
  sniff() {
    this.noise(0.13, 0.05, 2600, "highpass", 5200);
  }
  honk() {
    this.noise(0.17, 0.2, 2400, "lowpass", 420);
    this.blip(196, 0.13, "sawtooth", 0.1, 78);
  }
  swish() {
    this.noise(0.09, 0.06, 2600, "bandpass", 1500);
  }
  snap() {
    this.noise(0.04, 0.14, 3200, "highpass");
    this.blip(1800, 0.02, "square", 0.05);
  }
  glint() {
    [2093, 3136].forEach((f, i) => this.blip(f, 0.07, "sine", 0.05, undefined, i * 0.06));
  }
  slip() {
    this.blip(920, 0.26, "sine", 0.12, 260);
  }
  /** The ! burst over an attacker: a short rising sting. */
  sting() {
    this.blip(880, 0.08, "square", 0.12, 1320);
    this.blip(1320, 0.06, "square", 0.08, undefined, 0.07);
  }
  /** Cart wheels squealing on marble. */
  squeal() {
    this.noise(0.25, 0.08, 3200, "bandpass", 2400);
    this.blip(2600, 0.22, "sine", 0.05, 1900);
  }
  /** Glasses on the floor. */
  shatter() {
    this.noise(0.18, 0.14, 6000, "highpass", 3000);
    [3136, 4186, 5274].forEach((f, i) => this.blip(f, 0.05, "sine", 0.06, undefined, i * 0.03));
  }
  splash() {
    this.noise(0.14, 0.12, 900, "lowpass");
    this.blip(240, 0.08, "sine", 0.1, 120);
  }
  /** A phone's two notes. */
  chime() {
    [1760, 2217].forEach((f, i) => this.blip(f, 0.09, "sine", 0.08, undefined, i * 0.1));
  }
  /** A flat-top under his shoes. */
  sizzle() {
    this.noise(0.35, 0.09, 5200, "highpass", 2400);
  }
  /** The walk-in's cold breath. */
  frost() {
    this.noise(0.4, 0.05, 2600, "bandpass", 1200);
    this.blip(1320, 0.12, "sine", 0.03, 990);
  }
  /** A swinging door banging open. */
  bang() {
    this.noise(0.1, 0.16, 500, "lowpass");
    this.blip(110, 0.12, "square", 0.08, 70);
  }
  /** A page turning. */
  page() {
    this.noise(0.08, 0.05, 3000, "bandpass", 1500);
  }
  /** A paper plane leaving the hand. */
  paper() {
    this.noise(0.12, 0.08, 1800, "bandpass", 900);
  }
  harrumph() {
    this.noise(0.12, 0.06, 420, "lowpass");
    this.blip(150, 0.09, "sawtooth", 0.05, 120);
    this.blip(118, 0.12, "sawtooth", 0.05, 96, 0.12);
  }
  /** Kettle whistle when the temper boils over. */
  whistle() {
    if (!this.ctx || !this.sfxGain || this.muted) return;
    const ctx = this.ctx,
      at = ctx.currentTime;
    const o = ctx.createOscillator(),
      vib = ctx.createOscillator(),
      depth = ctx.createGain(),
      g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(1480, at);
    o.frequency.linearRampToValueAtTime(1760, at + 0.5);
    vib.frequency.value = 11;
    depth.gain.value = 26;
    vib.connect(depth);
    depth.connect(o.frequency);
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(0.06, at + 0.08);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.62);
    o.connect(g);
    g.connect(this.sfxGain);
    o.start(at);
    vib.start(at);
    o.stop(at + 0.65);
    vib.stop(at + 0.65);
    o.onended = () => {
      o.disconnect();
      vib.disconnect();
      depth.disconnect();
      g.disconnect();
    };
  }
  /** Food going down: a short low crunch and a blip. */
  chomp() {
    this.noise(0.07, 0.18, 700, "lowpass");
    this.blip(180, 0.05, "square", 0.08, 120);
  }
  /** A plate sliding along the tablecloth. */
  slide() {
    this.noise(0.16, 0.05, 1800, "bandpass", 900);
  }
  /** The banquet's service bell. */
  ding() {
    [1568, 2093].forEach((f, i) => this.blip(f, 0.18, "sine", 0.09, undefined, i * 0.05));
  }
  boom() {
    this.blip(72, 0.38, "sine", 0.8, 32);
    this.noise(0.3, 0.22, 380, "lowpass", 120);
    this.blip(180, 0.1, "square", 0.08, 70, 0.03);
  }

  /** Two hands meeting over the banquet table: a bright double clank. */
  clash() {
    [1320, 1760].forEach((f, i) => this.blip(f, 0.07, "square", 0.07, f * 0.8, i * 0.03));
    this.noise(0.05, 0.12, 3000, "highpass");
  }

  private noise(
    duration: number,
    gain: number,
    cutoff: number,
    type: BiquadFilterType = "lowpass",
    sweepTo?: number,
  ) {
    if (!this.ctx || !this.sfxGain || this.muted) return;
    const ctx = this.ctx;
    const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * duration), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++)
      data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) ** 2;
    const source = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const volume = ctx.createGain();
    filter.type = type;
    filter.frequency.value = cutoff;
    if (sweepTo)
      filter.frequency.exponentialRampToValueAtTime(sweepTo, ctx.currentTime + duration);
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

  /** React to an actual contact/encounter; skip busy moments instead of queuing. */
  taunt(target: TauntTarget): TauntId | null {
    if (
      !this.ctx ||
      !this.master ||
      this.muted ||
      this.yellSrc ||
      !this.tauntBuffers.size ||
      this.ctx.currentTime < this.nextTauntAt ||
      this.random() >= TAUNT_CHANCE[target]
    )
      return null;
    const id = this.taunts.next(target);
    const buffer = this.tauntBuffers.get(id);
    if (!buffer) return null;
    const at = this.ctx.currentTime;
    this.playVoice(buffer, at);
    this.nextTauntAt = Math.max(at + TAUNT_GAP_SECONDS, at + buffer.duration + 0.8);
    this.lastTaunt = id;
    this.tauntCount++;
    return id;
  }

  /** One particular recording now, for a scripted line; skipped while another is playing. */
  voice(id: TauntId): boolean {
    if (!this.ctx || !this.master || this.muted || this.yellSrc) return false;
    const buffer = this.tauntBuffers.get(id);
    if (!buffer) return false;
    const at = this.ctx.currentTime;
    this.playVoice(buffer, at);
    this.nextTauntAt = Math.max(at + TAUNT_GAP_SECONDS, at + buffer.duration + 0.8);
    this.lastTaunt = id;
    this.tauntCount++;
    return true;
  }

  curse() {
    if (this.muted) return;
    this.stopVoice();
    if (this.yellBuf && this.ctx && this.master) {
      const at = this.ctx.currentTime;
      this.playVoice(this.yellBuf, at);
      this.nextTauntAt = Math.max(at + TAUNT_GAP_SECONDS, at + this.yellBuf.duration + 0.8);
      this.lastVoiceAt = at;
      this.voiceCount++;
      return;
    }
    this.thud();
  }

  private playVoice(buffer: AudioBuffer, at: number) {
    if (!this.ctx || !this.master) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(this.master);
    this.yellSrc = src;
    const music = this.musicGain?.gain;
    music?.cancelScheduledValues(at);
    music?.setValueAtTime(0.025, at);
    music?.setTargetAtTime(0.07, at + buffer.duration, 0.12);
    src.onended = () => {
      src.disconnect();
      if (this.yellSrc === src) this.yellSrc = null;
    };
    src.start(at);
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
