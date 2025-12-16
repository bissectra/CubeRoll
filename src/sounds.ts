let audioContext: AudioContext | null = null;

const createContext = () => {
  if (audioContext) {
    return audioContext;
  }
  if (typeof window === "undefined") {
    return null;
  }
  const ctx =
    new (window.AudioContext || (window as any).webkitAudioContext)();
  audioContext = ctx;
  return ctx;
};

const ensureContext = () => {
  const ctx = createContext();
  if (!ctx) {
    return null;
  }
  if (ctx.state === "suspended") {
    void ctx.resume();
  }
  return ctx;
};

export const unlockAudioContext = () => {
  ensureContext();
};

export const setupAudioUnlock = () => {
  if (typeof window === "undefined") {
    return;
  }
  const unlockHandler = () => {
    unlockAudioContext();
  };
  window.addEventListener("touchstart", unlockHandler, {
    once: true,
    passive: true,
  });
  window.addEventListener("mousedown", unlockHandler, { once: true });
  window.addEventListener("pointerdown", unlockHandler, { once: true });
};

const playTone = (
  frequency: number,
  duration = 0.1,
  volume = 0.15,
  type: OscillatorType = "sine"
) => {
  const ctx = ensureContext();
  if (!ctx) {
    return;
  }

  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  gain.gain.value = 0;
  oscillator.connect(gain);
  gain.connect(ctx.destination);

  const start = ctx.currentTime;
  const stop = start + duration;
  gain.gain.linearRampToValueAtTime(volume, start + 0.01);
  gain.gain.linearRampToValueAtTime(0, stop);
  oscillator.start(start);
  oscillator.stop(stop);
};

export const playMoveSound = () => playTone(520, 0.12, 0.18, "triangle");
export const playBlockedSound = () => playTone(180, 0.2, 0.2, "sawtooth");
