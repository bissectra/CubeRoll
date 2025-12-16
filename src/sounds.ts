const AUDIO_CONTEXT =
  typeof window !== "undefined"
    ? new (window.AudioContext || (window as any).webkitAudioContext)()
    : null;

const ensureContext = () => {
  if (!AUDIO_CONTEXT) {
    return null;
  }
  if (AUDIO_CONTEXT.state === "suspended") {
    void AUDIO_CONTEXT.resume();
  }
  return AUDIO_CONTEXT;
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
