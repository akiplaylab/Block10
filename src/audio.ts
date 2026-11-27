const notes = {
  place: [523.25, 659.25],
  incorrect: [440, 329.63],
  ten: [523.25, 659.25, 783.99, 1046.5],
};

let context: AudioContext | undefined;
let volume: GainNode | undefined;

export function enableSound(enabled: boolean) {
  if (!enabled) {
    if (volume) volume.gain.value = 0;
    return;
  }

  try {
    if (!context) {
      const SafariAudioContext = (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      const Audio = window.AudioContext ?? SafariAudioContext;
      if (!Audio) return;
      context = new Audio();
      volume = context.createGain();
      volume.connect(context.destination);
    }
    if (volume) volume.gain.value = 0.24;
    if (context.state !== 'running') void context.resume().catch(() => {});
  } catch {
    return;
  }
}

export function playSound(name: keyof typeof notes) {
  if (!context || !volume || context.state !== 'running' || volume.gain.value === 0) return;

  const audio = context;
  const output = volume;
  const spacing = name === 'place' ? 0.032 : name === 'incorrect' ? 0.08 : 0.06;
  const peak = name === 'incorrect' ? 0.24 : 0.45;
  const startTime = audio.currentTime;
  notes[name].forEach((frequency, index) => {
    const start = startTime + index * spacing;
    const tone = audio.createOscillator();
    const envelope = audio.createGain();
    tone.frequency.value = frequency;
    envelope.gain.setValueAtTime(0.001, start);
    envelope.gain.exponentialRampToValueAtTime(peak, start + 0.012);
    envelope.gain.exponentialRampToValueAtTime(0.001, start + 0.14);
    tone.connect(envelope);
    envelope.connect(output);
    tone.start(start);
    tone.stop(start + 0.15);
    tone.onended = () => {
      tone.disconnect();
      envelope.disconnect();
    };
  });
}
