import type { PowerSound } from "../game/types";

let ctx: AudioContext | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
let step = 0;
let gain: GainNode | null = null;
let kind: "puzzle" | "race" | null = null;
// 20% mais lenta, depois mais 15%: 0,8 x 0,85 = 68% do ritmo original.
const MUSIC_SPEED = 0.68;
const MUSIC_VOLUME = 0.7;
export function vibrate(pattern: number | number[] = 35) {
  try {
    if ("vibrate" in navigator) navigator.vibrate(pattern);
  } catch {}
}
function aCtx() {
  if (!ctx)
    try {
      ctx = new AudioContext();
    } catch {
      return null;
    }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}
export function tone(
  f: number,
  d: number,
  t: OscillatorType = "sine",
  v = 0.16,
) {
  const c = aCtx();
  if (!c) return;
  try {
    const o = c.createOscillator(),
      g = c.createGain();
    o.connect(g);
    g.connect(c.destination);
    o.type = t;
    o.frequency.value = f;
    g.gain.setValueAtTime(v, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + d);
    o.start();
    o.stop(c.currentTime + d + 0.01);
  } catch {}
}
function musicTone(f: number, d: number, t: OscillatorType, v: number) {
  tone(f, d, t, v * MUSIC_VOLUME);
}
export function startRaceMusic(intensity = 0) {
  const c = aCtx();
  if (!c) return;
  if (timer && kind === "race") return;
  if (timer) clearInterval(timer);
  if (!gain) {
    gain = c.createGain();
    gain.connect(c.destination);
  }
  gain.gain.value = 0.032 + intensity * 0.014;
  kind = "race";
  const melody = [
    110, 110, 165, 110, 196, 165, 110, 247, 110, 110, 147, 110, 220, 196, 165,
    294, 110, 165, 196, 247, 196, 165, 147, 330,
  ];
  const play = () => {
    if (!gain) return;
    const n = melody[step++ % melody.length];
    if (n) {
      musicTone(n, 0.18, "sawtooth", 0.08 + intensity * 0.025);
      musicTone(n * 2, 0.1, "square", 0.025);
    }
  };
  play();
  timer = setInterval(play, 230 / MUSIC_SPEED);
}
export function stopRaceMusic() {
  if (timer) clearInterval(timer);
  timer = null;
  step = 0;
  kind = null;
  gain = null;
}
export function startPuzzleMusic() {
  const c = aCtx();
  if (!c || timer) return;
  if (!gain) {
    gain = c.createGain();
    gain.gain.value = 0.022;
    gain.connect(c.destination);
  }
  kind = "puzzle";
  // Loop espacial em 32 passos: baixo pulsante, arpejo e melodia crescente.
  const roots = [220, 196, 174, 196, 220, 247, 196, 165];
  const melody = [
    659, 784, 880, 1047, 880, 784, 659, 587, 659, 880, 988, 1175, 988, 880, 784,
    659, 784, 988, 1175, 1319, 1175, 988, 880, 784, 880, 1047, 1319, 1568, 1319,
    1175, 988, 880,
  ];
  const play = () => {
    const index = step++ % melody.length;
    const root = roots[Math.floor(index / 4) % roots.length];
    const note = melody[index];
    musicTone(root, 0.25, "triangle", 0.075);
    musicTone(root * 2, 0.12, "sine", 0.035);
    musicTone(note, 0.16, "sawtooth", 0.045);
    if (index % 2 === 0) musicTone(note * 1.5, 0.08, "square", 0.018);
  };
  play();
  timer = setInterval(play, 190 / MUSIC_SPEED);
}
export const SFX = {
  scoreCount: (durationMs: number) => {
    const c = aCtx();
    if (!c) return () => {};
    const sources: OscillatorNode[] = [];
    const output = c.createGain();
    output.gain.value = 0.8;
    output.connect(c.destination);
    const start = c.currentTime;
    const duration = durationMs / 1000;
    const bell = (offset: number, frequency: number, length: number, volume: number) => {
      const oscillator = c.createOscillator();
      const envelope = c.createGain();
      const at = start + offset;
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, at);
      envelope.gain.setValueAtTime(0, at);
      envelope.gain.linearRampToValueAtTime(volume, at + 0.004);
      envelope.gain.exponentialRampToValueAtTime(0.001, at + length);
      oscillator.connect(envelope); envelope.connect(output);
      oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect(); };
      oscillator.start(at); oscillator.stop(at + length + 0.01);
      sources.push(oscillator);
    };
    // Tiques rápidos que se espaçam na chegada, com notas cada vez mais agudas.
    for (let i = 0; i < 32; i++) {
      const fraction = i / 32;
      bell(duration * fraction ** 1.7, 660 + fraction * 1000, 0.055, 0.085);
    }
    // “Priimmm”: acorde maior luminoso no instante do valor final.
    [1047, 1319, 1568, 2093].forEach((frequency, i) => bell(duration + i * 0.035, frequency, 0.95, i === 3 ? 0.065 : 0.11));
    return () => {
      sources.forEach(source => { try { source.stop(); } catch {} });
      output.disconnect();
    };
  },
  powerExplosions: (events: PowerSound[]) => {
    if (!events.length) return () => {};
    const c = aCtx();
    if (!c) return () => {};
    const sources: AudioScheduledSourceNode[] = [];
    const now = c.currentTime;
    const mix = c.createGain();
    mix.gain.value = 1 / Math.sqrt(Math.max(1, events.length));
    mix.connect(c.destination);
    function play(offset: number, duration: number, frequency: number, end: number, volume: number, noise = false, type: OscillatorType = "sine") {
      const start = now + offset;
      const envelope = c!.createGain();
      const filter = c!.createBiquadFilter();
      filter.type = noise ? "bandpass" : "lowpass";
      filter.frequency.value = noise ? frequency : 7000;
      filter.Q.value = 0.7;
      let source: AudioBufferSourceNode | OscillatorNode;
      if (noise) {
        const buffer = c!.createBuffer(1, Math.ceil(c!.sampleRate * duration), c!.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
        const burst = c!.createBufferSource();
        burst.buffer = buffer;
        source = burst;
      } else {
        const oscillator = c!.createOscillator();
        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, start);
        oscillator.frequency.exponentialRampToValueAtTime(end, start + duration);
        source = oscillator;
      }
      envelope.gain.setValueAtTime(0, start);
      envelope.gain.linearRampToValueAtTime(volume, start + 0.006);
      envelope.gain.exponentialRampToValueAtTime(0.001, start + duration);
      source.connect(filter); filter.connect(envelope); envelope.connect(mix);
      source.onended = () => { source.disconnect(); filter.disconnect(); envelope.disconnect(); };
      source.start(start); source.stop(start + duration + 0.01);
      sources.push(source);
    }
    for (const event of events) {
      const t = event.start / 1000;
      switch (event.kind) {
        case "freeze":
          // Cristais se formando, seguidos de gelo quebrando após a pausa visual.
          [1760, 2349, 3136].forEach((f, i) => play(t + i * 0.09, 0.28, f, f * 1.12, 0.09));
          play(t + 0.75, 0.25, 4500, 4500, 0.28, true);
          play(t + 0.75, 0.2, 1568, 392, 0.12);
          break;
        case "fire":
          for (let i = 0; i < event.steps; i++) {
            play(t + i * 0.065, 0.12, 900 + i * 80, 900, 0.18, true);
            play(t + i * 0.065, 0.09, 220 + i * 25, 90, 0.055, false, "triangle");
          }
          break;
        case "blast":
          play(t, 0.38, 150, 38, 0.26);
          play(t, 0.3, 650, 650, 0.32, true);
          break;
        case "cross":
          for (let i = 0; i <= 4; i++) {
            play(t + i * 0.065, 0.18, 392 * 2 ** (i / 4), 196, 0.11, false, "triangle");
          }
          break;
        case "hunter":
          [659, 988, 1319].forEach((f, i) => play(t + i * 0.13, 0.14, f, f * 1.04, 0.11));
          play(t + 0.45, 0.32, 2093, 523, 0.16);
          play(t + 0.45, 0.3, 1319, 659, 0.09, false, "triangle");
          break;
      }
    }
    // Cancela também os sons futuros de uma cadeia quando a partida sai dessa fase.
    return () => {
      for (const source of sources) { try { source.stop(); } catch {} }
      mix.disconnect();
    };
  },
  init: () => tone(1, 0.001, "sine", 0.001),
  drop: () => tone(440, 0.05, "triangle", 0.12),
  wrong: () => {
    tone(140, 0.22, "sawtooth", 0.13);
    tone(110, 0.22, "square", 0.07);
  },
  positive: () => {
    tone(660, 0.1, "sine", 0.18);
    setTimeout(() => tone(880, 0.14, "sine", 0.2), 90);
  },
  gearMagic: () => {
    const c = aCtx();
    if (!c) return;
    // Sininhos em acorde maior: “pi-li-plim... plim”, com cauda suave.
    const notes = [[784, 0, 0.24], [1047, 0.09, 0.28], [1319, 0.18, 0.4], [1568, 0.36, 0.65], [1047, 0.62, 0.85], [1319, 0.62, 0.85], [2093, 0.76, 0.9]];
    const now = c.currentTime;
    for (const [frequency, offset, duration] of notes) {
      for (const [harmonic, volume] of [[1, 0.16], [2, 0.035]]) {
        const oscillator = c.createOscillator();
        const envelope = c.createGain();
        const start = now + offset;
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(frequency * harmonic, start);
        envelope.gain.setValueAtTime(0, start);
        envelope.gain.linearRampToValueAtTime(volume, start + 0.008);
        envelope.gain.exponentialRampToValueAtTime(0.001, start + duration);
        oscillator.connect(envelope);
        envelope.connect(c.destination);
        oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect(); };
        oscillator.start(start);
        oscillator.stop(start + duration + 0.02);
      }
    }
  },
  risingWall: () => {
    tone(190, 0.12, "square", 0.14);
    setTimeout(() => tone(250, 0.12, "square", 0.16), 110);
    setTimeout(() => {
      tone(105, 0.7, "sawtooth", 0.22);
      tone(158, 0.55, "triangle", 0.1);
    }, 220);
  },
  combo: () =>
    [523, 659, 784, 1047].forEach((f, i) =>
      setTimeout(() => tone(f, 0.18, "sine", 0.22), i * 65),
    ),
  cascade: () =>
    [523, 587, 659, 784, 1047, 1319].forEach((f, i) =>
      setTimeout(() => tone(f, 0.15, "sine", 0.2), i * 55),
    ),
  win: () =>
    [523, 659, 784, 880, 1047, 1319, 1568].forEach((f, i) =>
      setTimeout(() => tone(f, 0.3, "sine", 0.22), i * 95),
    ),
  gameOver: () => {
    tone(180, 0.18, "square", 0.24);
    setTimeout(() => tone(145, 0.2, "sawtooth", 0.22), 220);
    setTimeout(() => {
      tone(82, 0.95, "sawtooth", 0.3);
      tone(164, 0.75, "square", 0.12);
    }, 470);
  },
  lowTimer: () => tone(300, 0.12, "triangle", 0.1),
  lock: () => tone(160, 0.35, "sawtooth", 0.18),
  collision: () => {
    tone(95, 0.28, "sawtooth", 0.28);
    tone(180, 0.16, "square", 0.18);
    tone(720, 0.08, "triangle", 0.12);
  },
  shoot: () => {
    tone(880, 0.06, "square", 0.16);
    tone(1320, 0.09, "sawtooth", 0.08);
  },
  hit: () => {
    tone(180, 0.12, "square", 0.2);
    tone(620, 0.1, "triangle", 0.16);
  },
};
