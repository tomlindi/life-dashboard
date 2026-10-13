// Kurze Töne und Vibration, z. B. wenn ein Timer abgelaufen ist (Gym-Pause, Fokus-Timer).

/** Kurzer Piepton über die Web-Audio-Schnittstelle (ohne Sound-Datei). */
export function piep() {
  try {
    const ctx = new AudioContext()
    for (const [verzoegerung, frequenz] of [[0, 880], [0.25, 880], [0.5, 1320]]) {
      const ton = ctx.createOscillator()
      const lautstaerke = ctx.createGain()
      ton.frequency.value = frequenz
      lautstaerke.gain.setValueAtTime(0.25, ctx.currentTime + verzoegerung)
      lautstaerke.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + verzoegerung + 0.2)
      ton.connect(lautstaerke).connect(ctx.destination)
      ton.start(ctx.currentTime + verzoegerung)
      ton.stop(ctx.currentTime + verzoegerung + 0.2)
    }
  } catch {
    // Ton nicht möglich (z. B. Stummschaltung) – dann eben nur die Anzeige
  }
}

/** Kurz vibrieren (nur wo das Gerät es unterstützt; das iPhone macht bei Web-Apps meist nichts). */
export function vibriere() {
  try {
    navigator.vibrate?.([200, 100, 200])
  } catch {
    // nicht unterstützt
  }
}
