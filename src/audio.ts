export class MeadowAudio {
  enabled = false;
  private context: AudioContext | null = null;
  async unlock() {
    if (!this.enabled) return;
    this.context ??= new AudioContext();
    if (this.context.state === "suspended") await this.context.resume();
  }
  play(type: "pick" | "match" | "win" | "tool" | "fail") {
    if (!this.enabled) return;
    void this.unlock()
      .then(() => {
        const context = this.context;
        if (!context) return;
        const notes =
          type === "win"
            ? [523.25, 659.25, 783.99, 1046.5]
            : type === "match"
              ? [659.25, 783.99, 987.77]
              : type === "fail"
                ? [293.66, 261.63]
                : type === "tool"
                  ? [440, 659.25]
                  : [392 + Math.random() * 65];
        notes.forEach((frequency, i) => {
          const start = context.currentTime + i * 0.075;
          const oscillator = context.createOscillator();
          const gain = context.createGain();
          oscillator.type = "sine";
          oscillator.frequency.value = frequency;
          gain.gain.setValueAtTime(0, start);
          gain.gain.linearRampToValueAtTime(0.065, start + 0.008);
          gain.gain.exponentialRampToValueAtTime(0.001, start + 0.28);
          oscillator.connect(gain);
          gain.connect(context.destination);
          oscillator.start(start);
          oscillator.stop(start + 0.3);
        });
      })
      .catch(() => {
        /* Audio is optional when a browser denies playback. */
      });
  }
}
