export function speechAvailable(): boolean {
  return (
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    typeof window.SpeechSynthesisUtterance === 'function'
  );
}

export function speak(text: string): boolean {
  if (!speechAvailable() || !text.trim()) return false;
  try {
    window.speechSynthesis.cancel();
    const utterance = new window.SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    window.speechSynthesis.speak(utterance);
    return true;
  } catch {
    return false;
  }
}

export function stopSpeaking(): void {
  if (!speechAvailable()) return;
  try {
    window.speechSynthesis.cancel();
  } catch {
    /* nothing to cancel */
  }
}
