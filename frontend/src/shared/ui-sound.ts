let audioContext: AudioContext | null = null;

type SoundName = "send" | "success" | "error";

function getAudioContext() {
  if (audioContext) return audioContext;
  const AudioContextConstructor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextConstructor) return null;
  audioContext = new AudioContextConstructor();
  return audioContext;
}

export function playUiSound(name: SoundName, enabled: boolean) {
  if (!enabled || typeof window === "undefined") return;
  const context = getAudioContext();
  if (!context) return;
  void context.resume();

  const patterns: Record<SoundName, Array<{ frequency: number; delay: number; duration: number; volume: number }>> = {
    send: [{ frequency: 520, delay: 0, duration: 0.07, volume: 0.025 }],
    success: [
      { frequency: 520, delay: 0, duration: 0.08, volume: 0.022 },
      { frequency: 720, delay: 0.07, duration: 0.13, volume: 0.024 },
    ],
    error: [{ frequency: 220, delay: 0, duration: 0.13, volume: 0.018 }],
  };

  const start = context.currentTime;
  patterns[name].forEach(({ frequency, delay, duration, volume }) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, start + delay);
    gain.gain.setValueAtTime(0.0001, start + delay);
    gain.gain.exponentialRampToValueAtTime(volume, start + delay + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + delay + duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(start + delay);
    oscillator.stop(start + delay + duration + 0.02);
  });
}
