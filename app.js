// app.js
// Demo TTS + SpeechRecognition + simple scoring (cải tiến nhỏ)

// Tạo sau khi DOM sẵn sàng để chắc chắn các element tồn tại
document.addEventListener('DOMContentLoaded', () => {
  const synth = window.speechSynthesis;
  const voiceSelect = document.getElementById('voiceSelect');
  const speakBtn = document.getElementById('speakBtn');
  const textEl = document.getElementById('text');
  const preset = document.getElementById('preset');

  const transcriptEl = document.getElementById('transcript');
  const scoreEl = document.getElementById('score');
  const notesEl = document.getElementById('notes');

  // Populate voices safely and optionally persist selection
  function populateVoices() {
    const voices = synth.getVoices() || [];
    voiceSelect.innerHTML = '';
    voices.forEach((v, i) => {
      const opt = document.createElement('option');
      opt.value = i;
      opt.textContent = `${v.name} — ${v.lang}${v.default ? ' (default)' : ''}`;
      voiceSelect.appendChild(opt);
    });

    // Restore saved selection if possible
    const saved = localStorage.getItem('voiceIndex');
    if (saved !== null && voices[parseInt(saved, 10)]) {
      voiceSelect.value = saved;
    } else {
      // if no saved, try to select default voice
      const defIndex = voices.findIndex(v => v.default);
      if (defIndex >= 0) voiceSelect.value = defIndex;
    }
  }

  populateVoices();
  if (typeof speechSynthesis !== 'undefined' && 'onvoiceschanged' in speechSynthesis) {
    speechSynthesis.onvoiceschanged = populateVoices;
  }

  speakBtn.addEventListener('click', () => {
    const text = textEl.value.trim();
    if (!text) return;
    const utter = new SpeechSynthesisUtterance(text);
    const voices = synth.getVoices() || [];

    const idx = parseInt(voiceSelect.value, 10);
    if (!Number.isNaN(idx) && voices[idx]) utter.voice = voices[idx];
    // Optional controls (could be hooked to UI sliders)
    utter.rate = 0.95;
    utter.pitch = 1;
    synth.cancel();
    synth.speak(utter);
    // persist chosen voice
    if (!Number.isNaN(idx)) localStorage.setItem('voiceIndex', idx);
  });

  // preset selection updates textarea
  preset.addEventListener('change', () => {
    textEl.value = preset.value;
  });

  // Simple Levenshtein distance for similarity scoring
  function levenshtein(a, b) {
    a = a || '';
    b = b || '';
    const m = a.length, n = b.length;
    const dp = Array.from({length: m+1}, () => new Array(n+1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const cost = a[i-1] === b[j-1] ? 0 : 1;
        dp[i][j] = Math.min(dp[i-1][j] + 1, dp[i][j-1] + 1, dp[i-1][j-1] + cost);
      }
    }
    return dp[m][n];
  }
  function similarityScore(ref, hyp) {
    const normalize = s => (s || '').toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
    const r = normalize(ref);
    const h = normalize(hyp);
    if (r.length === 0 && h.length === 0) return 100;
    const dist = levenshtein(r, h);
    const maxLen = Math.max(r.length, h.length);
    const score = Math.max(0, Math.round((1 - dist / (maxLen || 1)) * 100));
    return score;
  }
  // SpeechRecognition (browser-specific)
  const startRecBtn = document.getElementById('startRecBtn');
  const stopRecBtn = document.getElementById('stopRecBtn');
  let recognition = null;
  if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SR();
    recognition.lang = 'en-US'; // có thể expose UI để đổi en-GB/en-US...
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
